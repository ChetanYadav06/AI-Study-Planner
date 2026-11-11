package com.aistudyplanner.service;

import com.aistudyplanner.dto.NeedsAttentionItem;
import com.aistudyplanner.dto.TaskFeedbackRequest;
import com.aistudyplanner.entity.*;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.TaskFeedbackRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskFeedbackServiceTest {

    @Mock
    private TaskFeedbackRepository feedbackRepository;
    @Mock
    private SavedRoadmapRepository roadmapRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StudySessionRepository studySessionRepository;

    private TaskFeedbackService feedbackService;
    private ObjectMapper objectMapper;

    private User userA;
    private User userB;
    private SavedRoadmap roadmapA;

    private static final String ROADMAP_JSON = """
        {
          "topic": "Python Fundamentals",
          "phases": [
            {
              "phaseTitle": "Phase 1: Basics",
              "dailyTasks": [
                { "title": "Variables", "dayNumber": 1, "estimatedMinutes": 60 },
                { "title": "Conditionals", "dayNumber": 2, "estimatedMinutes": 60 },
                { "title": "Loops", "dayNumber": 3, "estimatedMinutes": 60 }
              ]
            }
          ]
        }
        """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        feedbackService = new TaskFeedbackService(feedbackRepository, roadmapRepository, userRepository, studySessionRepository, objectMapper);

        userA = new User("User A", "usera@example.com", "pass123");
        userA.setId(1L);

        userB = new User("User B", "userb@example.com", "pass123");
        userB.setId(2L);

        roadmapA = new SavedRoadmap(userA, "Python Roadmap", "Python Fundamentals", SkillLevel.BEGINNER, 30, 2.0, ROADMAP_JSON);
        roadmapA.setId(10L);
    }

    @Test
    @DisplayName("Should successfully upsert task feedback for owner")
    void testSaveFeedbackSuccess() {
        when(userRepository.findByEmail("usera@example.com")).thenReturn(Optional.of(userA));
        when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmapA));
        when(feedbackRepository.findByUserIdAndRoadmapIdAndTaskId(1L, 10L, "0-task-1")).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(TaskFeedback.class))).thenAnswer(i -> {
            TaskFeedback fb = i.getArgument(0);
            fb.setId(100L);
            fb.setUpdatedAt(LocalDateTime.now());
            return fb;
        });

        var resp = feedbackService.saveFeedback("usera@example.com", 10L, "0-task-1", new TaskFeedbackRequest(TaskFeedbackRating.HARD));

        assertNotNull(resp);
        assertEquals("0-task-1", resp.getTaskId());
        assertEquals(TaskFeedbackRating.HARD, resp.getRating());
        verify(feedbackRepository).save(any(TaskFeedback.class));
    }

    @Test
    @DisplayName("Should reject feedback if user does not own roadmap (user isolation)")
    void testUserIsolationRejectFeedback() {
        when(userRepository.findByEmail("userb@example.com")).thenReturn(Optional.of(userB));
        when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmapA)); // owned by userA

        assertThrows(ResponseStatusException.class, () ->
                feedbackService.saveFeedback("userb@example.com", 10L, "0-task-1", new TaskFeedbackRequest(TaskFeedbackRating.EASY))
        );
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should reject feedback if task ID is invalid / does not exist in roadmap")
    void testInvalidTaskId() {
        when(userRepository.findByEmail("usera@example.com")).thenReturn(Optional.of(userA));
        when(roadmapRepository.findById(10L)).thenReturn(Optional.of(roadmapA));

        assertThrows(ResponseStatusException.class, () ->
                feedbackService.saveFeedback("usera@example.com", 10L, "non-existent-task-99", new TaskFeedbackRequest(TaskFeedbackRating.OK))
        );
    }

    @Test
    @DisplayName("Boundary test: 1 Hard rating does NOT trigger Phase flag; 2 Hard ratings trigger Phase flag")
    void testPhaseFlagThreshold() {
        // completedTasks contains 0-task-1 and 0-task-2
        roadmapA.setCompletedTasksJson("[\"0-task-1\", \"0-task-2\"]");

        // Case 1: Only 1 Hard rating
        TaskFeedback fb1 = new TaskFeedback(userA, roadmapA, "0-task-1", TaskFeedbackRating.HARD);
        when(feedbackRepository.findByUserIdAndRoadmapId(1L, 10L)).thenReturn(List.of(fb1));
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of());

        List<NeedsAttentionItem> items1 = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertTrue(items1.isEmpty(), "1 Hard rating must not trigger phase flag");

        // Case 2: 2 Hard ratings among completed tasks
        TaskFeedback fb2 = new TaskFeedback(userA, roadmapA, "0-task-2", TaskFeedbackRating.HARD);
        when(feedbackRepository.findByUserIdAndRoadmapId(1L, 10L)).thenReturn(List.of(fb1, fb2));

        List<NeedsAttentionItem> items2 = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertEquals(1, items2.size());
        assertEquals("PHASE", items2.get(0).getType());
        assertTrue(items2.get(0).getReason().contains("2 of 2 completed tasks in this phase were rated Hard"));
    }

    @Test
    @DisplayName("Hard rating on unticked (incomplete) task does not count towards phase flag")
    void testUntickedTaskHardRatingDoesNotCount() {
        // Only 0-task-1 is completed
        roadmapA.setCompletedTasksJson("[\"0-task-1\"]");

        // Feedback exists for both 0-task-1 (completed) and 0-task-2 (NOT completed)
        TaskFeedback fb1 = new TaskFeedback(userA, roadmapA, "0-task-1", TaskFeedbackRating.HARD);
        TaskFeedback fb2 = new TaskFeedback(userA, roadmapA, "0-task-2", TaskFeedbackRating.HARD);
        when(feedbackRepository.findByUserIdAndRoadmapId(1L, 10L)).thenReturn(List.of(fb1, fb2));
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of());

        List<NeedsAttentionItem> items = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertTrue(items.isEmpty(), "Unticked task feedback must not count towards the 2 Hard threshold");
    }

    @Test
    @DisplayName("Boundary test: Task flag triggers when focus minutes > 1.5x estimatedMinutes, exactly 1.5x does not trigger")
    void testTaskFlagThreshold() {
        roadmapA.setCompletedTasksJson("[]");
        when(feedbackRepository.findByUserIdAndRoadmapId(1L, 10L)).thenReturn(List.of());

        LocalDateTime now = LocalDateTime.now();

        // Case 1: Exactly 1.5x (5400 seconds = 90 min) -> NOT triggered
        StudySession sExact = new StudySession(userA, null, 10L, "0-task-1", now.minusMinutes(90), now, 5400, SessionType.FOCUS, true);
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of(sExact));

        List<NeedsAttentionItem> itemsExact = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertTrue(itemsExact.isEmpty(), "Exactly 1.5x estimated minutes must not trigger task flag");

        // Case 2: Greater than 1.5x (5460 seconds = 91 minutes) -> TRIGGERED
        StudySession sOver = new StudySession(userA, null, 10L, "0-task-1", now.minusMinutes(91), now, 5460, SessionType.FOCUS, true);
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of(sOver));

        List<NeedsAttentionItem> itemsOver = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertEquals(1, itemsOver.size());
        assertEquals("TASK", itemsOver.get(0).getType());
        assertEquals("0-task-1", itemsOver.get(0).getTaskId());
        assertTrue(itemsOver.get(0).getReason().contains("91 minutes logged in focus sessions vs 60 minutes estimated"));
    }

    @Test
    @DisplayName("Empty data results in empty needs-attention list")
    void testEmptyData() {
        roadmapA.setCompletedTasksJson("[]");
        when(feedbackRepository.findByUserIdAndRoadmapId(1L, 10L)).thenReturn(List.of());
        when(studySessionRepository.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of());

        List<NeedsAttentionItem> items = feedbackService.computeNeedsAttention(userA, roadmapA);
        assertTrue(items.isEmpty());
    }
}
