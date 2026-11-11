package com.aistudyplanner.service;

import com.aistudyplanner.dto.NeedsAttentionItem;
import com.aistudyplanner.dto.ProgressOverviewResponse;
import com.aistudyplanner.dto.WeeklyReviewResponse;
import com.aistudyplanner.entity.*;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudentProfileRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.TaskFeedbackRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

    @Mock
    private StudySessionRepository studySessionRepository;
    @Mock
    private SavedRoadmapRepository savedRoadmapRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private TaskFeedbackRepository taskFeedbackRepository;
    @Mock
    private TaskFeedbackService taskFeedbackService;
    @Mock
    private UserRepository userRepository;

    private ScheduleStatusService scheduleStatusService;
    private ProgressService progressService;
    private ObjectMapper objectMapper;
    private User testUser;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        scheduleStatusService = new ScheduleStatusService(objectMapper);
        progressService = new ProgressService(
                studySessionRepository,
                savedRoadmapRepository,
                studentProfileRepository,
                taskFeedbackRepository,
                taskFeedbackService,
                scheduleStatusService,
                userRepository,
                objectMapper
        );

        testUser = new User();
        testUser.setId(10L);
        testUser.setEmail("student@test.com");
    }

    @Test
    void testGetOverviewWithSessionsAndStreak() {
        LocalDateTime now = LocalDateTime.now();
        List<StudySession> sessions = new ArrayList<>();
        // Today session: 30 min focus -> counts for streak
        StudySession s1 = new StudySession(testUser, 1L, 1L, "task_1", now.minusMinutes(40), now.minusMinutes(10), 1800, SessionType.FOCUS, true);
        // Yesterday session: 25 min focus -> streak = 2
        StudySession s2 = new StudySession(testUser, 1L, 1L, "task_2", now.minusDays(1), now.minusDays(1).plusMinutes(25), 1500, SessionType.FOCUS, true);
        // Break session (should not count for streak or study minutes)
        StudySession s3 = new StudySession(testUser, 1L, 1L, "task_2", now.minusMinutes(5), now, 300, SessionType.BREAK, false);
        sessions.add(s1);
        sessions.add(s2);
        sessions.add(s3);

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(testUser));
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(10L)).thenReturn(sessions);

        SavedRoadmap roadmap = new SavedRoadmap();
        roadmap.setId(1L);
        roadmap.setUser(testUser);
        roadmap.setCreatedAt(now.minusDays(3));
        roadmap.setCompletedTasksJson("[\"0-task-1\"]");
        roadmap.setRoadmapJson("{\"phases\":[{\"phaseTitle\":\"Basics\",\"dailyTasks\":[{\"dayNumber\":1,\"title\":\"Task 1\"},{\"dayNumber\":2,\"title\":\"Task 2\"}]}]}");
        when(savedRoadmapRepository.findByUserEmailOrderByUpdatedAtDesc("student@test.com")).thenReturn(List.of(roadmap));

        StudentProfile profile = new StudentProfile();
        profile.setAvailableDaysPerWeek(5);
        when(studentProfileRepository.findByUserId(10L)).thenReturn(Optional.of(profile));
        when(taskFeedbackService.computeNeedsAttention(any(User.class), any(SavedRoadmap.class))).thenReturn(Collections.emptyList());

        ProgressOverviewResponse overview = progressService.getOverview("student@test.com", "UTC");

        assertNotNull(overview);
        assertEquals(14, overview.getStudyHistory14Days().size());
        assertEquals(2, overview.getCurrentStreakDays());
        assertEquals(1, overview.getPhaseProgress().size());
        assertEquals(1, overview.getPhaseProgress().get(0).getCompletedTasks());
        assertEquals(2, overview.getPhaseProgress().get(0).getTotalTasks());
        assertEquals(50, overview.getPhaseProgress().get(0).getProgressPercentage());
    }

    @Test
    void testGetWeeklyReviewBehindSuggestions() {
        LocalDateTime now = LocalDateTime.now();
        // Roadmap created 20 days ago, 0 completed tasks -> behind by 14 days
        SavedRoadmap roadmap = new SavedRoadmap();
        roadmap.setId(1L);
        roadmap.setUser(testUser);
        roadmap.setCreatedAt(now.minusDays(20));
        roadmap.setCompletedTasksJson("[]");
        roadmap.setRoadmapJson("{\"targetDays\":30,\"hoursPerDay\":2.0,\"phases\":[]}");

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(testUser));
        when(savedRoadmapRepository.findByUserEmailOrderByUpdatedAtDesc("student@test.com")).thenReturn(List.of(roadmap));
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(10L)).thenReturn(Collections.emptyList());
        when(studentProfileRepository.findByUserId(10L)).thenReturn(Optional.empty());
        when(taskFeedbackRepository.findByUserIdAndRoadmapId(10L, 1L)).thenReturn(Collections.emptyList());

        WeeklyReviewResponse review = progressService.getWeeklyReview("student@test.com", "UTC");

        assertNotNull(review);
        assertEquals("BEHIND", review.getScheduleStatus().getStatus());
        assertTrue(review.getSuggestions().size() >= 2);
    }
}
