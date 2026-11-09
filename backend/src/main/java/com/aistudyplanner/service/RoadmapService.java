package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.dto.RoadmapResponse.*;
import com.aistudyplanner.entity.StudentProfile;
import com.aistudyplanner.entity.StudentTopicKnowledge;
import com.aistudyplanner.exception.RoadmapGenerationException;
import com.aistudyplanner.repository.StudentProfileRepository;
import com.aistudyplanner.repository.StudentTopicKnowledgeRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Service
public class RoadmapService {

    private static final Logger log = LoggerFactory.getLogger(RoadmapService.class);

    private final GeminiTestService geminiTestService;
    private final RoadmapValidator roadmapValidator;
    private final ObjectMapper objectMapper;
    private final StudentProfileRepository profileRepository;
    private final StudentTopicKnowledgeRepository topicKnowledgeRepository;

    public RoadmapService(GeminiTestService geminiTestService) {
        this(geminiTestService, new RoadmapValidator(), null, null);
    }

    public RoadmapService(GeminiTestService geminiTestService, RoadmapValidator roadmapValidator) {
        this(geminiTestService, roadmapValidator, null, null);
    }

    @Autowired
    public RoadmapService(
            GeminiTestService geminiTestService,
            RoadmapValidator roadmapValidator,
            @Autowired(required = false) StudentProfileRepository profileRepository,
            @Autowired(required = false) StudentTopicKnowledgeRepository topicKnowledgeRepository) {
        this.geminiTestService = geminiTestService;
        this.roadmapValidator = roadmapValidator != null ? roadmapValidator : new RoadmapValidator();
        this.profileRepository = profileRepository;
        this.topicKnowledgeRepository = topicKnowledgeRepository;
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request) {
        return generateRoadmap(request, null);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request, String userEmail) {
        StudentProfile profile = null;
        List<StudentTopicKnowledge> skills = List.of();

        if (userEmail != null && !userEmail.isBlank()) {
            if (profileRepository != null) {
                profile = profileRepository.findByUserEmail(userEmail).orElse(null);
            }
            if (topicKnowledgeRepository != null) {
                skills = topicKnowledgeRepository.findByStudentEmail(userEmail);
            }
        }

        String basePrompt = buildPrompt(request, profile, skills);
        String currentPrompt = basePrompt;
        RoadmapResponse candidate = null;
        List<String> lastValidationErrors = new ArrayList<>();

        // Up to 2 attempts: initial call + 1 retry if validation fails
        for (int attempt = 1; attempt <= 2; attempt++) {
            String rawResponse;
            try {
                rawResponse = geminiTestService.askGeminiJson(currentPrompt);
            } catch (Exception e) {
                log.error("Gemini API call failed during roadmap generation: {}", e.getMessage());
                throw new RoadmapGenerationException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini service is currently unavailable or encountered an error. Please try again."
                );
            }

            String jsonText = extractJson(rawResponse);
            try {
                candidate = objectMapper.readValue(jsonText, RoadmapResponse.class);
            } catch (Exception e) {
                log.warn("Gemini output could not be parsed as valid JSON (attempt {}/2): {}", attempt, e.getMessage());
                if (attempt == 1) {
                    currentPrompt = basePrompt + "\n\nCRITICAL FIX REQUIRED: Your previous output was not valid JSON or was malformed. You MUST return strictly valid JSON matching the schema.";
                    continue;
                } else {
                    throw new RoadmapGenerationException(
                            HttpStatus.UNPROCESSABLE_ENTITY,
                            "AI generated an unparseable response. Please retry generation."
                    );
                }
            }

            // Populate metadata
            populateResponseMetadata(candidate, request, rawResponse);

            // Validate using RoadmapValidator
            List<String> errors = roadmapValidator.validate(candidate, request);
            if (errors.isEmpty()) {
                // Successful validation!
                return candidate;
            }

            lastValidationErrors = errors;
            log.warn("Roadmap validation failed (attempt {}/2) with {} errors: {}", attempt, errors.size(), errors);

            if (attempt == 1) {
                // Append retry error block to prompt
                StringBuilder retryPrompt = new StringBuilder(basePrompt);
                retryPrompt.append("\n\n[CRITICAL CORRECTIONS REQUIRED]\n");
                retryPrompt.append("The previous roadmap failed validation with the following specific errors. You MUST correct all of them:\n");
                for (String err : errors) {
                    retryPrompt.append("- ").append(err).append("\n");
                }
                retryPrompt.append("Ensure every single constraint above is rigorously satisfied in the returned JSON.\n");
                currentPrompt = retryPrompt.toString();
            }
        }

