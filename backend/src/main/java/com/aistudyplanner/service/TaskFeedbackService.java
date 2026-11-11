package com.aistudyplanner.service;

import com.aistudyplanner.dto.NeedsAttentionItem;
import com.aistudyplanner.dto.TaskFeedbackRequest;
import com.aistudyplanner.dto.TaskFeedbackResponse;
import com.aistudyplanner.entity.*;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.TaskFeedbackRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class TaskFeedbackService {

    private final TaskFeedbackRepository feedbackRepository;
    private final SavedRoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final StudySessionRepository studySessionRepository;
    private final ObjectMapper objectMapper;

    public TaskFeedbackService(TaskFeedbackRepository feedbackRepository,
                               SavedRoadmapRepository roadmapRepository,
                               UserRepository userRepository,
                               StudySessionRepository studySessionRepository,
                               ObjectMapper objectMapper) {
        this.feedbackRepository = feedbackRepository;
        this.roadmapRepository = roadmapRepository;
        this.userRepository = userRepository;
        this.studySessionRepository = studySessionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public TaskFeedbackResponse saveFeedback(String userEmail, Long roadmapId, String taskId, TaskFeedbackRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        SavedRoadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found"));

        if (!roadmap.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found");
        }

        Set<String> canonicalTaskIds = extractCanonicalTaskIds(roadmap);
        if (!canonicalTaskIds.contains(taskId)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Task ID does not exist in roadmap");
        }

        TaskFeedback feedback = feedbackRepository.findByUserIdAndRoadmapIdAndTaskId(user.getId(), roadmapId, taskId)
                .orElseGet(() -> new TaskFeedback(user, roadmap, taskId, request.getRating()));

        feedback.setRating(request.getRating());
        TaskFeedback saved = feedbackRepository.save(feedback);

        return new TaskFeedbackResponse(saved.getId(), roadmapId, taskId, saved.getRating(), saved.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public List<NeedsAttentionItem> computeNeedsAttention(User user, SavedRoadmap roadmap) {
        List<NeedsAttentionItem> items = new ArrayList<>();
        if (user == null || roadmap == null || roadmap.getRoadmapJson() == null || roadmap.getRoadmapJson().isBlank()) {
            return items;
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(roadmap.getRoadmapJson());
        } catch (Exception e) {
            return items;
        }

        JsonNode phasesNode = root.get("phases");
        if (phasesNode == null || !phasesNode.isArray()) {
            return items;
        }

        Set<String> completedTaskIds = parseCompletedTaskIds(roadmap.getCompletedTasksJson());
        List<TaskFeedback> allFeedback = feedbackRepository.findByUserIdAndRoadmapId(user.getId(), roadmap.getId());
        Map<String, TaskFeedbackRating> feedbackMap = new HashMap<>();
        for (TaskFeedback fb : allFeedback) {
            feedbackMap.put(fb.getTaskId(), fb.getRating());
        }

        List<StudySession> allSessions = studySessionRepository.findByUserIdOrderByStartedAtDesc(user.getId());
        Map<String, Long> taskFocusSeconds = new HashMap<>();
        Map<String, Integer> taskSessionCount = new HashMap<>();
        for (StudySession s : allSessions) {
            if (s.getSessionType() == SessionType.FOCUS && s.getTaskId() != null && !s.getTaskId().isBlank()) {
                taskFocusSeconds.merge(s.getTaskId(), (long) s.getDurationSeconds(), Long::sum);
                taskSessionCount.merge(s.getTaskId(), 1, Integer::sum);
            }
        }

        String roadmapTitle = roadmap.getTopic() != null ? roadmap.getTopic() : roadmap.getTitle();

        int pIdx = 0;
        for (JsonNode phaseNode : phasesNode) {
            String phaseTitle = phaseNode.hasNonNull("phaseTitle") ? phaseNode.get("phaseTitle").asText() : "Phase " + (pIdx + 1);
            JsonNode dailyTasksNode = phaseNode.get("dailyTasks");

            int completedInPhaseCount = 0;
            int hardCountInPhase = 0;
            Map<String, Integer> suffixCounts = new HashMap<>();

            if (dailyTasksNode != null && dailyTasksNode.isArray()) {
                int tIdx = 0;
                for (JsonNode taskNode : dailyTasksNode) {
                    String canonicalTaskId = SavedRoadmapService.getCanonicalTaskId(pIdx, taskNode, tIdx, suffixCounts);
                    boolean isCompleted = completedTaskIds.contains(canonicalTaskId);

                    if (isCompleted) {
                        completedInPhaseCount++;
                        TaskFeedbackRating rating = feedbackMap.get(canonicalTaskId);
                        if (rating == TaskFeedbackRating.HARD) {
                            hardCountInPhase++;
                        }
                    }

                    // Task Flag: logged FOCUS minutes > 1.5 * estimatedMinutes, with at least 1 session
                    int sessionsForTask = taskSessionCount.getOrDefault(canonicalTaskId, 0);
                    if (sessionsForTask > 0) {
                        long loggedSeconds = taskFocusSeconds.getOrDefault(canonicalTaskId, 0L);
                        double loggedMinutes = loggedSeconds / 60.0;
                        int estimatedMinutes = taskNode.hasNonNull("estimatedMinutes") ? taskNode.get("estimatedMinutes").asInt() : 90;
                        if (estimatedMinutes <= 0) estimatedMinutes = 90;
                        double threshold = 1.5 * estimatedMinutes;

                        if (loggedMinutes > threshold) {
                            long loggedMinutesRounded = Math.round(loggedMinutes);
                            String taskTitle = taskNode.hasNonNull("title") ? taskNode.get("title").asText() : canonicalTaskId;
                            String reason = String.format("%d minutes logged in focus sessions vs %d minutes estimated (exceeded by %.1fx)",
                                    loggedMinutesRounded, estimatedMinutes, (loggedMinutes / estimatedMinutes));
                            items.add(NeedsAttentionItem.forTask(roadmap.getId(), roadmapTitle, pIdx, phaseTitle,
                                    canonicalTaskId, taskTitle, reason));
                        }
                    }
                    tIdx++;
                }
            }

            // Phase Flag: 2 or more HARD ratings among currently completed tasks of same phase
            if (hardCountInPhase >= 2) {
                String reason = String.format("%d of %d completed tasks in this phase were rated Hard",
                        hardCountInPhase, completedInPhaseCount);
                items.add(NeedsAttentionItem.forPhase(roadmap.getId(), roadmapTitle, pIdx, phaseTitle, reason));
            }
            pIdx++;
        }

        return items;
    }

    public Set<String> extractCanonicalTaskIds(SavedRoadmap roadmap) {
        Set<String> taskIds = new LinkedHashSet<>();
        if (roadmap == null || roadmap.getRoadmapJson() == null || roadmap.getRoadmapJson().isBlank()) {
            return taskIds;
        }
        try {
            JsonNode root = objectMapper.readTree(roadmap.getRoadmapJson());
            JsonNode phasesNode = root.get("phases");
            if (phasesNode != null && phasesNode.isArray()) {
                int pIdx = 0;
                for (JsonNode phaseNode : phasesNode) {
                    JsonNode dailyTasksNode = phaseNode.get("dailyTasks");
                    if (dailyTasksNode != null && dailyTasksNode.isArray()) {
                        Map<String, Integer> suffixCounts = new HashMap<>();
                        int tIdx = 0;
                        for (JsonNode taskNode : dailyTasksNode) {
                            taskIds.add(SavedRoadmapService.getCanonicalTaskId(pIdx, taskNode, tIdx, suffixCounts));
                            tIdx++;
                        }
                    }
                    pIdx++;
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return taskIds;
    }

    private Set<String> parseCompletedTaskIds(String completedTasksJson) {
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
            // ignore
        }
        return completed;
    }
}
