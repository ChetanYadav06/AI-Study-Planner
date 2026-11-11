package com.aistudyplanner.service;

import com.aistudyplanner.dto.NeedsAttentionItem;
import com.aistudyplanner.dto.ProgressOverviewResponse;
import com.aistudyplanner.dto.ProgressOverviewResponse.DailyStudyMinutes;
import com.aistudyplanner.dto.ProgressOverviewResponse.PhaseProgressItem;
import com.aistudyplanner.dto.ProgressOverviewResponse.ScheduleStatusDto;
import com.aistudyplanner.dto.WeeklyReviewResponse;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.SessionType;
import com.aistudyplanner.entity.StudentProfile;
import com.aistudyplanner.entity.StudySession;
import com.aistudyplanner.entity.TaskFeedback;
import com.aistudyplanner.entity.TaskFeedbackRating;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudentProfileRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.TaskFeedbackRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class ProgressService {

    private final StudySessionRepository studySessionRepository;
    private final SavedRoadmapRepository savedRoadmapRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TaskFeedbackRepository taskFeedbackRepository;
    private final TaskFeedbackService taskFeedbackService;
    private final ScheduleStatusService scheduleStatusService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ProgressService(StudySessionRepository studySessionRepository,
                           SavedRoadmapRepository savedRoadmapRepository,
                           StudentProfileRepository studentProfileRepository,
                           TaskFeedbackRepository taskFeedbackRepository,
                           TaskFeedbackService taskFeedbackService,
                           ScheduleStatusService scheduleStatusService,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.studySessionRepository = studySessionRepository;
        this.savedRoadmapRepository = savedRoadmapRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.taskFeedbackRepository = taskFeedbackRepository;
        this.taskFeedbackService = taskFeedbackService;
        this.scheduleStatusService = scheduleStatusService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public ZoneId parseZoneId(String tz) {
        if (tz == null || tz.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneOffset.UTC;
        }
    }

    public ProgressOverviewResponse getOverview(String userEmail, String tz) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        ZoneId zone = parseZoneId(tz);
        LocalDate today = LocalDate.now(zone);

        List<StudySession> sessions = studySessionRepository.findByUserIdOrderByStartedAtDesc(user.getId());

        // 14-day history: from today - 13 days to today
        Map<LocalDate, Integer> dailyMinutesMap = new HashMap<>();
        for (int i = 0; i < 14; i++) {
            dailyMinutesMap.put(today.minusDays(i), 0);
        }

        // Only count FOCUS sessions for study minutes
        for (StudySession s : sessions) {
            if (s.getSessionType() == SessionType.FOCUS && s.getStartedAt() != null && s.getDurationSeconds() != null) {
                LocalDate sessionDate = s.getStartedAt().atZone(ZoneOffset.UTC).withZoneSameInstant(zone).toLocalDate();
                if (dailyMinutesMap.containsKey(sessionDate)) {
                    dailyMinutesMap.put(sessionDate, dailyMinutesMap.get(sessionDate) + (s.getDurationSeconds() / 60));
                }
            }
        }

        List<DailyStudyMinutes> history14Days = new ArrayList<>();
        DateTimeFormatter isoDate = DateTimeFormatter.ISO_LOCAL_DATE;
        for (int i = 13; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            history14Days.add(new DailyStudyMinutes(d.format(isoDate), dailyMinutesMap.getOrDefault(d, 0)));
        }

        // Current streak calculation: consecutive days with >= 20 FOCUS study minutes
        int streak = 0;
        int todayMin = dailyMinutesMap.getOrDefault(today, 0);
        LocalDate checkDate = today;
        if (todayMin < 20) {
            checkDate = today.minusDays(1);
        }
        while (true) {
            final LocalDate curDate = checkDate;
            int dayFocusMin = sessions.stream()
                    .filter(s -> s.getSessionType() == SessionType.FOCUS && s.getStartedAt() != null && s.getDurationSeconds() != null)
                    .filter(s -> s.getStartedAt().atZone(ZoneOffset.UTC).withZoneSameInstant(zone).toLocalDate().equals(curDate))
                    .mapToInt(s -> s.getDurationSeconds() / 60)
                    .sum();
            if (dayFocusMin >= 20) {
                streak++;
                checkDate = checkDate.minusDays(1);
            } else {
                break;
            }
        }

        // Active roadmap details
        List<SavedRoadmap> roadmaps = savedRoadmapRepository.findByUserEmailOrderByUpdatedAtDesc(user.getEmail());
        SavedRoadmap primaryRoadmap = roadmaps.isEmpty() ? null : roadmaps.get(0);

        List<PhaseProgressItem> phaseProgress = new ArrayList<>();
        List<NeedsAttentionItem> needsAttention = new ArrayList<>();
        ScheduleStatusDto scheduleStatus = new ScheduleStatusDto("ON_TRACK", "On Track", "No active roadmap to track", 0, 0, 0);

        int availableDays = studentProfileRepository.findByUserId(user.getId())
                .map(StudentProfile::getAvailableDaysPerWeek)
                .orElse(5);

        if (primaryRoadmap != null) {
            scheduleStatus = scheduleStatusService.computeScheduleStatus(primaryRoadmap, availableDays);
            needsAttention = taskFeedbackService.computeNeedsAttention(user, primaryRoadmap);

            // Phase progress breakdown
            Set<String> completedSet = new HashSet<>();
            if (primaryRoadmap.getCompletedTasksJson() != null && !primaryRoadmap.getCompletedTasksJson().isBlank()) {
                try {
                    JsonNode arr = objectMapper.readTree(primaryRoadmap.getCompletedTasksJson());
                    if (arr.isArray()) {
                        for (JsonNode n : arr) completedSet.add(n.asText());
                    }
                } catch (Exception ignored) {}
            }

            try {
                JsonNode root = objectMapper.readTree(primaryRoadmap.getRoadmapJson());
                JsonNode phases = root.path("phases");
                if (phases.isArray()) {
                    for (int pIdx = 0; pIdx < phases.size(); pIdx++) {
                        JsonNode phase = phases.get(pIdx);
                        String title = phase.path("phaseTitle").asText("Phase " + (pIdx + 1));
                        JsonNode dailyTasks = phase.path("dailyTasks");
                        int total = 0;
                        int completed = 0;
                        if (dailyTasks.isArray()) {
                            total = dailyTasks.size();
                            Map<String, Integer> suffixCounts = new HashMap<>();
                            for (int tIdx = 0; tIdx < dailyTasks.size(); tIdx++) {
                                JsonNode taskNode = dailyTasks.get(tIdx);
                                String taskId = SavedRoadmapService.getCanonicalTaskId(pIdx, taskNode, tIdx, suffixCounts);
                                if (completedSet.contains(taskId)) {
                                    completed++;
                                }
                            }
                        }
                        int pct = total > 0 ? (int) Math.round((completed * 100.0) / total) : 0;
                        phaseProgress.add(new PhaseProgressItem(pIdx, title, completed, total, pct));
                    }
                }
            } catch (Exception ignored) {}
        }

        return new ProgressOverviewResponse(history14Days, streak, phaseProgress, needsAttention, scheduleStatus);
    }

    public WeeklyReviewResponse getWeeklyReview(String userEmail, String tz) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        ZoneId zone = parseZoneId(tz);
        LocalDate today = LocalDate.now(zone);
        LocalDate weekStart = today.minusDays(6); // last 7 days inclusive

        List<StudySession> sessions = studySessionRepository.findByUserIdOrderByStartedAtDesc(user.getId());

        int studySecondsLast7Days = 0;
        for (StudySession s : sessions) {
            if (s.getSessionType() == SessionType.FOCUS && s.getStartedAt() != null && s.getDurationSeconds() != null) {
                LocalDate d = s.getStartedAt().atZone(ZoneOffset.UTC).withZoneSameInstant(zone).toLocalDate();
                if (!d.isBefore(weekStart) && !d.isAfter(today)) {
                    studySecondsLast7Days += s.getDurationSeconds();
                }
            }
        }
        double hoursStudied = Math.round((studySecondsLast7Days / 3600.0) * 10.0) / 10.0;

        List<SavedRoadmap> roadmaps = savedRoadmapRepository.findByUserEmailOrderByUpdatedAtDesc(user.getEmail());
        SavedRoadmap primaryRoadmap = roadmaps.isEmpty() ? null : roadmaps.get(0);

        int availableDays = studentProfileRepository.findByUserId(user.getId())
                .map(StudentProfile::getAvailableDaysPerWeek)
                .orElse(5);

        ScheduleStatusDto statusDto = primaryRoadmap != null
                ? scheduleStatusService.computeScheduleStatus(primaryRoadmap, availableDays)
                : new ScheduleStatusDto("ON_TRACK", "On Track", "No active roadmap to track", 0, 0, 0);

        int completedTasksCount = 0;
        double hoursPlanned = 0.0;
        List<String> hardestTasks = new ArrayList<>();
        List<String> hardestPhases = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        if (primaryRoadmap != null) {
            // Count completed tasks in roadmap
            if (primaryRoadmap.getCompletedTasksJson() != null && !primaryRoadmap.getCompletedTasksJson().isBlank()) {
                try {
                    JsonNode arr = objectMapper.readTree(primaryRoadmap.getCompletedTasksJson());
                    if (arr.isArray()) {
                        completedTasksCount = arr.size();
                    }
                } catch (Exception ignored) {}
            }

            // Calculate planned study hours per week
            try {
                JsonNode root = objectMapper.readTree(primaryRoadmap.getRoadmapJson());
                double dailyHours = root.path("hoursPerDay").asDouble(2.0);
                hoursPlanned = Math.round(availableDays * dailyHours * 10.0) / 10.0;
            } catch (Exception e) {
                hoursPlanned = availableDays * 2.0;
            }

            // Identify hardest tasks and phases from TaskFeedback
            List<TaskFeedback> feedbacks = taskFeedbackRepository.findByUserIdAndRoadmapId(user.getId(), primaryRoadmap.getId());
            Set<String> hardTaskIds = new HashSet<>();
            for (TaskFeedback fb : feedbacks) {
                if (fb.getRating() == TaskFeedbackRating.HARD) {
                    hardTaskIds.add(fb.getTaskId());
                }
            }

            if (!hardTaskIds.isEmpty()) {
                try {
                    JsonNode root = objectMapper.readTree(primaryRoadmap.getRoadmapJson());
                    JsonNode phases = root.path("phases");
                    if (phases.isArray()) {
                        for (int pIdx = 0; pIdx < phases.size(); pIdx++) {
                            JsonNode phase = phases.get(pIdx);
                            String phaseTitle = phase.path("phaseTitle").asText("Phase " + (pIdx + 1));
                            int phaseHardCount = 0;
                            JsonNode tasks = phase.path("dailyTasks");
                            if (tasks.isArray()) {
                                Map<String, Integer> suffixCounts = new HashMap<>();
                                for (int tIdx = 0; tIdx < tasks.size(); tIdx++) {
                                    JsonNode tNode = tasks.get(tIdx);
                                    String taskId = SavedRoadmapService.getCanonicalTaskId(pIdx, tNode, tIdx, suffixCounts);
                                    if (hardTaskIds.contains(taskId)) {
                                        phaseHardCount++;
                                        String taskTitle = tNode.path("title").asText(taskId);
                                        if (!hardestTasks.contains(taskTitle) && hardestTasks.size() < 5) {
                                            hardestTasks.add(taskTitle);
                                        }
                                    }
                                }
                            }
                            if (phaseHardCount > 0 && !hardestPhases.contains(phaseTitle)) {
                                hardestPhases.add(phaseTitle + " (" + phaseHardCount + " hard tasks)");
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            // Computed suggestions if behind by >= 3 study days
            if (statusDto.getDelta() <= -3) {
                int behind = Math.abs(statusDto.getDelta());
                suggestions.add("You are " + behind + " study days behind schedule.");
                suggestions.add("Consider reducing daily study scope or scheduling a dedicated catch-up block this weekend.");
                suggestions.add("Break down multi-part tasks into smaller 30-minute focus sessions to regain momentum.");
            }
        }

        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE;
        return new WeeklyReviewResponse(
                weekStart.format(iso),
                today.format(iso),
                completedTasksCount,
                hoursStudied,
                hoursPlanned,
                hardestTasks,
                hardestPhases,
                statusDto,
                suggestions
        );
    }
}