        // If we reach here, both attempts failed validation
        throw new RoadmapGenerationException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "AI generated a roadmap that failed quality validation: " + String.join("; ", lastValidationErrors)
        );
    }

    public String buildPrompt(RoadmapRequest request) {
        return buildPrompt(request, null, List.of());
    }

    public String buildPrompt(RoadmapRequest request, StudentProfile profile, List<StudentTopicKnowledge> studentSkills) {
        double totalHours = request.getTargetDays() * request.getHoursPerDay();
        int weeks = Math.max(1, (int) Math.ceil(request.getTargetDays() / 7.0));
        int dailyMinutes = (int) Math.round(request.getHoursPerDay() * 60);

        String skillLevelGuidance = switch (request.getSkillLevel()) {
            case BEGINNER -> """
                - Tailor for a BEGINNER:
                  - Start from the ground up, assuming minimal prerequisite knowledge.
                  - Break complex ideas into bite-sized analogies and concrete syntax examples.
                  - Emphasize foundational mental models, prerequisite validation, and confidence-building practical exercises.
                """;
            case INTERMEDIATE -> """
                - Tailor for an INTERMEDIATE learner:
                  - Skip introductory syntax and basics; assume familiar fundamentals.
                  - Focus directly on architecture, design patterns, testing, performance, error-handling, and enterprise-grade integration.
                  - Include realistic full-stack or end-to-end mini-projects.
                """;
            case ADVANCED -> """
                - Tailor for an ADVANCED practitioner:
                  - Fast-track or bypass common patterns; focus on internal mechanisms, high concurrency, distributed systems, deep profiling, and edge-case resiliency.
                  - Real-world production architectures and rigorous benchmark-driven challenges.
                """;
        };

        StringBuilder personalizationDetails = new StringBuilder();
        if (request.getSpecificTopics() != null && !request.getSpecificTopics().isBlank()) {
            personalizationDetails.append("- Focus Areas / Specific Topics requested: ")
                    .append(request.getSpecificTopics().trim()).append("\n");
        }
        if (request.getTargetOutcomes() != null && !request.getTargetOutcomes().isBlank()) {
            personalizationDetails.append("- Desired Target Outcomes: ")
                    .append(request.getTargetOutcomes().trim()).append("\n");
        }
        if (request.getPriorKnowledge() != null && !request.getPriorKnowledge().isBlank()) {
            personalizationDetails.append("- Existing Student Background / Prior Knowledge: ")
                    .append(request.getPriorKnowledge().trim())
                    .append(" (Skip redundant basics already mastered!)\n");
        }

        // Incorporate Student Profile preferences & context
        if (profile != null) {
            personalizationDetails.append("\n[STUDENT LEARNING PROFILE & PREFERENCES]\n");
            if (profile.getCareerGoal() != null && !profile.getCareerGoal().isBlank()) {
                personalizationDetails.append("- Career Goal: ").append(profile.getCareerGoal().trim()).append("\n");
            }
            if (profile.getEducationLevel() != null && !profile.getEducationLevel().isBlank()) {
                personalizationDetails.append("- Academic Background: ").append(profile.getEducationLevel().trim());
                if (profile.getAcademicBackground() != null && !profile.getAcademicBackground().isBlank()) {
                    personalizationDetails.append(" (").append(profile.getAcademicBackground().trim()).append(")");
                }
                personalizationDetails.append("\n");
            }
            if (profile.getExplanationStyle() != null && !profile.getExplanationStyle().isBlank()) {
                personalizationDetails.append("- Preferred Explanation Style: ").append(profile.getExplanationStyle().trim())
                        .append(" (Ensure explanations match this pedagogy)\n");
            }
            if (profile.getPracticeStyle() != null && !profile.getPracticeStyle().isBlank()) {
                personalizationDetails.append("- Preferred Practice Style: ").append(profile.getPracticeStyle().trim())
                        .append(" (Tailor daily exercises to this format)\n");
            }
            if (profile.getLearningMethods() != null && !profile.getLearningMethods().isBlank()) {
                personalizationDetails.append("- Preferred Learning Formats: ").append(profile.getLearningMethods().trim()).append("\n");
            }
            if (profile.getAdditionalContext() != null && !profile.getAdditionalContext().isBlank()) {
                personalizationDetails.append("- Student AI Tutor Notes: ").append(profile.getAdditionalContext().trim()).append("\n");
            }
        }

        // Incorporate Student Topic Knowledge
        if (studentSkills != null && !studentSkills.isEmpty()) {
            List<String> mastered = new ArrayList<>();
            List<String> intermediate = new ArrayList<>();
            List<String> beginner = new ArrayList<>();
            List<String> unlearned = new ArrayList<>();

            for (StudentTopicKnowledge k : studentSkills) {
                switch (k.getKnowledgeLevel()) {
                    case MASTERED -> mastered.add(k.getTopicName());
                    case INTERMEDIATE -> intermediate.add(k.getTopicName());
                    case BEGINNER -> beginner.add(k.getTopicName());
                    case NOT_LEARNED -> unlearned.add(k.getTopicName());
                }
            }

            personalizationDetails.append("\n[KNOWLEDGE-AWARE PEDAGOGICAL CONSTRAINTS]\n");
            if (!mastered.isEmpty()) {
                personalizationDetails.append("- ALREADY MASTERED: ").append(String.join(", ", mastered))
                        .append("\n  * RULE: Strictly exclude basic tutorials on these topics! Only include a rapid verification test or prerequisite checkpoint if essential.\n");
            }
            if (!intermediate.isEmpty()) {
                personalizationDetails.append("- INTERMEDIATE / REVISION NEEDED: ").append(String.join(", ", intermediate))
                        .append("\n  * RULE: Fast-track intro syntax; focus on rigorous practice, edge cases, and realistic problem-solving.\n");
            }
            if (!beginner.isEmpty()) {
                personalizationDetails.append("- BEGINNER / FOUNDATIONS IN PROGRESS: ").append(String.join(", ", beginner))
                        .append("\n  * RULE: Provide structured explanation, scaffolded examples, and guided practice exercises.\n");
            }
            if (!unlearned.isEmpty()) {
                personalizationDetails.append("- UNFAMILIAR / NOT YET LEARNED: ").append(String.join(", ", unlearned))
                        .append("\n  * RULE: Build solid intuition from scratch with clear conceptual breakdown before assigning problems.\n");
            }
        }

        String feasibilityGuidance;
        if (totalHours < 12.0) {
            feasibilityGuidance = String.format(
                "NOTE ON TIME CONSTRAINT: Available time is very tight (%.1f total hours across %d days). " +
                "Do NOT overwhelm the student with 30 broad topics. Strictly prioritize the 3-5 highest-leverage essentials. " +
                "Include a clear, candid 'feasibilityNote' explaining what is achievable within this timeframe and what should be deferred.",
                totalHours, request.getTargetDays()
            );
        } else {
            feasibilityGuidance = String.format(
                "Available study budget is %.1f total hours across %d days (approx %d daily minutes). " +
                "Distribute topics, daily tasks, and exercises comprehensively across this duration.",
                totalHours, request.getTargetDays(), dailyMinutes
            );
        }

        return String.format("""
            You are a world-class curriculum architect and AI tutor.
            Design a comprehensive, realistic, and highly personalized learning roadmap for this student:

            [STUDENT PROFILE]
            - Topic: %s
            - Description / Objective: %s
            - Skill Level: %s
            - Target Duration: %d days (approx %d weeks)
            - Daily Commitment: %.1f hours/day (%d minutes/day)
            - Total Available Study Time: %.1f hours
            %s
            [PEDAGOGICAL STRATEGY]
            %s
            %s

            [JSON SCHEMA REQUIREMENT]
            You MUST return a single, strictly valid JSON object. Do not include markdown code blocks, backticks, or outside text.
            The JSON must conform to the following schema:
            {
              "overview": "2-3 sentences summarizing the curriculum trajectory and key capabilities the student will gain.",
              "feasibilityNote": "Honest assessment of curriculum feasibility within %.1f total hours and guidance on pacing.",
              "totalStudyHours": %.1f,
              "skillLevel": "%s",
              "prerequisites": [
                "Prerequisite knowledge item 1",
                "Prerequisite knowledge item 2"
              ],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Clear Descriptive Title",
                  "durationDays": 7,
                  "topics": ["Core Topic 1", "Core Topic 2", "Core Topic 3"],
                  "subtopics": ["Subtopic 1.1", "Subtopic 1.2", "Subtopic 2.1"],
                  "milestones": ["Verifiable milestone 1", "Verifiable milestone 2"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Actionable task title",
                      "description": "Specific study and practice instruction for this day",
                      "estimatedMinutes": %d,
                      "activityType": "STUDY",
                      "learningObjectives": ["Clear learning objective 1", "Clear learning objective 2"],
                      "subtopics": ["Granular subtopic 1", "Granular subtopic 2", "Granular subtopic 3"],
                      "conceptExplanation": "Short 1-2 sentence core concept summary or key mental model",
                      "practiceTasks": ["Actionable coding or hands-on practice step 1", "Practice step 2"],
                      "quizQuestion": "Quick self-assessment check question on this daily concept"
                    }
                  ],
                  "practicalExercises": [
                    {
                      "title": "Hands-on project or exercise title",
                      "instructions": "Clear step-by-step guidance on what to build or code",
                      "difficulty": "%s" // BEGINNER, INTERMEDIATE, ADVANCED
                    }
                  ],
                  "assessment": {
                    "title": "Phase Assessment Milestone",
                    "type": "PROJECT", // Allowed: QUIZ, PROJECT, CODE_CHALLENGE
                    "description": "What the student needs to solve or demonstrate to complete this phase",
                    "passingCriteria": "Specific checklist to verify mastery"
                  }
                }
              ],
              "learningResources": [
                {
                  "title": "Authoritative Resource Name (e.g., Official Documentation, FreeCodeCamp)",
                  "url": "https://valid-and-actual-resource-url.org",
                  "type": "DOCUMENTATION", // Allowed: DOCUMENTATION, VIDEO, COURSE, BOOK, PRACTICE_PLATFORM
                  "relevance": "Why this specific resource accelerates the learning for this topic",
                  "isVerified": true
                }
              ]
            }

            Ensure all phases combined cover the full %d target days. Provide 4-6 high quality, realistic learning resources with real URLs.
            """,
                request.getTopic(),
                request.getDescription() != null && !request.getDescription().isBlank() ? request.getDescription() : "Mastery and practical application",
                request.getSkillLevel().name(),
                request.getTargetDays(),
                weeks,
                request.getHoursPerDay(),
                dailyMinutes,
                totalHours,
                personalizationDetails,
                skillLevelGuidance,
                feasibilityGuidance,
                totalHours,
                totalHours,
                request.getSkillLevel().name(),
                dailyMinutes,
                request.getSkillLevel().name(),
                request.getTargetDays()
        );
    }

    private void populateResponseMetadata(RoadmapResponse response, RoadmapRequest request, String rawResponse) {
        if (response.getId() == null || response.getId().isBlank()) {
            response.setId("roadmap_" + System.currentTimeMillis());
        }
        response.setTopic(request.getTopic());
        response.setSkillLevel(request.getSkillLevel().name());
        response.setTargetDays(request.getTargetDays());
        response.setHoursPerDay(request.getHoursPerDay());
        response.setRawRoadmap(rawResponse);

        double totalHours = request.getTargetDays() * request.getHoursPerDay();
        if (response.getTotalStudyHours() == null || response.getTotalStudyHours() <= 0) {
            response.setTotalStudyHours(totalHours);
        }

        // Validate learning resources & sanitize URLs
        if (response.getLearningResources() != null && !response.getLearningResources().isEmpty()) {
            for (ResourceItem r : response.getLearningResources()) {
                if (r.getUrl() != null && !r.getUrl().isBlank()) {
                    boolean isValidUrl = isValidHttpUrl(r.getUrl());
                    r.setVerified(isValidUrl);
                } else {
                    r.setUrl("");
                    r.setVerified(false);
                }
            }
        }

        // Ensure legacy resources list is populated
        if (response.getResources() == null || response.getResources().isEmpty()) {
            if (response.getLearningResources() != null && !response.getLearningResources().isEmpty()) {
                List<String> legacyResources = response.getLearningResources().stream()
                        .map(r -> r.getTitle() + (r.getUrl() != null && !r.getUrl().isBlank() ? " (" + r.getUrl() + ")" : ""))
                        .toList();
                response.setResources(legacyResources);
            }
        }
    }

    private boolean isValidHttpUrl(String url) {
        try {
            URI uri = URI.create(url.trim());
            return "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
        } catch (Exception e) {
            return false;
        }
    }

    private String extractJson(String text) {
        if (text == null) return "{}";
        String clean = text.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        clean = clean.trim();
        int firstBrace = clean.indexOf('{');
        int lastBrace = clean.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            return clean.substring(firstBrace, lastBrace + 1);
        }
        return clean;
    }
}
