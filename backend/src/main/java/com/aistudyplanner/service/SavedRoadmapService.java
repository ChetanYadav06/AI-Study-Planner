package com.aistudyplanner.service;

import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.dto.SavedRoadmapResponse;
import com.aistudyplanner.dto.UpdateRoadmapProgressRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
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

    public SavedRoadmapService(SavedRoadmapRepository roadmapRepository,
                               UserRepository userRepository,
                               GoalRepository goalRepository,
                               ObjectMapper objectMapper) {
        this.roadmapRepository = roadmapRepository;
        this.userRepository = userRepository;
        this.goalRepository = goalRepository;
        this.objectMapper = objectMapper;
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student user account not found."));
    }

    @Transactional
    public SavedRoadmapResponse saveRoadmap(String email, SaveRoadmapRequest request) {
        User user = getAuthenticatedUser(email);

        SavedRoadmap roadmap = new SavedRoadmap(
                user,
                request.getTitle().trim(),
                request.getTopic().trim(),
                request.getSkillLevel(),
                request.getTargetDays(),
                request.getHoursPerDay(),
                request.getRoadmapJson()
        );
        roadmap.setGoalId(request.getGoalId());

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

    /**
     * Recomputes roadmap progress percentage from valid task completions and syncs the linked goal.
     */
    public void syncProgressAndLinkedGoal(SavedRoadmap roadmap) {
        if (roadmap == null || roadmap.getRoadmapJson() == null || roadmap.getRoadmapJson().isBlank()) {
            return;
        }

        Set<String> validTaskIds = extractValidTaskIds(roadmap.getRoadmapJson());
        int totalTasks = validTaskIds.size();

        Set<String> completedIds = parseCompletedTaskIds(roadmap.getCompletedTasksJson());
        long validCompletedCount = completedIds.stream().filter(validTaskIds::contains).count();

        int progress;
        if (totalTasks > 0) {
            progress = (int) Math.round(((double) validCompletedCount / (double) totalTasks) * 100.0);
            progress = Math.min(100, Math.max(0, progress));
            roadmap.setProgressPercentage(progress);
        } else if (roadmap.getGoalId() != null) {
            progress = 0;
            roadmap.setProgressPercentage(0);
        } else {
            progress = roadmap.getProgressPercentage() != null ? roadmap.getProgressPercentage() : 0;
        }

        if (roadmap.getGoalId() != null) {
            final int finalProgress = progress;
            final long completedCount = validCompletedCount;
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
