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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.*;

@Service
public class RoadmapService {

    private static final Logger log = LoggerFactory.getLogger(RoadmapService.class);

    private final GeminiTestService geminiTestService;
    private final RoadmapValidator roadmapValidator;
    private final ObjectMapper objectMapper;
    private final StudentProfileRepository profileRepository;
    private final StudentTopicKnowledgeRepository topicKnowledgeRepository;
    private final int timeoutSeconds;
    public static final Set<String> DEFAULT_ALLOWED_HOSTS = Set.of(
            "docs.python.org", "pytorch.org", "huggingface.co", "ai.google.dev",
            "developer.mozilla.org", "spring.io", "docs.oracle.com", "scikit-learn.org",
            "numpy.org", "pandas.pydata.org", "platform.openai.com", "docs.trychroma.com"
    );

    private final Set<String> allowedHosts;

    public RoadmapService(GeminiTestService geminiTestService) {
        this(geminiTestService, new RoadmapValidator(), null, null, 120, DEFAULT_ALLOWED_HOSTS);
    }

    public RoadmapService(GeminiTestService geminiTestService, RoadmapValidator roadmapValidator) {
        this(geminiTestService, roadmapValidator, null, null, 120, DEFAULT_ALLOWED_HOSTS);
    }

    public RoadmapService(
            GeminiTestService geminiTestService,
            RoadmapValidator roadmapValidator,
            StudentProfileRepository profileRepository,
            StudentTopicKnowledgeRepository topicKnowledgeRepository) {
        this(geminiTestService, roadmapValidator, profileRepository, topicKnowledgeRepository, 120, DEFAULT_ALLOWED_HOSTS);
    }

    @Autowired
    public RoadmapService(
            GeminiTestService geminiTestService,
            RoadmapValidator roadmapValidator,
            @Autowired(required = false) StudentProfileRepository profileRepository,
            @Autowired(required = false) StudentTopicKnowledgeRepository topicKnowledgeRepository,
            @Value("${roadmap.generation.timeout-seconds:120}") int timeoutSeconds,
            @Value("${roadmap.resources.allowed-hosts:docs.python.org,pytorch.org,huggingface.co,ai.google.dev,developer.mozilla.org,spring.io,docs.oracle.com,scikit-learn.org,numpy.org,pandas.pydata.org,platform.openai.com,docs.trychroma.com}") Set<String> allowedHosts) {
        this.geminiTestService = geminiTestService;
        this.roadmapValidator = roadmapValidator != null ? roadmapValidator : new RoadmapValidator();
        this.profileRepository = profileRepository;
        this.topicKnowledgeRepository = topicKnowledgeRepository;
        this.timeoutSeconds = timeoutSeconds > 0 ? timeoutSeconds : 120;
        this.allowedHosts = allowedHosts != null ? allowedHosts : Set.of();
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request) {
        return generateRoadmap(request, null);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request, String userEmail) {
        long startTime = System.currentTimeMillis();
        long deadlineMillis = startTime + (timeoutSeconds * 1000L);

        StudentProfile profile = null;
        List<StudentTopicKnowledge> skills = List.of();

        if (userEmail != null && !userEmail.isBlank()) {
            if (profileRepository != null) {
                profile = profileRepository.findByUserEmail(userEmail).orElse(null);
            }
            if (topicKnowledgeRepository != null) {
                // Strictly filter to topics where rated_by_user == true
                skills = topicKnowledgeRepository.findByStudentEmail(userEmail).stream()
                        .filter(k -> Boolean.TRUE.equals(k.getRatedByUser()))
                        .toList();
            }
        }

        String basePrompt = buildPrompt(request, profile, skills);
        String currentPrompt = basePrompt;
        RoadmapResponse candidate = null;
        List<String> lastValidationErrors = new ArrayList<>();

        for (int attempt = 1; attempt <= 2; attempt++) {
            checkDeadline(deadlineMillis);

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
                    long remainingSeconds = (deadlineMillis - System.currentTimeMillis()) / 1000L;
                    if (remainingSeconds < 40) {
                        throw new RoadmapGenerationException(
                                HttpStatus.BAD_GATEWAY,
                                "Roadmap generation exceeded allowed time budget (" + timeoutSeconds + "s). Please retry."
                        );
                    }
                    currentPrompt = basePrompt + "\n\nCRITICAL FIX REQUIRED: Your previous output was not valid JSON or was malformed. You MUST return strictly valid JSON matching the schema.";
                    continue;
                } else {
                    throw new RoadmapGenerationException(
                            HttpStatus.UNPROCESSABLE_ENTITY,
                            "AI generated an unparseable response. Please retry generation."
                    );
                }
            }

