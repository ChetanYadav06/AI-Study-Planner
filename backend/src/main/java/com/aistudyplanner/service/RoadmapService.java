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

    @FunctionalInterface
    public interface ProgressCallback {
        void onProgress(int phasesDone, int phasesTotal, String message);
    }

    private final Set<String> allowedHosts;

    public RoadmapService(GeminiTestService geminiTestService) {
        this(geminiTestService, new RoadmapValidator(), null, null, 300, DEFAULT_ALLOWED_HOSTS);
    }

    public RoadmapService(GeminiTestService geminiTestService, RoadmapValidator roadmapValidator) {
        this(geminiTestService, roadmapValidator, null, null, 300, DEFAULT_ALLOWED_HOSTS);
    }

    public RoadmapService(
            GeminiTestService geminiTestService,
            RoadmapValidator roadmapValidator,
            StudentProfileRepository profileRepository,
            StudentTopicKnowledgeRepository topicKnowledgeRepository) {
        this(geminiTestService, roadmapValidator, profileRepository, topicKnowledgeRepository, 300, DEFAULT_ALLOWED_HOSTS);
    }

    @Autowired
    public RoadmapService(
            GeminiTestService geminiTestService,
            RoadmapValidator roadmapValidator,
            @Autowired(required = false) StudentProfileRepository profileRepository,
            @Autowired(required = false) StudentTopicKnowledgeRepository topicKnowledgeRepository,
            @Value("${roadmap.generation.timeout-seconds:300}") int timeoutSeconds,
            @Value("${roadmap.resources.allowed-hosts:docs.python.org,pytorch.org,huggingface.co,ai.google.dev,developer.mozilla.org,spring.io,docs.oracle.com,scikit-learn.org,numpy.org,pandas.pydata.org,platform.openai.com,docs.trychroma.com}") Set<String> allowedHosts) {
        this.geminiTestService = geminiTestService;
        this.roadmapValidator = roadmapValidator != null ? roadmapValidator : new RoadmapValidator();
        this.profileRepository = profileRepository;
        this.topicKnowledgeRepository = topicKnowledgeRepository;
        this.timeoutSeconds = timeoutSeconds > 0 ? timeoutSeconds : 300;
        this.allowedHosts = allowedHosts != null ? allowedHosts : Set.of();
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request) {
        return generateRoadmap(request, null);
    }

    public RoadmapResponse generateRoadmap(RoadmapRequest request, String userEmail) {
        return generateRoadmapPerPhase(request, userEmail, null);
    }

    public RoadmapResponse generateRoadmapPerPhase(RoadmapRequest request, String userEmail, ProgressCallback callback) {
        long startTime = System.currentTimeMillis();
        long deadlineMillis = startTime + (timeoutSeconds * 1000L);

        StudentProfile profile = null;
        List<StudentTopicKnowledge> skills = List.of();

        if (userEmail != null && !userEmail.isBlank()) {
            if (profileRepository != null) {
                profile = profileRepository.findByUserEmail(userEmail).orElse(null);
            }
            if (topicKnowledgeRepository != null) {
                skills = topicKnowledgeRepository.findByStudentEmail(userEmail).stream()
                        .filter(k -> Boolean.TRUE.equals(k.getRatedByUser()))
                        .toList();
            }
        }

        if (callback != null) {
            callback.onProgress(0, 0, "Planning curriculum outline...");
        }

        // Call 1: Outline generation (or full roadmap in legacy single-shot mocks)
        String outlinePrompt = buildOutlinePrompt(request, profile, skills);
        RoadmapResponse candidate = null;
        String rawOutlineResponse = null;

        for (int attempt = 1; attempt <= 2; attempt++) {
            checkDeadline(deadlineMillis);
            try {
                rawOutlineResponse = geminiTestService.askGeminiJson(outlinePrompt);
            } catch (RoadmapGenerationException e) {
                throw e;
            } catch (Exception e) {
                log.error("Gemini call failed during outline generation: {}", e.getMessage());
                throw new RoadmapGenerationException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini service is currently unavailable or encountered an error. Please try again."
                );
            }

            String jsonText = extractJson(rawOutlineResponse);
            try {
                candidate = objectMapper.readValue(jsonText, RoadmapResponse.class);
                if (candidate != null && candidate.getPhases() != null && !candidate.getPhases().isEmpty()) {
                    break;
                }
            } catch (Exception e) {
                log.warn("Gemini outline output could not be parsed as JSON (attempt {}/2): {}", attempt, e.getMessage());
                if (attempt == 1) {
                    long remainingSeconds = (deadlineMillis - System.currentTimeMillis()) / 1000L;
                    if (remainingSeconds < 40) {
                        throw new RoadmapGenerationException(
                                HttpStatus.BAD_GATEWAY,
                                "Roadmap generation exceeded allowed time budget (" + timeoutSeconds + "s). Please retry."
                        );
                    }
                    outlinePrompt = outlinePrompt + "\n\nCRITICAL FIX REQUIRED: Previous response was not valid JSON or was malformed. You MUST return strictly valid JSON conforming to the schema.";
                    continue;
                } else {
                    throw new RoadmapGenerationException(HttpStatus.UNPROCESSABLE_ENTITY, "AI generated an unparseable response. Please retry generation.");
                }
            }

            if (candidate == null || candidate.getPhases() == null || candidate.getPhases().isEmpty()) {
                if (attempt == 1) {
                    outlinePrompt = outlinePrompt + "\n\nCRITICAL FIX REQUIRED: Previous response lacked phases. Return strictly valid JSON conforming to the schema.";
                } else {
                    throw new RoadmapGenerationException(HttpStatus.UNPROCESSABLE_ENTITY, "AI generated an invalid roadmap outline without phases.");
                }
            }
        }

        if (candidate == null || candidate.getPhases() == null || candidate.getPhases().isEmpty()) {
            throw new RoadmapGenerationException(HttpStatus.UNPROCESSABLE_ENTITY, "AI generated an invalid roadmap outline without phases.");
        }

        // Backward compatibility: If Call 1 returned full daily tasks (e.g. single-call tests or mocks)
        boolean hasFullDailyTasks = candidate.getPhases().stream().allMatch(p -> p.getDailyTasks() != null && !p.getDailyTasks().isEmpty())
                && candidate.getPhases().stream().mapToInt(p -> p.getDailyTasks().size()).sum() == request.getTargetDays();

        if (hasFullDailyTasks) {
            populateResponseMetadata(candidate, request, rawOutlineResponse);
            List<String> errors = new ArrayList<>(roadmapValidator.validate(candidate, request));
            List<String> offTopicWarnings = reviewRelevanceWithAI(candidate, request);
            if (!offTopicWarnings.isEmpty()) errors.addAll(offTopicWarnings);
            if (errors.isEmpty()) {
                if (callback != null) {
                    callback.onProgress(candidate.getPhases().size(), candidate.getPhases().size(), "Roadmap generation complete.");
                }
                return candidate;
            }

            long remainingSeconds = (deadlineMillis - System.currentTimeMillis()) / 1000L;
            if (remainingSeconds < 40) {
                log.warn("Only {}s remaining on deadline (less than 40s needed for retry). Aborting retry.", remainingSeconds);
                throw new RoadmapGenerationException(
                        HttpStatus.BAD_GATEWAY,
                        "Roadmap generation exceeded allowed time budget (" + timeoutSeconds + "s). Please retry."
                );
            }

            StringBuilder retryPrompt = new StringBuilder(buildPrompt(request, profile, skills));
            retryPrompt.append("\n\n[CRITICAL CORRECTIONS REQUIRED]\n");
            retryPrompt.append("The previous roadmap failed quality validation with the following specific errors. You MUST fix every single one:\n");
            for (String err : errors) {
                retryPrompt.append("- ").append(err).append("\n");
            }
            retryPrompt.append("Ensure every single constraint above is rigorously satisfied in the returned JSON.\n");

            checkDeadline(deadlineMillis);
            String rawRetry = geminiTestService.askGeminiJson(retryPrompt.toString());
            RoadmapResponse retryCandidate;
            try {
                retryCandidate = objectMapper.readValue(extractJson(rawRetry), RoadmapResponse.class);
            } catch (Exception e) {
                throw new RoadmapGenerationException(HttpStatus.UNPROCESSABLE_ENTITY, "AI generated an unparseable response. Please retry generation.");
            }
            populateResponseMetadata(retryCandidate, request, rawRetry);

            List<String> retryErrors = new ArrayList<>(roadmapValidator.validate(retryCandidate, request));
            List<String> retryOffTopic = reviewRelevanceWithAI(retryCandidate, request);
            if (!retryOffTopic.isEmpty()) retryErrors.addAll(retryOffTopic);

            if (retryErrors.isEmpty()) {
                if (callback != null) {
                    callback.onProgress(retryCandidate.getPhases().size(), retryCandidate.getPhases().size(), "Roadmap generation complete.");
                }
                return retryCandidate;
            }

            throw new RoadmapGenerationException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "AI generated a roadmap that failed quality validation: " + String.join("; ", retryErrors)
            );
        }

        // Per-phase daily tasks generation
        List<WeeklyPhase> phases = candidate.getPhases();
        int phasesTotal = phases.size();
        reconcilePhaseDurations(phases, request.getTargetDays());

        int currentStartDay = 1;
        for (int i = 0; i < phasesTotal; i++) {
            WeeklyPhase phase = phases.get(i);
            int phaseDuration = phase.getDurationDays();
            int phaseEndDay = currentStartDay + phaseDuration - 1;

            if (callback != null) {
                callback.onProgress(i, phasesTotal, String.format("Phase %d of %d: %s", (i + 1), phasesTotal, phase.getPhaseTitle()));
            }

            List<String> prevTaskTitles = getPreviousTaskTitles(phases, i);
            List<DailyTask> phaseTasks = generatePhaseTasksWithRetry(
                    request, candidate, phase, currentStartDay, phaseEndDay, prevTaskTitles, profile, skills, deadlineMillis
            );
            phase.setDailyTasks(phaseTasks);

            currentStartDay = phaseEndDay + 1;
        }

        populateResponseMetadata(candidate, request, rawOutlineResponse);

        // Whole-roadmap validation
        List<String> errors = new ArrayList<>(roadmapValidator.validate(candidate, request));
        List<String> offTopicWarnings = reviewRelevanceWithAI(candidate, request);
        if (!offTopicWarnings.isEmpty()) errors.addAll(offTopicWarnings);

        if (!errors.isEmpty()) {
            log.warn("Full assembled roadmap validation failed with {} errors: {}", errors.size(), errors);
            Integer singleFailingPhaseIndex = identifySingleFailingPhase(phases, errors);
            if (singleFailingPhaseIndex != null) {
                log.info("Errors are isolated to Phase {}. Regenerating single phase...", singleFailingPhaseIndex + 1);
                WeeklyPhase badPhase = phases.get(singleFailingPhaseIndex);
                int badStartDay = calculatePhaseStartDay(phases, singleFailingPhaseIndex);
                int badEndDay = badStartDay + badPhase.getDurationDays() - 1;
                List<String> prevTitles = getPreviousTaskTitles(phases, singleFailingPhaseIndex);

                List<DailyTask> repairedTasks = generatePhaseTasksWithRetry(
                        request, candidate, badPhase, badStartDay, badEndDay, prevTitles, profile, skills, deadlineMillis
                );
                badPhase.setDailyTasks(repairedTasks);
                populateResponseMetadata(candidate, request, rawOutlineResponse);

                errors = new ArrayList<>(roadmapValidator.validate(candidate, request));
                offTopicWarnings = reviewRelevanceWithAI(candidate, request);
                if (!offTopicWarnings.isEmpty()) errors.addAll(offTopicWarnings);
            }

            if (!errors.isEmpty()) {
                throw new RoadmapGenerationException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "AI generated a roadmap that failed quality validation: " + String.join("; ", errors)
                );
            }
        }

        if (callback != null) {
            callback.onProgress(phasesTotal, phasesTotal, "Roadmap generation completed successfully.");
        }
        return candidate;
    }

    private int calculatePhaseStartDay(List<WeeklyPhase> phases, int targetIndex) {
        int start = 1;
        for (int i = 0; i < targetIndex; i++) {
            start += phases.get(i).getDurationDays();
        }
        return start;
    }

    private void reconcilePhaseDurations(List<WeeklyPhase> phases, int targetDays) {
        if (phases == null || phases.isEmpty()) return;
        int n = phases.size();
        int sum = 0;
        for (WeeklyPhase p : phases) {
            if (p.getDurationDays() == null || p.getDurationDays() <= 0) {
                p.setDurationDays(Math.max(1, targetDays / n));
            }
            sum += p.getDurationDays();
        }

        if (sum != targetDays) {
            int diff = targetDays - sum;
            WeeklyPhase lastPhase = phases.get(n - 1);
            int adjustedLast = lastPhase.getDurationDays() + diff;
            if (adjustedLast >= 1) {
                lastPhase.setDurationDays(adjustedLast);
            } else {
                // Distribute evenly if last phase cannot absorb diff
                int base = targetDays / n;
                int rem = targetDays % n;
                for (int i = 0; i < n; i++) {
                    phases.get(i).setDurationDays(base + (i == n - 1 ? rem : 0));
                }
            }
        }
    }

    private List<String> getPreviousTaskTitles(List<WeeklyPhase> phases, int currentIndex) {
        List<String> titles = new ArrayList<>();
        if (currentIndex > 0) {
            WeeklyPhase prev = phases.get(currentIndex - 1);
            if (prev.getDailyTasks() != null) {
                int size = prev.getDailyTasks().size();
                int from = Math.max(0, size - 3);
                for (int i = from; i < size; i++) {
                    titles.add(prev.getDailyTasks().get(i).getTitle());
                }
            }
        }
        return titles;
    }

    private List<DailyTask> generatePhaseTasksWithRetry(
            RoadmapRequest request,
            RoadmapResponse candidate,
            WeeklyPhase phase,
            int startDay,
            int endDay,
            List<String> prevTaskTitles,
            StudentProfile profile,
            List<StudentTopicKnowledge> studentSkills,
            long deadlineMillis) {

        String prompt = buildPhaseDailyTasksPrompt(request, candidate, phase, startDay, endDay, prevTaskTitles, profile, studentSkills);
        List<DailyTask> tasks = null;
        List<String> errors = new ArrayList<>();
        int dailyMinutes = (int) Math.round(request.getHoursPerDay() * 60);

        for (int attempt = 1; attempt <= 2; attempt++) {
            checkDeadline(deadlineMillis);
            String rawJson;
            try {
                rawJson = geminiTestService.askGeminiJson(prompt);
            } catch (RoadmapGenerationException e) {
                throw e;
            } catch (Exception e) {
                log.error("Gemini call failed during phase tasks generation: {}", e.getMessage());
                throw new RoadmapGenerationException(
                        HttpStatus.BAD_GATEWAY,
                        "Gemini service is currently unavailable or encountered an error. Please try again."
                );
            }

            try {
                tasks = parsePhaseDailyTasks(rawJson);
                errors = validatePhaseTasks(tasks, startDay, endDay, dailyMinutes);
                if (errors.isEmpty()) {
                    return tasks;
                }
            } catch (Exception e) {
                log.warn("Failed to parse phase tasks (attempt {}/2): {}", attempt, e.getMessage());
                errors = List.of("Malformed JSON or missing 'dailyTasks' array: " + e.getMessage());
            }

            if (attempt == 1) {
                prompt = prompt + "\n\n[CRITICAL CORRECTIONS REQUIRED]\n"
                        + "Your previous response failed phase validation with these errors. You MUST fix every single one:\n"
                        + String.join("\n- ", errors) + "\nReturn strictly valid JSON conforming to the schema.";
            }
        }

        throw new RoadmapGenerationException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Phase " + phase.getPhaseNumber() + " failed validation: " + String.join("; ", errors)
        );
    }

    private List<DailyTask> parsePhaseDailyTasks(String rawJson) throws Exception {
        String clean = extractJson(rawJson);
        JsonNode root = objectMapper.readTree(clean);
        JsonNode tasksNode = root.get("dailyTasks");
        if (tasksNode == null || !tasksNode.isArray()) {
            throw new IllegalArgumentException("Response must contain a 'dailyTasks' array.");
        }
        List<DailyTask> tasks = new ArrayList<>();
        for (JsonNode node : tasksNode) {
            DailyTask task = objectMapper.treeToValue(node, DailyTask.class);
            tasks.add(task);
        }
        return tasks;
    }

    private List<String> validatePhaseTasks(List<DailyTask> tasks, int startDay, int endDay, int dailyMinutes) {
        List<String> errors = new ArrayList<>();
        int expectedCount = endDay - startDay + 1;
        if (tasks == null || tasks.size() != expectedCount) {
            errors.add(String.format("Expected %d tasks (days %d-%d), but received %d.",
                    expectedCount, startDay, endDay, tasks != null ? tasks.size() : 0));
            return errors;
        }

        Set<Integer> seenDays = new HashSet<>();
        Map<String, Integer> activityCounts = new HashMap<>();

        for (int i = 0; i < tasks.size(); i++) {
            DailyTask t = tasks.get(i);
            int expectedDay = startDay + i;
            if (t.getDayNumber() != expectedDay) {
                errors.add(String.format("Task at index %d has dayNumber %d, expected %d.", i, t.getDayNumber(), expectedDay));
            }
            if (!seenDays.add(t.getDayNumber())) {
                errors.add(String.format("Duplicate dayNumber %d.", t.getDayNumber()));
            }
            if (t.getTitle() == null || t.getTitle().isBlank()) {
                errors.add(String.format("Day %d task missing title.", t.getDayNumber()));
            }
            if (t.getDescription() == null || t.getDescription().isBlank()) {
                errors.add(String.format("Day %d task missing description.", t.getDayNumber()));
            }
            String act = t.getActivityType() != null ? t.getActivityType().trim().toUpperCase() : "";
            if (!RoadmapValidator.ALLOWED_ACTIVITY_TYPES.contains(act)) {
                errors.add(String.format("Day %d has invalid activityType '%s'. Allowed: %s", t.getDayNumber(), act, RoadmapValidator.ALLOWED_ACTIVITY_TYPES));
            } else {
                activityCounts.put(act, activityCounts.getOrDefault(act, 0) + 1);
            }
        }

        if (tasks.size() > 2) {
            int maxAllowed = (int) Math.ceil(tasks.size() * 0.60);
            for (Map.Entry<String, Integer> entry : activityCounts.entrySet()) {
                if (entry.getValue() > maxAllowed) {
                    errors.add(String.format("Activity type '%s' appears %d times, exceeding 60%% limit (%d) for this phase.", entry.getKey(), entry.getValue(), maxAllowed));
                }
            }
        }

        return errors;
    }

    private Integer identifySingleFailingPhase(List<WeeklyPhase> phases, List<String> errors) {
        if (phases == null || phases.isEmpty() || errors == null || errors.isEmpty()) {
            return null;
        }
        java.util.regex.Pattern dayPattern = java.util.regex.Pattern.compile("(?i)day\\s*(\\d+)");
        Set<Integer> failingPhases = new HashSet<>();

        for (String err : errors) {
            java.util.regex.Matcher m = dayPattern.matcher(err);
            boolean matched = false;
            while (m.find()) {
                matched = true;
                int day = Integer.parseInt(m.group(1));
                int currentDay = 1;
                for (int pIdx = 0; pIdx < phases.size(); pIdx++) {
                    WeeklyPhase p = phases.get(pIdx);
                    int dur = p.getDurationDays() != null ? p.getDurationDays() : 0;
                    if (day >= currentDay && day < currentDay + dur) {
                        failingPhases.add(pIdx);
                        break;
                    }
                    currentDay += dur;
                }
            }
            if (!matched) {
                return null;
            }
        }

        if (failingPhases.size() == 1) {
            return failingPhases.iterator().next();
        }
        return null;
    }

    public String buildOutlinePrompt(RoadmapRequest request, StudentProfile profile, List<StudentTopicKnowledge> studentSkills) {
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

        StringBuilder knowledgeConstraints = new StringBuilder();
        if (studentSkills != null && !studentSkills.isEmpty()) {
            List<String> mastered = new ArrayList<>();
            List<String> intermediate = new ArrayList<>();
            List<String> beginner = new ArrayList<>();
            List<String> unlearned = new ArrayList<>();

            for (StudentTopicKnowledge k : studentSkills) {
                if (k == null || Boolean.FALSE.equals(k.getRatedByUser())) continue;
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

        StringBuilder profilePreferences = new StringBuilder();
        if (profile != null) {
            profilePreferences.append("\n[STUDENT FORMAT & PEDAGOGY PREFERENCES]\n");
            profilePreferences.append("CRITICAL RULE ON PREFERENCES: Learning preferences and practice styles only modify the FORMAT of tasks, never the subject itself.\n");
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
            if (profile.getAdditionalContext() != null && !profile.getAdditionalContext().isBlank()) {
                profilePreferences.append("- Personalization & Revision Notes: ").append(profile.getAdditionalContext().trim()).append("\n");
            }
        }

        return String.format("""
            You are a curriculum architect and AI tutor.
            Design the overall learning roadmap outline strictly for this student:

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
            Phase 1 must contain ONLY the prerequisites actually needed for %s at the student's skill level.
            %s
            %s
            [PEDAGOGICAL STRATEGY]
            %s

            [OUTLINE ARCHITECTURE RULES]
            1. Partition the total %d days across sequential phases. The sum of 'durationDays' across all phases MUST equal EXACTLY %d.
            2. For each phase, provide 'phaseNumber', 'phaseTitle', 'durationDays', 'topics' (2-5 strings), 'subtopics', 'milestones', 'practicalExercises', and 'assessment'.
            3. Do NOT include 'dailyTasks' in this outline response. Daily tasks will be generated in subsequent phase-specific calls.

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
                request.getTargetDays(),
                totalHours,
                totalHours,
                request.getSkillLevel().name(),
                request.getSkillLevel().name()
        );
    }

    public String buildPhaseDailyTasksPrompt(
            RoadmapRequest request,
            RoadmapResponse candidate,
            WeeklyPhase phase,
            int startDay,
            int endDay,
            List<String> prevTaskTitles,
            StudentProfile profile,
            List<StudentTopicKnowledge> studentSkills) {
        int phaseDays = endDay - startDay + 1;
        int dailyMinutes = (int) Math.round(request.getHoursPerDay() * 60);
        boolean isLastPhase = phase.getPhaseNumber() != null && candidate.getPhases() != null
                && phase.getPhaseNumber() == candidate.getPhases().size();

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a curriculum architect and AI tutor.\n");
        prompt.append("Generate the detailed daily study tasks for a single phase of a learning roadmap.\n\n");
        prompt.append("[PRIMARY DIRECTIVE]\n");
        prompt.append(String.format("- Goal Topic: %s\n", request.getTopic()));
        if (request.getDescription() != null && !request.getDescription().isBlank()) {
            prompt.append(String.format("- Goal Description: %s\n", request.getDescription()));
        }
        prompt.append(String.format("- Skill Level: %s\n", request.getSkillLevel().name()));
        prompt.append(String.format("- Daily Commitment: %.1f hours/day (%d minutes/day)\n\n", request.getHoursPerDay(), dailyMinutes));

        prompt.append("[TARGET PHASE]\n");
        prompt.append(String.format("- Phase %d: %s\n", phase.getPhaseNumber(), phase.getPhaseTitle()));
        prompt.append(String.format("- Duration: %d days (Day %d through Day %d)\n", phaseDays, startDay, endDay));
        if (phase.getTopics() != null && !phase.getTopics().isEmpty()) {
            prompt.append(String.format("- Focus Topics: %s\n", String.join(", ", phase.getTopics())));
        }
        if (phase.getMilestones() != null && !phase.getMilestones().isEmpty()) {
            prompt.append(String.format("- Phase Milestones: %s\n", String.join(", ", phase.getMilestones())));
        }

        if (prevTaskTitles != null && !prevTaskTitles.isEmpty()) {
            prompt.append("\n[AVOID REPETITION - PREVIOUS PHASE LAST TASKS]\n");
            for (String title : prevTaskTitles) {
                prompt.append(String.format("- Already covered: %s\n", title));
            }
            prompt.append("Do NOT repeat these topics or tasks.\n");
        }

        prompt.append("\n[DAILY TASK RULES FOR THIS PHASE]\n");
        prompt.append(String.format("1. You MUST generate EXACTLY %d daily tasks, with dayNumber running consecutively from %d to %d (inclusive).\n", phaseDays, startDay, endDay));
        prompt.append("2. Allowed values for 'activityType' are strictly: STUDY, PRACTICE, PROJECT, REVIEW, CODING_PRACTICE, QUIZ, ASSESSMENT.\n");
        prompt.append("3. No single activityType may exceed 60% of this phase's tasks.\n");
        if (endDay >= 10 && (endDay % 10 < phaseDays || phaseDays >= 10)) {
            prompt.append("4. Include at least one REVIEW or ASSESSMENT day in this phase.\n");
        }
        if (isLastPhase) {
            prompt.append(String.format("5. As this is the final phase of the roadmap, Day %d must culminate in an end-to-end Capstone Project.\n", endDay));
        }
        prompt.append(String.format("6. For each task, set 'estimatedMinutes' within daily budget (45 up to %d minutes).\n", dailyMinutes));
        int nTopics = Math.min(5, Math.max(2, (int) Math.round((double) dailyMinutes / 30.0)));
        prompt.append(String.format("7. Each daily task MUST include a 'topics' array with EXACTLY %d distinct topics. Each topic object must have 'title' (3 to 60 characters) and 'summary' (10 to 160 characters) explaining the concept.\n", nTopics));

        prompt.append("\n[JSON SCHEMA REQUIREMENT]\n");
        prompt.append("Return a single JSON object conforming strictly to this format:\n");
        prompt.append("{\n");
        prompt.append("  \"dailyTasks\": [\n");
        prompt.append("    {\n");
        prompt.append(String.format("      \"dayNumber\": %d,\n", startDay));
        prompt.append("      \"title\": \"Actionable task title\",\n");
        prompt.append("      \"description\": \"Specific study and practice instruction\",\n");
        prompt.append(String.format("      \"estimatedMinutes\": %d,\n", dailyMinutes));
        prompt.append("      \"activityType\": \"STUDY\",\n");
        prompt.append("      \"topics\": [\n");
        prompt.append("        {\"title\": \"Core Topic Title\", \"summary\": \"Specific explanation of the core concept (10-160 characters).\"}\n");
        prompt.append("      ],\n");
        prompt.append("      \"learningObjectives\": [\"Objective 1\", \"Objective 2\"],\n");
        prompt.append("      \"subtopics\": [\"Subtopic 1\", \"Subtopic 2\"],\n");
        prompt.append("      \"conceptExplanation\": \"Short 1-2 sentence core concept summary\",\n");
        prompt.append("      \"practiceTasks\": [\"Actionable coding or hands-on practice step\"],\n");
        prompt.append("      \"quizQuestion\": \"Self-assessment check question\"\n");
        prompt.append("    }\n");
        prompt.append("  ]\n");
        prompt.append("}\n");

        return prompt.toString();
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
            if (profile.getAdditionalContext() != null && !profile.getAdditionalContext().isBlank()) {
                profilePreferences.append("- Personalization & Revision Notes: ").append(profile.getAdditionalContext().trim()).append("\n");
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
                      "activityType": "STUDY | PRACTICE | PROJECT | REVIEW | CODING_PRACTICE | QUIZ | ASSESSMENT",
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

        // Calculate and calibrate estimatedMinutes deterministically on the backend
        int targetDailyMinutes = (int) Math.round(request.getHoursPerDay() * 60);
        if (targetDailyMinutes <= 0) {
            targetDailyMinutes = 120;
        }

        if (response.getPhases() != null) {
            for (WeeklyPhase phase : response.getPhases()) {
                if (phase.getDailyTasks() != null) {
                    for (DailyTask task : phase.getDailyTasks()) {
                        int minutes = task.getEstimatedMinutes();
                        // If missing, non-positive, or exceeding daily tolerance, calibrate deterministically
                        if (minutes <= 0 || minutes > (targetDailyMinutes * RoadmapValidator.DAILY_MINUTES_TOLERANCE_RATIO)) {
                            String act = task.getActivityType() != null ? task.getActivityType().trim().toUpperCase() : "STUDY";
                            int calibrated = switch (act) {
                                case "QUIZ" -> Math.max(30, (int) Math.round(targetDailyMinutes * 0.5));
                                case "REVIEW", "ASSESSMENT" -> Math.max(45, (int) Math.round(targetDailyMinutes * 0.75));
                                default -> targetDailyMinutes; // STUDY, PRACTICE, PROJECT, CODING_PRACTICE
                            };
                            task.setEstimatedMinutes(Math.min(calibrated, targetDailyMinutes));
                        }

                        // Derive subtopics from topics if topics present (Sub-step 7B)
                        if (task.getTopics() != null && !task.getTopics().isEmpty()) {
                            task.setSubtopics(task.getTopics().stream()
                                    .map(DailyTopic::getTitle)
                                    .filter(Objects::nonNull)
                                    .toList());
                            int tIdx = 0;
                            for (DailyTopic dt : task.getTopics()) {
                                if (dt.getId() == null || dt.getId().isBlank()) {
                                    dt.setId("day-" + task.getDayNumber() + "-topic-" + tIdx);
                                }
                                tIdx++;
                            }
                        } else if (task.getSubtopics() == null) {
                            task.setSubtopics(new ArrayList<>());
                        }
                        if (task.getLearningObjectives() == null) {
                            task.setLearningObjectives(new ArrayList<>());
                        }
                        if (task.getPracticeTasks() == null) {
                            task.setPracticeTasks(new ArrayList<>());
                        }
                    }
                }
            }
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
