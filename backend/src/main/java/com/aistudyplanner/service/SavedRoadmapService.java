package com.aistudyplanner.service;

import com.aistudyplanner.dto.ReplaceRoadmapRequest;
import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.dto.SavedRoadmapResponse;
import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.dto.UpdateRoadmapProgressRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.exception.RoadmapGenerationException;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SavedRoadmapService {

    private static final Logger log = LoggerFactory.getLogger(SavedRoadmapService.class);

    private final SavedRoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;
    private final ObjectMapper objectMapper;
    private final RoadmapValidator roadmapValidator;

    public SavedRoadmapService(SavedRoadmapRepository roadmapRepository,
                               UserRepository userRepository,
                               GoalRepository goalRepository,
                               ObjectMapper objectMapper) {
        this(roadmapRepository, userRepository, goalRepository, objectMapper, new RoadmapValidator());
    }

    @Autowired
    public SavedRoadmapService(SavedRoadmapRepository roadmapRepository,
                               UserRepository userRepository,
                               GoalRepository goalRepository,
                               ObjectMapper objectMapper,
                               RoadmapValidator roadmapValidator) {
        this.roadmapRepository = roadmapRepository;
        this.userRepository = userRepository;
        this.goalRepository = goalRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.roadmapValidator = roadmapValidator != null ? roadmapValidator : new RoadmapValidator();
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student user account not found."));
    }

    @Transactional
    public SavedRoadmapResponse saveRoadmap(String email, SaveRoadmapRequest request) {
        User user = getAuthenticatedUser(email);

        // Prevent duplicate roadmaps for the same goal
        SavedRoadmap roadmap = null;
        if (request.getGoalId() != null) {
            roadmap = roadmapRepository.findByGoalIdAndUserEmail(request.getGoalId(), email).orElse(null);
        }

        if (roadmap != null) {
            // Update existing roadmap in-place instead of creating a duplicate
            roadmap.setTitle(request.getTitle().trim());
            roadmap.setTopic(request.getTopic().trim());
            roadmap.setSkillLevel(request.getSkillLevel());
            roadmap.setTargetDays(request.getTargetDays());
            roadmap.setHoursPerDay(request.getHoursPerDay());
            roadmap.setRoadmapJson(request.getRoadmapJson());
            roadmap.setCompletedTasksJson("[]");
            roadmap.setCompletedMilestonesJson("[]");
            roadmap.setProgressPercentage(0);
        } else {
            roadmap = new SavedRoadmap(
                    user,
                    request.getTitle().trim(),
                    request.getTopic().trim(),
                    request.getSkillLevel(),
                    request.getTargetDays(),
                    request.getHoursPerDay(),
                    request.getRoadmapJson()
            );
            roadmap.setGoalId(request.getGoalId());
        }

        syncProgressAndLinkedGoal(roadmap);

        SavedRoadmap saved = roadmapRepository.save(roadmap);
        return new SavedRoadmapResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SavedRoadmapResponse> getUserSavedRoadmaps(String email) {
        return roadmapRepository.findByUserEmailOrderByUpdatedAtDesc(email)
                .stream()
                .map(SavedRoadmapResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SavedRoadmapResponse getSavedRoadmapById(String email, Long id) {
        SavedRoadmap roadmap = roadmapRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));
        return new SavedRoadmapResponse(roadmap);
    }

    @Transactional
    public SavedRoadmapResponse updateProgress(String email, Long id, UpdateRoadmapProgressRequest request) {
        SavedRoadmap roadmap = roadmapRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));

        if (request.getCompletedTasksJson() != null) {
            roadmap.setCompletedTasksJson(request.getCompletedTasksJson());
        }
        if (request.getCompletedMilestonesJson() != null) {
            roadmap.setCompletedMilestonesJson(request.getCompletedMilestonesJson());
        }
        if (request.getProgressPercentage() != null) {
            roadmap.setProgressPercentage(request.getProgressPercentage());
        }

        // Recalculate progress and synchronize to linked goal
        syncProgressAndLinkedGoal(roadmap);

        SavedRoadmap saved = roadmapRepository.save(roadmap);
        return new SavedRoadmapResponse(saved);
    }

    @Transactional
    public SavedRoadmapResponse replaceRoadmap(String email, Long id, ReplaceRoadmapRequest request) {
        SavedRoadmap roadmap = roadmapRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));

        if (request.getRoadmapJson() == null || request.getRoadmapJson().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Roadmap JSON content is required.");
        }

        // Parse candidate roadmap JSON
        RoadmapResponse candidate;
        try {
            candidate = objectMapper.readValue(request.getRoadmapJson(), RoadmapResponse.class);
        } catch (Exception e) {
            throw new RoadmapGenerationException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid roadmap JSON format: " + e.getMessage());
        }

        // Derive target days and daily hours strictly from the stored goal or saved roadmap, NEVER from client body
        int effectiveTargetDays = roadmap.getTargetDays();
        double effectiveHoursPerDay = roadmap.getHoursPerDay();
        String effectiveTopic = roadmap.getTopic();
        String effectiveDescription = "";

        if (roadmap.getGoalId() != null) {
            Goal goal = goalRepository.findById(roadmap.getGoalId()).orElse(null);
            if (goal != null) {
                if (goal.getTargetDays() != null && goal.getTargetDays() > 0) {
                    effectiveTargetDays = goal.getTargetDays();
                }
                if (goal.getHoursPerDay() != null && goal.getHoursPerDay() > 0) {
                    effectiveHoursPerDay = goal.getHoursPerDay();
                }
                if (goal.getTitle() != null && !goal.getTitle().isBlank()) {
                    effectiveTopic = goal.getTitle();
                }
                if (goal.getDescription() != null) {
                    effectiveDescription = goal.getDescription();
                }
            }
        }

        // Run RoadmapValidator server-side structural validation
        RoadmapRequest validationSpec = new RoadmapRequest();
        validationSpec.setTopic(effectiveTopic);
        validationSpec.setDescription(effectiveDescription);
        validationSpec.setTargetDays(effectiveTargetDays);
        validationSpec.setHoursPerDay(effectiveHoursPerDay);

        List<String> validationErrors = roadmapValidator.validate(candidate, validationSpec);
        if (!validationErrors.isEmpty()) {
            throw new RoadmapGenerationException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Replacement roadmap failed server-side validation: " + String.join("; ", validationErrors)
            );
        }

        // Structural validation passed: proceed to swap in single transaction
        roadmap.setRoadmapJson(request.getRoadmapJson());
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            roadmap.setTitle(request.getTitle().trim());
        }
        roadmap.setTargetDays(effectiveTargetDays);
        roadmap.setHoursPerDay(effectiveHoursPerDay);

        // Reset completed tasks and milestones upon regeneration swap
        roadmap.setCompletedTasksJson("[]");
        roadmap.setCompletedMilestonesJson("[]");
        roadmap.setProgressPercentage(0);

        // Sync linked goal progress and status
        syncProgressAndLinkedGoal(roadmap);

        SavedRoadmap saved = roadmapRepository.save(roadmap);
        return new SavedRoadmapResponse(saved);
    }

    @Transactional(readOnly = true)
    public com.aistudyplanner.dto.DayPlanResponse getDayPlan(String userEmail, Long roadmapId, int dayNumber) {
        if (userEmail == null || userEmail.isBlank() || "anonymous".equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        SavedRoadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));

        if (!roadmap.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this roadmap.");
        }

        int targetDays = roadmap.getTargetDays() != null ? roadmap.getTargetDays() : 30;
        if (dayNumber < 1 || dayNumber > targetDays) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Day number " + dayNumber + " is outside roadmap range (1-" + targetDays + ").");
        }

        RoadmapResponse parsedRoadmap;
        try {
            parsedRoadmap = objectMapper.readValue(roadmap.getRoadmapJson(), RoadmapResponse.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse roadmap content.");
        }

        RoadmapResponse.DailyTask foundTask = null;
        int taskPhaseIndex = 0;
        boolean isFinalDay = (dayNumber == targetDays);

        if (parsedRoadmap.getPhases() != null) {
            for (int pIdx = 0; pIdx < parsedRoadmap.getPhases().size(); pIdx++) {
                RoadmapResponse.WeeklyPhase p = parsedRoadmap.getPhases().get(pIdx);
                if (p.getDailyTasks() != null) {
                    for (RoadmapResponse.DailyTask dt : p.getDailyTasks()) {
                        if (dt.getDayNumber() == dayNumber) {
                            foundTask = dt;
                            taskPhaseIndex = pIdx;
                            break;
                        }
                    }
                }
                if (foundTask != null) break;
            }
        }

        if (foundTask == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Day " + dayNumber + " task not found in roadmap.");
        }

        String canonicalTaskId = taskPhaseIndex + "-task-" + dayNumber;
        Set<String> completedIds = parseCompletedTaskIds(roadmap.getCompletedTasksJson());
        boolean isCompleted = completedIds.contains(canonicalTaskId);

        List<RoadmapResponse.DailyTopic> topics = new ArrayList<>();
        if (foundTask.getTopics() != null && !foundTask.getTopics().isEmpty()) {
            for (int tIdx = 0; tIdx < foundTask.getTopics().size(); tIdx++) {
                RoadmapResponse.DailyTopic dt = foundTask.getTopics().get(tIdx);
                String tId = dt.getId() != null && !dt.getId().isBlank() ? dt.getId() : "day-" + dayNumber + "-topic-" + tIdx;
                topics.add(new RoadmapResponse.DailyTopic(tId, dt.getTitle(), dt.getSummary(), dt.getExpanded()));
            }
        } else if (foundTask.getSubtopics() != null && !foundTask.getSubtopics().isEmpty()) {
            for (int sIdx = 0; sIdx < foundTask.getSubtopics().size(); sIdx++) {
                String sub = foundTask.getSubtopics().get(sIdx);
                String tId = "day-" + dayNumber + "-topic-" + sIdx;
                topics.add(new RoadmapResponse.DailyTopic(tId, sub, "Study and practical application of " + sub + ".", false));
            }
        } else {
            topics.add(new RoadmapResponse.DailyTopic("day-" + dayNumber + "-topic-0", foundTask.getTitle(), "Core concepts and foundation for " + foundTask.getTitle() + ".", false));
            topics.add(new RoadmapResponse.DailyTopic("day-" + dayNumber + "-topic-1", "Hands-on Exercise", "Practical implementation and verification.", false));
        }

        int estMinutes = foundTask.getEstimatedMinutes() > 0 ? foundTask.getEstimatedMinutes() : (int) Math.round((roadmap.getHoursPerDay() != null ? roadmap.getHoursPerDay() : 2.0) * 60);
        if (estMinutes <= 0) estMinutes = 120;

        List<com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto> blocks = generateDeterministicBlocks(
                dayNumber,
                estMinutes,
                foundTask.getActivityType(),
                foundTask.getTitle(),
                canonicalTaskId,
                isCompleted,
                isFinalDay,
                topics
        );

        return new com.aistudyplanner.dto.DayPlanResponse(
                dayNumber,
                foundTask.getTitle(),
                foundTask.getDescription(),
                estMinutes,
                foundTask.getActivityType() != null ? foundTask.getActivityType().trim().toUpperCase() : "STUDY",
                topics,
                blocks,
                isCompleted
        );
    }

    public List<com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto> generateDeterministicBlocks(
            int dayNumber,
            int estimatedMinutes,
            String activityType,
            String taskTitle,
            String canonicalTaskId,
            boolean completed,
            boolean isFinalDay,
            List<RoadmapResponse.DailyTopic> topics) {

        String act = activityType != null ? activityType.trim().toUpperCase() : "STUDY";
        List<com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto> blocks = new ArrayList<>();

        boolean isReviewDay = (dayNumber % 10 == 0) || "REVIEW".equals(act);
        boolean isAssessment = "QUIZ".equals(act) || "ASSESSMENT".equals(act);
        boolean isProject = "PROJECT".equals(act) || isFinalDay;

        String topic1 = (topics != null && !topics.isEmpty()) ? topics.get(0).getTitle() : taskTitle;
        String topic2 = (topics != null && topics.size() > 1) ? topics.get(1).getTitle() : "Hands-on Implementation";

        if (isProject) {
            int m1 = (int) Math.round(estimatedMinutes * 0.25);
            int m2 = (int) Math.round(estimatedMinutes * 0.50);
            int m3 = estimatedMinutes - (m1 + m2);

            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-0", "STUDY", "Project Architecture & Requirements", m1, 0, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-1", "CODING_PRACTICE", "Core Feature Development: " + topic1, m2, 1, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-2", "PROJECT", "Integration, Testing & Deployment", m3, 2, completed));
        } else if (isAssessment) {
            int m1 = (int) Math.round(estimatedMinutes * 0.30);
            int m2 = (int) Math.round(estimatedMinutes * 0.50);
            int m3 = estimatedMinutes - (m1 + m2);

            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-0", "STUDY", "Concept Review & Key Principles", m1, 0, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-1", act, "Assessment & Problem Solving", m2, 1, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-2", "REVIEW", "Answer Review & Knowledge Gap Analysis", m3, 2, completed));
        } else if (isReviewDay) {
            int m1 = (int) Math.round(estimatedMinutes * 0.35);
            int m2 = (int) Math.round(estimatedMinutes * 0.40);
            int m3 = estimatedMinutes - (m1 + m2);

            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-0", "STUDY", "Milestone Knowledge Recap", m1, 0, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-1", "PRACTICE", "Spaced Repetition & Exercises", m2, 1, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-2", "REVIEW", "Self-Assessment & Progress Reflection", m3, 2, completed));
        } else if ("CODING_PRACTICE".equals(act)) {
            int m1 = (int) Math.round(estimatedMinutes * 0.30);
            int m2 = (int) Math.round(estimatedMinutes * 0.50);
            int m3 = estimatedMinutes - (m1 + m2);

            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-0", "STUDY", "Syntax & Pattern Analysis: " + topic1, m1, 0, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-1", "CODING_PRACTICE", "Hands-on Implementation: " + topic2, m2, 1, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-2", "PRACTICE", "Edge Cases & Debugging Drills", m3, 2, completed));
        } else {
            int m1 = (int) Math.round(estimatedMinutes * 0.40);
            int m2 = (int) Math.round(estimatedMinutes * 0.40);
            int m3 = estimatedMinutes - (m1 + m2);

            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-0", "STUDY", "Core Theory & Concept: " + topic1, m1, 0, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-1", "PRACTICE", "Guided Practice & Application: " + topic2, m2, 1, completed));
            blocks.add(new com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto(canonicalTaskId + "-block-2", "QUIZ", "Knowledge Verification & Summary", m3, 2, completed));
        }

        // Exact sum invariant check: adjust largest block for any rounding difference
        int sum = blocks.stream().mapToInt(com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto::getMinutes).sum();
        if (sum != estimatedMinutes && !blocks.isEmpty()) {
            com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto largest = blocks.get(0);
            for (com.aistudyplanner.dto.DayPlanResponse.TimeBlockDto b : blocks) {
                if (b.getMinutes() > largest.getMinutes()) {
                    largest = b;
                }
            }
            largest.setMinutes(largest.getMinutes() + (estimatedMinutes - sum));
        }

        return blocks;
    }

    public record ProgressCalculation(int completedTasks, int totalTasks, int percentage) {}

    /**
     * Single canonical progress computation from roadmap JSON and completed tasks JSON.
     * Evaluates strictly canonical task IDs.
     */
    public ProgressCalculation calculateProgress(String roadmapJson, String completedTasksJson) {
        if (roadmapJson == null || roadmapJson.isBlank()) {
            return new ProgressCalculation(0, 0, 0);
        }
        Set<String> validTaskIds = extractValidTaskIds(roadmapJson);
        int totalTasks = validTaskIds.size();
        Set<String> completedIds = parseCompletedTaskIds(completedTasksJson);
        int validCompletedCount = (int) completedIds.stream().filter(validTaskIds::contains).count();
        int progress = totalTasks > 0
                ? Math.min(100, Math.max(0, (int) Math.round(((double) validCompletedCount / (double) totalTasks) * 100.0)))
                : 0;
        return new ProgressCalculation(validCompletedCount, totalTasks, progress);
    }

    /**
     * Recomputes roadmap progress percentage from valid task completions and syncs the linked goal.
     */
    public void syncProgressAndLinkedGoal(SavedRoadmap roadmap) {
        if (roadmap == null || roadmap.getRoadmapJson() == null || roadmap.getRoadmapJson().isBlank()) {
            return;
        }

        ProgressCalculation calc = calculateProgress(roadmap.getRoadmapJson(), roadmap.getCompletedTasksJson());
        int totalTasks = calc.totalTasks();
        int validCompletedCount = calc.completedTasks();
        int progress;
        if (totalTasks > 0) {
            progress = calc.percentage();
            roadmap.setProgressPercentage(progress);
        } else if (roadmap.getGoalId() != null) {
            progress = 0;
            roadmap.setProgressPercentage(0);
        } else {
            progress = roadmap.getProgressPercentage() != null ? roadmap.getProgressPercentage() : 0;
        }

        if (roadmap.getGoalId() != null) {
            final int finalProgress = progress;
            final int completedCount = validCompletedCount;
            goalRepository.findById(roadmap.getGoalId()).ifPresent(goal -> {
                goal.setProgressPercentage(finalProgress);
                if (completedCount == 0) {
                    goal.setStatus(GoalStatus.NOT_STARTED);
                } else if (completedCount >= totalTasks && totalTasks > 0) {
                    goal.setStatus(GoalStatus.COMPLETED);
                } else {
                    goal.setStatus(GoalStatus.IN_PROGRESS);
                }
                goalRepository.save(goal);
            });
        }
    }

    public Set<String> extractValidTaskIds(String roadmapJson) {
        Set<String> taskIds = new LinkedHashSet<>();
        if (roadmapJson == null || roadmapJson.isBlank()) {
            return taskIds;
        }
        try {
            JsonNode root = objectMapper.readTree(roadmapJson);
            JsonNode phasesNode = root.get("phases");
            if (phasesNode != null && phasesNode.isArray()) {
                int pIdx = 0;
                for (JsonNode phaseNode : phasesNode) {
                    JsonNode dailyTasksNode = phaseNode.get("dailyTasks");
                    if (dailyTasksNode != null && dailyTasksNode.isArray()) {
                        java.util.Map<String, Integer> suffixCounts = new java.util.HashMap<>();
                        int tIdx = 0;
                        for (JsonNode taskNode : dailyTasksNode) {
                            taskIds.add(getCanonicalTaskId(pIdx, taskNode, tIdx, suffixCounts));
                            tIdx++;
                        }
                    }
                    pIdx++;
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse roadmap JSON to extract task IDs: {}", e.getMessage());
        }
        return taskIds;
    }

    public static String getCanonicalTaskId(int pIdx, JsonNode taskNode, int tIdx) {
        return getCanonicalTaskId(pIdx, taskNode, tIdx, null);
    }

    public static String getCanonicalTaskId(int pIdx, JsonNode taskNode, int tIdx, java.util.Map<String, Integer> suffixCounts) {
        if (taskNode != null && taskNode.hasNonNull("id")) {
            return taskNode.get("id").asText();
        }
        String baseSuffix;
        if (taskNode != null && taskNode.hasNonNull("dayNumber")) {
            baseSuffix = String.valueOf(taskNode.get("dayNumber").asInt());
        } else {
            baseSuffix = String.valueOf(tIdx);
        }

        String baseKey = pIdx + "-task-" + baseSuffix;
        if (suffixCounts == null) {
            return baseKey;
        }

        int count = suffixCounts.getOrDefault(baseKey, 0);
        suffixCounts.put(baseKey, count + 1);

        if (count == 0) {
            return baseKey;
        } else {
            char suffixChar = (char) ('a' + count);
            return baseKey + "-" + suffixChar;
        }
    }

    public Set<String> parseCompletedTaskIds(String completedTasksJson) {
        Set<String> completed = new LinkedHashSet<>();
        if (completedTasksJson == null || completedTasksJson.isBlank()) {
            return completed;
        }
        try {
            JsonNode node = objectMapper.readTree(completedTasksJson);
            if (node.isArray()) {
                for (JsonNode item : node) {
                    if (item.isTextual()) {
                        completed.add(item.asText());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse completed tasks JSON: {}", e.getMessage());
        }
        return completed;
    }

    @Transactional
    public int backfillAllRoadmapLinkedGoals() {
        List<SavedRoadmap> roadmaps = roadmapRepository.findAll();
        int updatedCount = 0;
        for (SavedRoadmap roadmap : roadmaps) {
            if (roadmap.getGoalId() != null) {
                syncProgressAndLinkedGoal(roadmap);
                roadmapRepository.save(roadmap);
                updatedCount++;
            }
        }
        return updatedCount;
    }

    @Transactional
    public void deleteSavedRoadmap(String email, Long id) {
        SavedRoadmap roadmap = roadmapRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));
        roadmapRepository.delete(roadmap);
    }

    @Transactional(readOnly = true)
    public long countSavedRoadmaps(String email) {
        return roadmapRepository.countByUserEmail(email);
    }
}