            // Populate and sanitize metadata & resources
            populateResponseMetadata(candidate, request, rawResponse);

            // 1. Structural validation via RoadmapValidator
            List<String> errors = new ArrayList<>(roadmapValidator.validate(candidate, request));

            // 2. AI Relevance Reviewer (cheap second call)
            List<String> offTopicWarnings = reviewRelevanceWithAI(candidate, request);
            if (!offTopicWarnings.isEmpty()) {
                errors.addAll(offTopicWarnings);
            }

            if (errors.isEmpty()) {
                return candidate;
            }

            lastValidationErrors = errors;
            log.warn("Roadmap validation failed (attempt {}/2) with {} errors: {}", attempt, errors.size(), errors);

            if (attempt == 1) {
                long remainingSeconds = (deadlineMillis - System.currentTimeMillis()) / 1000L;
                if (remainingSeconds < 40) {
                    log.warn("Only {}s remaining on deadline (less than 40s needed for retry). Aborting retry.", remainingSeconds);
                    throw new RoadmapGenerationException(
                            HttpStatus.BAD_GATEWAY,
                            "Roadmap generation exceeded allowed time budget (" + timeoutSeconds + "s). Please retry."
                    );
                }

                StringBuilder retryPrompt = new StringBuilder(basePrompt);
                retryPrompt.append("\n\n[CRITICAL CORRECTIONS REQUIRED]\n");
                retryPrompt.append("The previous roadmap failed quality validation with the following specific errors. You MUST fix every single one:\n");
                for (String err : errors) {
                    retryPrompt.append("- ").append(err).append("\n");
                }
                retryPrompt.append("Ensure every single constraint above is rigorously satisfied in the returned JSON.\n");
                currentPrompt = retryPrompt.toString();
            }
        }

        throw new RoadmapGenerationException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "AI generated a roadmap that failed quality validation: " + String.join("; ", lastValidationErrors)
        );
    }

    private void checkDeadline(long deadlineMillis) {
        if (System.currentTimeMillis() >= deadlineMillis) {
            throw new RoadmapGenerationException(
                    HttpStatus.BAD_GATEWAY,
                    "Roadmap generation timed out after " + timeoutSeconds + " seconds."
            );
        }
    }

    /**
     * AI Relevance Reviewer: queries Gemini with goal and task titles to detect off-topic deviations.
     * Non-blocking: logs and skips on any failure or invalid JSON.
     */
    private List<String> reviewRelevanceWithAI(RoadmapResponse candidate, RoadmapRequest request) {
        List<String> offTopicDays = new ArrayList<>();
        if (candidate.getPhases() == null || candidate.getPhases().isEmpty()) {
            return offTopicDays;
        }

        StringBuilder taskSummary = new StringBuilder();
        for (WeeklyPhase phase : candidate.getPhases()) {
            if (phase.getDailyTasks() != null) {
                for (DailyTask t : phase.getDailyTasks()) {
                    taskSummary.append(String.format("Day %d: %s (Phase: %s)\n",
                            t.getDayNumber(), t.getTitle(), phase.getPhaseTitle()));
                }
            }
        }

        String reviewerPrompt = String.format("""
            You are a curriculum auditor.
            Evaluate whether the following study plan tasks strictly belong to this student's specific goal:
            Goal Subject: %s
            Goal Description: %s

            Tasks:
            %s

            Identify any tasks that are completely off-topic or teach unrelated topics (e.g. general algorithm puzzles for a Machine Learning goal, or unrelated web frameworks).
            Return a JSON object with this exact shape:
            {
              "offTopicDays": [
                {
                  "dayNumber": 3,
                  "reason": "Teaches competitive programming two-pointers instead of PyTorch or Machine Learning"
                }
              ]
            }
            If all tasks are on-topic and appropriate prerequisites for %s, return: { "offTopicDays": [] }
            """,
                request.getTopic(),
                request.getDescription() != null ? request.getDescription() : "",
                taskSummary,
                request.getTopic()
        );

        try {
            String rawJson = geminiTestService.askGeminiJson(reviewerPrompt);
            JsonNode root = objectMapper.readTree(extractJson(rawJson));
            JsonNode daysNode = root.get("offTopicDays");
            if (daysNode != null && daysNode.isArray()) {
                for (JsonNode item : daysNode) {
                    if (item.hasNonNull("dayNumber")) {
                        int dNum = item.get("dayNumber").asInt();
                        String reason = item.hasNonNull("reason") ? item.get("reason").asText() : "Off-topic content";
                        offTopicDays.add(String.format("Day %d is off-topic for %s: %s", dNum, request.getTopic(), reason));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("AI relevance reviewer encountered an issue (skipping review, proceeding with structural validation): {}", e.getMessage());
        }

        return offTopicDays;
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
                  - Start directly with foundational prerequisites strictly specific to this subject.
                  - Break ideas into concrete syntax and working minimal examples.
                  - Build confidence with scaffolded, guided hands-on exercises.
                """;
            case INTERMEDIATE -> """
                - Tailor for an INTERMEDIATE learner:
                  - Bypass elementary programming syntax; assume baseline fluency in the target language.
                  - Focus directly on architecture, patterns, testing, performance, error handling, and realistic integration.
                """;
            case ADVANCED -> """
                - Tailor for an ADVANCED practitioner:
                  - Focus on internal engine mechanisms, high concurrency, profiling, optimization, and edge-case resiliency.
                  - Real-world production architectures and rigorous benchmark-driven challenges.
                """;
        };

        // Knowledge-aware pedagogical constraints (ONLY rated_by_user topics)
        StringBuilder knowledgeConstraints = new StringBuilder();
        if (studentSkills != null && !studentSkills.isEmpty()) {
            List<String> mastered = new ArrayList<>();
            List<String> intermediate = new ArrayList<>();
            List<String> beginner = new ArrayList<>();
            List<String> unlearned = new ArrayList<>();

            for (StudentTopicKnowledge k : studentSkills) {
                if (k == null || Boolean.FALSE.equals(k.getRatedByUser())) {
                    continue;
                }
                switch (k.getKnowledgeLevel()) {
                    case MASTERED -> mastered.add(k.getTopicName());
                    case INTERMEDIATE -> intermediate.add(k.getTopicName());
                    case BEGINNER -> beginner.add(k.getTopicName());
                    case NOT_LEARNED -> unlearned.add(k.getTopicName());
                }
            }

            if (!mastered.isEmpty() || !intermediate.isEmpty() || !beginner.isEmpty() || !unlearned.isEmpty()) {
                knowledgeConstraints.append("\n[KNOWLEDGE-AWARE CONSTRAINTS]\n");
                if (!mastered.isEmpty()) {
                    knowledgeConstraints.append("- ALREADY MASTERED: ").append(String.join(", ", mastered))
                            .append("\n  * RULE: Strictly exclude basic tutorials on these topics; fast-track to advanced integration.\n");
                }
                if (!intermediate.isEmpty()) {
                    knowledgeConstraints.append("- INTERMEDIATE / FAMILIAR: ").append(String.join(", ", intermediate))
                            .append("\n  * RULE: Skip intro syntax; focus on rigorous practice and edge cases.\n");
                }
                if (!beginner.isEmpty()) {
                    knowledgeConstraints.append("- BEGINNER / FOUNDATIONS IN PROGRESS: ").append(String.join(", ", beginner))
                            .append("\n  * RULE: Provide structured explanation and scaffolded exercises.\n");
                }
                if (!unlearned.isEmpty()) {
                    knowledgeConstraints.append("- UNFAMILIAR: ").append(String.join(", ", unlearned))
                            .append("\n  * RULE: Introduce briefly, only as far as needed for the goal.\n");
                }
            }
        }

        // Student learning preferences (FORMAT ONLY)
        StringBuilder profilePreferences = new StringBuilder();
        if (profile != null) {
            profilePreferences.append("\n[STUDENT FORMAT & PEDAGOGY PREFERENCES]\n");
            profilePreferences.append("CRITICAL RULE ON PREFERENCES: Learning preferences and practice styles only modify the FORMAT of tasks, never the subject itself. " +
                    "For example, if the goal is Machine Learning and the practice style is Algorithmic Challenges, practice tasks MUST be ML/Python exercises (e.g., vectorized tensor manipulations or loss calculations), NEVER general data-structure or LeetCode interview puzzles unless the goal itself is about them.\n");

            if (profile.getCareerGoal() != null && !profile.getCareerGoal().isBlank()) {
                profilePreferences.append("- Target Career Trajectory: ").append(profile.getCareerGoal().trim()).append("\n");
            }
            if (profile.getExplanationStyle() != null && !profile.getExplanationStyle().isBlank()) {
                profilePreferences.append("- Explanation Format: ").append(profile.getExplanationStyle().trim()).append("\n");
            }
            if (profile.getPracticeStyle() != null && !profile.getPracticeStyle().isBlank()) {
                profilePreferences.append("- Practice Task Format: ").append(profile.getPracticeStyle().trim()).append("\n");
            }
            if (profile.getLearningMethods() != null && !profile.getLearningMethods().isBlank()) {
                profilePreferences.append("- Delivery Media: ").append(profile.getLearningMethods().trim()).append("\n");
            }
        }

        return String.format("""
            You are a curriculum architect and AI tutor.
            Design a comprehensive, realistic, and personalized learning roadmap strictly for this student:

            [SUBJECT & CURRICULUM GOAL - PRIMARY DIRECTIVE]
            Everything in this roadmap MUST serve this specific subject.
            - Goal Topic: %s
            - Description / Objective: %s
            - Target Skill Level: %s
            - Target Duration: %d days (approx %d weeks)
            - Daily Commitment: %.1f hours/day (%d minutes/day)
            - Total Available Study Time: %.1f hours
            - Specific Topics Requested: %s
            - Target Outcomes: %s
            - Prior Knowledge / Baseline: %s

            [PREREQUISITES & PHASE 1 RULE]
            Phase 1 must contain ONLY the prerequisites actually needed for %s at the student's skill level. Do NOT inject generic programming foundations, generic data-structures, or LeetCode algorithms unless the goal itself is about them.
            %s
            %s
            [PEDAGOGICAL STRATEGY]
            %s

            [CURRICULUM DIVERSITY & COMPOSITION RULES]
            1. Total daily tasks across all phases combined MUST equal EXACTLY %d (1 task per day).
            2. Allowed values for 'activityType' are strictly: STUDY, PRACTICE, PROJECT, REVIEW, CODING_PRACTICE, QUIZ, ASSESSMENT.
            3. No single activityType may exceed 60%% of the total tasks (ensure a balanced mix of conceptual study, coding practice, review, and projects).
            4. Include a REVIEW or ASSESSMENT day at least every 10 days.
            5. The final phase must culminate in an end-to-end Capstone Project.
            6. For each task, set 'estimatedMinutes' to a realistic value within the daily budget (range from 45 up to %d minutes). Total daily minutes must not exceed %d minutes.

            [JSON SCHEMA REQUIREMENT]
            Return a single, strictly valid JSON object conforming exactly to this schema:
            {
              "overview": "2-3 sentences summarizing the curriculum trajectory and key capabilities the student will gain.",
              "feasibilityNote": "Honest assessment of curriculum feasibility within %.1f total hours and guidance on pacing.",
              "totalStudyHours": %.1f,
              "skillLevel": "%s",
              "prerequisites": [
                "Prerequisite item 1",
                "Prerequisite item 2"
              ],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Descriptive Title",
                  "durationDays": 7,
                  "topics": ["Topic 1", "Topic 2"],
                  "subtopics": ["Subtopic 1.1", "Subtopic 1.2"],
                  "milestones": ["Verifiable milestone 1"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Actionable task title",
                      "description": "Specific study and practice instruction for this day",
                      "estimatedMinutes": %d,
                      "activityType": "STUDY",
                      "learningObjectives": ["Objective 1", "Objective 2"],
                      "subtopics": ["Subtopic 1", "Subtopic 2"],
                      "conceptExplanation": "Short 1-2 sentence core concept summary",
                      "practiceTasks": ["Actionable coding or hands-on practice step"],
                      "quizQuestion": "Self-assessment check question"
                    }
                  ],
                  "practicalExercises": [
                    {
                      "title": "Exercise title",
                      "instructions": "Step-by-step guidance",
                      "difficulty": "%s"
                    }
                  ],
                  "assessment": {
                    "title": "Phase Assessment Milestone",
                    "type": "PROJECT",
                    "description": "What to solve or demonstrate",
                    "passingCriteria": "Verification checklist"
                  }
                }
              ],
              "learningResources": [
                {
                  "title": "Authoritative Resource Name",
                  "url": "Optional documentation URL",
                  "type": "DOCUMENTATION",
                  "relevance": "Why this specific resource accelerates learning for this topic"
                }
              ]
            }
            """,
                request.getTopic(),
                request.getDescription() != null && !request.getDescription().isBlank() ? request.getDescription() : "Mastery and practical application",
                request.getSkillLevel().name(),
                request.getTargetDays(),
                weeks,
                request.getHoursPerDay(),
                dailyMinutes,
                totalHours,
                request.getSpecificTopics() != null && !request.getSpecificTopics().isBlank() ? request.getSpecificTopics().trim() : "Comprehensive core topics",
                request.getTargetOutcomes() != null && !request.getTargetOutcomes().isBlank() ? request.getTargetOutcomes().trim() : "Practical production mastery",
                request.getPriorKnowledge() != null && !request.getPriorKnowledge().isBlank() ? request.getPriorKnowledge().trim() : "None stated",
                request.getTopic(),
                knowledgeConstraints,
                profilePreferences,
                skillLevelGuidance,
                request.getTargetDays(),
                dailyMinutes,
                dailyMinutes,
                totalHours,
                totalHours,
                request.getSkillLevel().name(),
                Math.min(dailyMinutes, 90),
                request.getSkillLevel().name()
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

        // Sanitize learning resources against host allowlist
        if (response.getLearningResources() != null && !response.getLearningResources().isEmpty()) {
            for (ResourceItem r : response.getLearningResources()) {
                r.setVerified(false); // New resources are always isVerified=false per Phase 2b spec
                if (r.getUrl() != null && !r.getUrl().isBlank()) {
                    String cleanUrl = r.getUrl().trim();
                    if (isAllowedUrl(cleanUrl)) {
                        r.setUrl(cleanUrl);
                    } else {
                        r.setUrl(""); // Drop URL if not on allowlist or invalid
                    }
                } else {
                    r.setUrl("");
                }
            }
        }

        if (response.getResources() == null || response.getResources().isEmpty()) {
            if (response.getLearningResources() != null && !response.getLearningResources().isEmpty()) {
                List<String> legacyResources = response.getLearningResources().stream()
                        .map(r -> r.getTitle() + (r.getUrl() != null && !r.getUrl().isBlank() ? " (" + r.getUrl() + ")" : ""))
                        .toList();
                response.setResources(legacyResources);
            }
        }
    }

    public boolean isAllowedUrl(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            URI uri = URI.create(url.trim());
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                return false;
            }
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return false;
            }
            host = host.toLowerCase();

            for (String allowed : allowedHosts) {
                String cleanAllowed = allowed.trim().toLowerCase();
                if (cleanAllowed.isEmpty()) continue;
                if (host.equals(cleanAllowed) || host.endsWith("." + cleanAllowed)) {
                    return true;
                }
            }
            return false;
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
