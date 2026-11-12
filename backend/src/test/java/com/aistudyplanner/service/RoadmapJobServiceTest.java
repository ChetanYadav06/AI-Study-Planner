package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapJobResponse;
import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.exception.RoadmapGenerationException;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoadmapJobServiceTest {

    @Mock
    private GeminiTestService geminiTestService;

    @Mock
    private SlidingWindowRateLimiter rateLimiter;

    private RoadmapValidator roadmapValidator;
    private RoadmapService roadmapService;
    private RoadmapJobService roadmapJobService;
    private final ExecutorService directExecutor = Executors.newSingleThreadExecutor();

    @BeforeEach
    void setUp() {
        roadmapValidator = new RoadmapValidator();
        roadmapService = new RoadmapService(geminiTestService, roadmapValidator, null, null, 300, RoadmapService.DEFAULT_ALLOWED_HOSTS);
        roadmapJobService = new RoadmapJobService(roadmapService, rateLimiter, directExecutor, 300);
        lenient().when(rateLimiter.tryAcquire(anyString(), anyInt(), anyLong())).thenReturn(true);
    }

    private RoadmapRequest createSampleRequest(int days) {
        RoadmapRequest req = new RoadmapRequest();
        req.setTopic("Python Web Development");
        req.setDescription("Learn FastAPI and SQLAlchemy");
        req.setSkillLevel(SkillLevel.BEGINNER);
        req.setTargetDays(days);
        req.setHoursPerDay(2.0);
        return req;
    }

    @Test
    @DisplayName("Should lifecycle job through QUEUED/RUNNING to DONE")
    void shouldLifecycleJobToDone() throws Exception {
        String outlineResponse = """
            {
              "overview": "Learn Python FastAPI web development.",
              "feasibilityNote": "Paced for 2 days.",
              "totalStudyHours": 4.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Python basics"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "FastAPI Basics",
                  "durationDays": 2,
                  "topics": ["FastAPI", "Routing"],
                  "milestones": ["First API endpoint"],
                  "practicalExercises": [{"title": "Hello API", "instructions": "Build route", "difficulty": "BEGINNER"}],
                  "assessment": {"title": "Check", "type": "PROJECT", "description": "Run API", "passingCriteria": "Returns 200"}
                }
              ]
            }
            """;

        String phase1Tasks = """
            {
              "dailyTasks": [
                {
                  "dayNumber": 1,
                  "title": "FastAPI Setup",
                  "description": "Install and start uvicorn server.",
                  "estimatedMinutes": 120,
                  "activityType": "STUDY"
                },
                {
                  "dayNumber": 2,
                  "title": "FastAPI Routing",
                  "description": "Create path parameters and query parameters.",
                  "estimatedMinutes": 120,
                  "activityType": "PRACTICE"
                }
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString()))
                .thenReturn(outlineResponse) // Call 1: Outline
                .thenReturn(phase1Tasks)     // Call 2: Phase 1 Tasks
                .thenReturn("{ \"offTopicDays\": [] }"); // Call 3: AI Reviewer

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Python FastAPI Web Development");
        request.setDescription("Learn FastAPI and SQLAlchemy");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);
        String jobId = roadmapJobService.startJob(request, "alice@example.com");
        assertNotNull(jobId);

        // Wait for async execution on single-thread executor
        RoadmapJobService.JobRecord record = roadmapJobService.getJobStore().get(jobId);
        assertNotNull(record);
        if (record.getFuture() != null) {
            record.getFuture().get();
        }

        RoadmapJobResponse res = roadmapJobService.getJob(jobId, "alice@example.com");
        assertEquals(RoadmapJobResponse.State.DONE, res.getState());
        assertNotNull(res.getResult());
        assertEquals("Python FastAPI Web Development", res.getResult().getTopic());
        assertEquals(1, res.getResult().getPhases().size());
        assertEquals(2, res.getResult().getPhases().get(0).getDailyTasks().size());
    }

    @Test
    @DisplayName("Should enforce cross-user isolation when querying a job")
    void shouldEnforceOwnershipIsolationOnJob() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Go Basics Programming");
        request.setDescription("Learn Go syntax and structs");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);
        String jobId = roadmapJobService.startJob(request, "alice@example.com");

        // Bob queries Alice's job -> 403 Forbidden
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                roadmapJobService.getJob(jobId, "bob@example.com")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("Should reject second simultaneous job for the same user")
    void shouldRejectSecondSimultaneousJobForSameUser() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Python Web Development");
        request.setDescription("Learn FastAPI and SQLAlchemy");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);

        // Manually place a RUNNING job for alice
        RoadmapJobService.JobRecord activeJob = new RoadmapJobService.JobRecord(
                "job-1",
                "alice@example.com",
                java.time.Instant.now(),
                RoadmapJobResponse.State.RUNNING,
                0,
                2,
                "Running..."
        );
        roadmapJobService.getJobStore().put("job-1", activeJob);

        // Starting another job for alice throws 409 CONFLICT
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                roadmapJobService.startJob(request, "alice@example.com")
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already in progress"));
    }

    @Test
    @DisplayName("Should assemble multi-phase roadmap per-phase with progress reporting")
    void shouldAssembleMultiPhaseRoadmap() throws Exception {
        String outlineResponse = """
            {
              "overview": "Learn modern frontend development.",
              "feasibilityNote": "Paced for 4 days.",
              "totalStudyHours": 8.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["HTML/CSS"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: JS Essentials",
                  "durationDays": 2,
                  "topics": ["ES6", "DOM"],
                  "milestones": ["DOM manipulation"],
                  "practicalExercises": [{"title": "Ex 1", "instructions": "Code", "difficulty": "BEGINNER"}],
                  "assessment": {"title": "A1", "type": "QUIZ", "description": "Quiz", "passingCriteria": "Pass"}
                },
                {
                  "phaseNumber": 2,
                  "phaseTitle": "Phase 2: React Core",
                  "durationDays": 2,
                  "topics": ["Components", "Hooks"],
                  "milestones": ["Build todo app"],
                  "practicalExercises": [{"title": "Ex 2", "instructions": "React app", "difficulty": "BEGINNER"}],
                  "assessment": {"title": "A2", "type": "PROJECT", "description": "Todo", "passingCriteria": "Done"}
                }
              ]
            }
            """;

        String phase1Tasks = """
            {
              "dailyTasks": [
                {"dayNumber": 1, "title": "ES6 Basics", "description": "Variables and arrow functions.", "estimatedMinutes": 120, "activityType": "STUDY"},
                {"dayNumber": 2, "title": "DOM Events", "description": "Event listeners and manipulation.", "estimatedMinutes": 120, "activityType": "PRACTICE"}
              ]
            }
            """;

        String phase2Tasks = """
            {
              "dailyTasks": [
                {"dayNumber": 3, "title": "React Components", "description": "JSX and function components.", "estimatedMinutes": 120, "activityType": "STUDY"},
                {"dayNumber": 4, "title": "React Hooks", "description": "useState and useEffect hooks.", "estimatedMinutes": 120, "activityType": "PROJECT"}
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString()))
                .thenReturn(outlineResponse) // Call 1: Outline
                .thenReturn(phase1Tasks)     // Call 2: Phase 1
                .thenReturn(phase2Tasks)     // Call 3: Phase 2
                .thenReturn("{ \"offTopicDays\": [] }"); // Call 4: AI Reviewer

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Modern Frontend Development");
        request.setDescription("Learn ES6 JavaScript and React component development");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(4);
        request.setHoursPerDay(2.0);
        String jobId = roadmapJobService.startJob(request, "alice@example.com");

        RoadmapJobService.JobRecord record = roadmapJobService.getJobStore().get(jobId);
        assertNotNull(record);
        if (record.getFuture() != null) {
            record.getFuture().get();
        }

        RoadmapJobResponse res = roadmapJobService.getJob(jobId, "alice@example.com");
        assertEquals(RoadmapJobResponse.State.DONE, res.getState());
        assertEquals(2, res.getPhasesDone());
        assertEquals(2, res.getPhasesTotal());
        assertEquals(2, res.getResult().getPhases().size());
        assertEquals(2, res.getResult().getPhases().get(0).getDailyTasks().size());
        assertEquals(2, res.getResult().getPhases().get(1).getDailyTasks().size());
        assertEquals(1, res.getResult().getPhases().get(0).getDailyTasks().get(0).getDayNumber());
        assertEquals(4, res.getResult().getPhases().get(1).getDailyTasks().get(1).getDayNumber());
    }

    @Test
    @DisplayName("Should repair single failing phase on retry")
    void shouldRepairSingleFailingPhaseOnRetry() throws Exception {
        String outlineResponse = """
            {
              "overview": "Learn Go programming.",
              "feasibilityNote": "Paced for 2 days.",
              "totalStudyHours": 4.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Programming basics"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Go Basics",
                  "durationDays": 2,
                  "topics": ["Go syntax", "Structs"],
                  "milestones": ["First Go CLI"],
                  "practicalExercises": [{"title": "CLI", "instructions": "Build CLI", "difficulty": "BEGINNER"}],
                  "assessment": {"title": "Check", "type": "PROJECT", "description": "Run", "passingCriteria": "Pass"}
                }
              ]
            }
            """;

        // Bad phase tasks: has invalid dayNumber 99 instead of 1
        String badPhaseTasks = """
            {
              "dailyTasks": [
                {"dayNumber": 99, "title": "Bad Day", "description": "Wrong day number.", "estimatedMinutes": 120, "activityType": "STUDY"},
                {"dayNumber": 2, "title": "Go Structs", "description": "Structs and methods.", "estimatedMinutes": 120, "activityType": "PRACTICE"}
              ]
            }
            """;

        // Repaired phase tasks: valid dayNumbers 1 and 2
        String fixedPhaseTasks = """
            {
              "dailyTasks": [
                {"dayNumber": 1, "title": "Go Syntax", "description": "Variables and functions.", "estimatedMinutes": 120, "activityType": "STUDY"},
                {"dayNumber": 2, "title": "Go Structs", "description": "Structs and methods.", "estimatedMinutes": 120, "activityType": "PRACTICE"}
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString()))
                .thenReturn(outlineResponse) // Call 1: Outline
                .thenReturn(badPhaseTasks)   // Call 2: Phase 1 Attempt 1 (bad)
                .thenReturn(fixedPhaseTasks) // Call 3: Phase 1 Attempt 2 (fixed)
                .thenReturn("{ \"offTopicDays\": [] }"); // Call 4: AI Reviewer

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Go Basics Programming");
        request.setDescription("Learn Go syntax and structs");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);
        String jobId = roadmapJobService.startJob(request, "alice@example.com");

        RoadmapJobService.JobRecord record = roadmapJobService.getJobStore().get(jobId);
        assertNotNull(record);
        if (record.getFuture() != null) {
            record.getFuture().get();
        }

        RoadmapJobResponse res = roadmapJobService.getJob(jobId, "alice@example.com");
        assertEquals(RoadmapJobResponse.State.DONE, res.getState());
        assertEquals(1, res.getResult().getPhases().get(0).getDailyTasks().get(0).getDayNumber());
    }

    @Test
    @DisplayName("Should map timeout error to TIMEOUT errorCode and clear message")
    void shouldMapTimeoutError() throws Exception {
        when(geminiTestService.askGeminiJson(anyString()))
                .thenThrow(new RoadmapGenerationException(HttpStatus.BAD_GATEWAY, "Roadmap generation timed out after 300 seconds."));

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Go Basics Programming");
        request.setDescription("Learn Go syntax and structs");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);
        String jobId = roadmapJobService.startJob(request, "alice@example.com");

        RoadmapJobService.JobRecord record = roadmapJobService.getJobStore().get(jobId);
        assertNotNull(record);
        if (record.getFuture() != null) {
            record.getFuture().get();
        }

        RoadmapJobResponse res = roadmapJobService.getJob(jobId, "alice@example.com");
        assertEquals(RoadmapJobResponse.State.FAILED, res.getState());
        assertEquals("TIMEOUT", res.getErrorCode());
        assertEquals("The AI took too long. Try again or choose fewer days.", res.getMessage());
    }

    @Test
    @DisplayName("Progress consistency fixture: 60 tasks with 4 done yields exactly 7% everywhere")
    void shouldCalculateConsistentProgress() {
        // Build 60 canonical task IDs: phase-1-day-1 through phase-6-day-10 (6 phases x 10 days = 60 days)
        StringBuilder roadmapJson = new StringBuilder("{\"phases\":[");
        for (int p = 1; p <= 6; p++) {
            if (p > 1) roadmapJson.append(",");
            roadmapJson.append(String.format("{\"phaseNumber\":%d,\"durationDays\":10,\"dailyTasks\":[", p));
            for (int d = 1; d <= 10; d++) {
                if (d > 1) roadmapJson.append(",");
                int globalDay = (p - 1) * 10 + d;
                roadmapJson.append(String.format("{\"dayNumber\":%d,\"title\":\"Task %d\",\"estimatedMinutes\":120,\"activityType\":\"STUDY\"}", globalDay, globalDay));
            }
            roadmapJson.append("]}");
        }
        roadmapJson.append("]}");

        // Mark 4 tasks as completed (phase index 0, days 1 through 4)
        String completedJson = "[\"0-task-1\",\"0-task-2\",\"0-task-3\",\"0-task-4\"]";

        SavedRoadmapService savedRoadmapService = new SavedRoadmapService(null, null, null, null, null);
        SavedRoadmapService.ProgressCalculation calc = savedRoadmapService.calculateProgress(roadmapJson.toString(), completedJson);

        assertEquals(60, calc.totalTasks());
        assertEquals(4, calc.completedTasks());
        assertEquals(7, calc.percentage(), "4 / 60 * 100 should round to 7%");

        // Verify frontend computation match: Math.round((4 / 60) * 100) = 7
        int frontendProgress = (int) Math.round(((double) 4 / 60.0) * 100.0);
        assertEquals(calc.percentage(), frontendProgress);
    }
}
