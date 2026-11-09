package com.aistudyplanner.service;

import com.aistudyplanner.dto.UpdateGoalStatusRequest;
import com.aistudyplanner.dto.UpdateRoadmapProgressRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedRoadmapServiceSyncTest {

    @Mock
    private SavedRoadmapRepository roadmapRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GoalRepository goalRepository;

    private ObjectMapper objectMapper;
    private SavedRoadmapService roadmapService;
    private GoalService goalService;

    private User testUser;
    private Goal testGoal;
    private SavedRoadmap testRoadmap;

    private final String sampleRoadmapJson = """
            {
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Foundations",
                  "dailyTasks": [
                    { "dayNumber": 1, "title": "Day 1 Task" },
                    { "dayNumber": 2, "title": "Day 2 Task" }
                  ]
                },
                {
                  "phaseNumber": 2,
                  "phaseTitle": "Phase 2: Advanced",
                  "dailyTasks": [
                    { "dayNumber": 3, "title": "Day 3 Task" },
                    { "dayNumber": 4, "title": "Day 4 Task" }
                  ]
                }
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        roadmapService = new SavedRoadmapService(roadmapRepository, userRepository, goalRepository, objectMapper);
        goalService = new GoalService(goalRepository, userRepository, roadmapRepository);

        testUser = new User("Test Student", "student@example.com", "secret");
        testUser.setId(10L);

        testGoal = new Goal(testUser, "Test AI Goal", "Description", 30, 2.5, SkillLevel.INTERMEDIATE);
        testGoal.setId(31L);
        testGoal.setStatus(GoalStatus.NOT_STARTED);
        testGoal.setProgressPercentage(0);

        testRoadmap = new SavedRoadmap(testUser, "Test AI Roadmap", "AI", SkillLevel.INTERMEDIATE, 30, 2.0, sampleRoadmapJson);
        testRoadmap.setId(9L);
        testRoadmap.setGoalId(testGoal.getId());
    }

    @Test
    @DisplayName("Should sync 0 tasks completed as NOT_STARTED and 0%")
    void testSyncZeroTasksCompleted() {
        testRoadmap.setCompletedTasksJson("[]");
        when(goalRepository.findById(testGoal.getId())).thenReturn(Optional.of(testGoal));

        roadmapService.syncProgressAndLinkedGoal(testRoadmap);

        assertEquals(0, testRoadmap.getProgressPercentage());
        assertEquals(0, testGoal.getProgressPercentage());
        assertEquals(GoalStatus.NOT_STARTED, testGoal.getStatus());
        verify(goalRepository).save(testGoal);
    }

    @Test
    @DisplayName("Should sync partial tasks completed as IN_PROGRESS and round percentage")
    void testSyncPartialTasksCompleted() {
        // 1 out of 4 tasks = 25%
        testRoadmap.setCompletedTasksJson("[\"0-task-1\"]");
        when(goalRepository.findById(testGoal.getId())).thenReturn(Optional.of(testGoal));

        roadmapService.syncProgressAndLinkedGoal(testRoadmap);

        assertEquals(25, testRoadmap.getProgressPercentage());
        assertEquals(25, testGoal.getProgressPercentage());
        assertEquals(GoalStatus.IN_PROGRESS, testGoal.getStatus());
        verify(goalRepository).save(testGoal);
    }

    @Test
    @DisplayName("Should ignore stale or unknown task IDs in completedTasksJson")
    void testSyncIgnoresStaleTaskIds() {
        // Contains 1 valid task ("0-task-1") and 2 invalid/stale tasks ("stale-task-99", "random-id")
        testRoadmap.setCompletedTasksJson("[\"0-task-1\", \"stale-task-99\", \"random-id\"]");
        when(goalRepository.findById(testGoal.getId())).thenReturn(Optional.of(testGoal));

        roadmapService.syncProgressAndLinkedGoal(testRoadmap);

        // Only 1 of 4 valid tasks is done -> 25%
        assertEquals(25, testRoadmap.getProgressPercentage());
        assertEquals(25, testGoal.getProgressPercentage());
        assertEquals(GoalStatus.IN_PROGRESS, testGoal.getStatus());
    }

    @Test
    @DisplayName("Should sync all tasks completed as COMPLETED and 100%")
    void testSyncAllTasksCompleted() {
        // All 4 tasks completed: phase 0 has day 1, 2; phase 1 has day 3, 4
        testRoadmap.setCompletedTasksJson("[\"0-task-1\", \"0-task-2\", \"1-task-3\", \"1-task-4\"]");
        when(goalRepository.findById(testGoal.getId())).thenReturn(Optional.of(testGoal));

        roadmapService.syncProgressAndLinkedGoal(testRoadmap);

        assertEquals(100, testRoadmap.getProgressPercentage());
        assertEquals(100, testGoal.getProgressPercentage());
        assertEquals(GoalStatus.COMPLETED, testGoal.getStatus());
    }

    @Test
    @DisplayName("Should backfill all roadmap-linked goals across the database")
    void testBackfillAllRoadmapLinkedGoals() {
        testRoadmap.setCompletedTasksJson("[\"0-task-1\", \"0-task-2\"]"); // 2 of 4 = 50%
        when(roadmapRepository.findAll()).thenReturn(List.of(testRoadmap));
        when(goalRepository.findById(testGoal.getId())).thenReturn(Optional.of(testGoal));

        int updated = roadmapService.backfillAllRoadmapLinkedGoals();

        assertEquals(1, updated);
        assertEquals(50, testRoadmap.getProgressPercentage());
        assertEquals(50, testGoal.getProgressPercentage());
        assertEquals(GoalStatus.IN_PROGRESS, testGoal.getStatus());
        verify(roadmapRepository).save(testRoadmap);
    }

    @Test
    @DisplayName("Should generate unique IDs for duplicate dayNumbers, preserve old IDs, and handle dayNumber 0 and missing dayNumber")
    void testCanonicalTaskIdsWithDuplicatesDayZeroAndMissingDay() {
        String testJson = """
        {
          "phases": [
            {
              "phaseTitle": "Phase 1",
              "dailyTasks": [
                { "dayNumber": 1, "title": "Day 1 Morning" },
                { "dayNumber": 1, "title": "Day 1 Afternoon" },
                { "dayNumber": 1, "title": "Day 1 Evening" },
                { "dayNumber": 0, "title": "Day 0 Prep" },
                { "title": "Missing Day Task" }
              ]
            }
          ]
        }
        """;

        Set<String> validIds = roadmapService.extractValidTaskIds(testJson);

        // Expected IDs:
        // 1st task with dayNumber 1 -> "0-task-1" (keeps existing legacy ID valid!)
        // 2nd task with dayNumber 1 -> "0-task-1-b"
        // 3rd task with dayNumber 1 -> "0-task-1-c"
        // 4th task with dayNumber 0 -> "0-task-0"
        // 5th task with missing dayNumber (at tIdx 4) -> "0-task-4"
        assertEquals(5, validIds.size());
        assertTrue(validIds.contains("0-task-1"));
        assertTrue(validIds.contains("0-task-1-b"));
        assertTrue(validIds.contains("0-task-1-c"));
        assertTrue(validIds.contains("0-task-0"));
        assertTrue(validIds.contains("0-task-4"));

        // Test that 100% completion works with all unique IDs
        SavedRoadmap multiRoadmap = new SavedRoadmap();
        multiRoadmap.setRoadmapJson(testJson);
        multiRoadmap.setCompletedTasksJson("[\"0-task-1\", \"0-task-1-b\", \"0-task-1-c\", \"0-task-0\", \"0-task-4\"]");

        roadmapService.syncProgressAndLinkedGoal(multiRoadmap);
        assertEquals(100, multiRoadmap.getProgressPercentage());
    }

    @Test
    @DisplayName("GoalService should reject manual status/progress PATCH when roadmap is linked")
    void testRejectManualProgressPatchWhenRoadmapLinked() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(goalRepository.findByIdAndUserId(testGoal.getId(), testUser.getId())).thenReturn(Optional.of(testGoal));
        when(roadmapRepository.existsByGoalId(testGoal.getId())).thenReturn(true);

        UpdateGoalStatusRequest request = new UpdateGoalStatusRequest();
        request.setProgressPercentage(50);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                goalService.updateGoalStatus(testUser.getEmail(), testGoal.getId(), request)
        );

        assertTrue(ex.getMessage().contains("Manual progress updates are disabled for goals with an active AI roadmap"));
        verify(goalRepository, never()).save(any());
    }

    @Test
    @DisplayName("GoalService should allow manual progress PATCH when NO roadmap is linked")
    void testAllowManualProgressPatchWhenNoRoadmapLinked() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(goalRepository.findByIdAndUserId(testGoal.getId(), testUser.getId())).thenReturn(Optional.of(testGoal));
        when(roadmapRepository.existsByGoalId(testGoal.getId())).thenReturn(false);
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateGoalStatusRequest request = new UpdateGoalStatusRequest();
        request.setProgressPercentage(40);

        var response = goalService.updateGoalStatus(testUser.getEmail(), testGoal.getId(), request);

        assertEquals(40, response.getProgressPercentage());
        assertEquals(GoalStatus.IN_PROGRESS, response.getStatus());
        verify(goalRepository).save(testGoal);
    }
}

