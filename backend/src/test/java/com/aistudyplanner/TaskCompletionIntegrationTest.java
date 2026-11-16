package com.aistudyplanner;

import com.aistudyplanner.dto.RegisterRequest;
import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.dto.TaskCompletionRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TaskCompletionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private SavedRoadmapRepository roadmapRepository;

    @Autowired
    private com.aistudyplanner.repository.TopicExpansionRepository topicExpansionRepository;

    @Autowired
    private com.aistudyplanner.repository.DayExtraTopicRepository dayExtraTopicRepository;

    @Autowired
    private com.aistudyplanner.repository.StudySessionRepository studySessionRepository;

    @Autowired
    private com.aistudyplanner.repository.TaskFeedbackRepository taskFeedbackRepository;

    @Autowired
    private com.aistudyplanner.repository.StudentTopicKnowledgeRepository topicRepository;

    @Autowired
    private com.aistudyplanner.repository.StudentProfileRepository profileRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String userToken;
    private String otherUserToken;
    private Long goalId;
    private Long roadmapId;

    private static final String ROADMAP_JSON = """
        {
          "overview": "Master Spring Boot microservices.",
          "feasibilityNote": "Feasible 3 days.",
          "totalStudyHours": 6.0,
          "skillLevel": "BEGINNER",
          "phases": [
            {
              "phaseNumber": 1,
              "phaseTitle": "Phase 1: Spring Boot Basics",
              "durationDays": 3,
              "topics": ["Basics", "Controllers", "JPA"],
              "dailyTasks": [
                {
                  "dayNumber": 1,
                  "title": "Day 1: Setup Environment",
                  "description": "Install Java 24, Maven, and dependencies.",
                  "estimatedMinutes": 120,
                  "activityType": "STUDY"
                },
                {
                  "dayNumber": 2,
                  "title": "Day 2: Controller Building",
                  "description": "Create REST APIs with Spring Boot.",
                  "estimatedMinutes": 120,
                  "activityType": "CODING_PRACTICE"
                },
                {
                  "dayNumber": 3,
                  "title": "Day 3: Review and Testing",
                  "description": "Test and review complete integration.",
                  "estimatedMinutes": 120,
                  "activityType": "ASSESSMENT"
                }
              ]
            }
          ]
        }
        """;

    @BeforeEach
    void setUp() throws Exception {
        topicExpansionRepository.deleteAll();
        dayExtraTopicRepository.deleteAll();
        taskFeedbackRepository.deleteAll();
        studySessionRepository.deleteAll();
        roadmapRepository.deleteAll();
        topicRepository.deleteAll();
        profileRepository.deleteAll();
        goalRepository.deleteAll();
        userRepository.deleteAll();

        String email = "student-" + System.currentTimeMillis() + "@example.com";
        userToken = registerAndGetToken("Student User", email, "Password123!");

        String otherEmail = "other-" + System.currentTimeMillis() + "@example.com";
        otherUserToken = registerAndGetToken("Other User", otherEmail, "Password123!");

        // Create linked goal for student
        Goal goal = new Goal();
        goal.setUser(userRepository.findByEmail(email).orElseThrow());
        goal.setTitle("Spring Boot 3 Mastery");
        goal.setTargetDays(3);
        goal.setHoursPerDay(2.0);
        goal.setSkillLevel(SkillLevel.BEGINNER);
        goal.setStatus(GoalStatus.NOT_STARTED);
        goal.setProgressPercentage(0);
        goal = goalRepository.save(goal);
        goalId = goal.getId();

        // Save roadmap linked to goal
        SaveRoadmapRequest saveReq = new SaveRoadmapRequest();
        saveReq.setGoalId(goalId);
        saveReq.setTitle("Spring Boot 3 Mastery");
        saveReq.setTopic("Spring Boot");
        saveReq.setSkillLevel(SkillLevel.BEGINNER);
        saveReq.setTargetDays(3);
        saveReq.setHoursPerDay(2.0);
        saveReq.setRoadmapJson(ROADMAP_JSON);

        MvcResult saveResult = mockMvc.perform(post("/api/ai/roadmaps/save")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode saveNode = objectMapper.readTree(saveResult.getResponse().getContentAsString());
        roadmapId = saveNode.get("id").asLong();
    }

    private String registerAndGetToken(String name, String email, String password) throws Exception {
        RegisterRequest register = new RegisterRequest(name, email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("token").asText();
    }

    @Test
    @DisplayName("PUT per-task endpoint sets completion, updates progress and goal status")
    void testSetTaskCompletion_Success() throws Exception {
        TaskCompletionRequest req = new TaskCompletionRequest(true);

        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedTaskIds", hasItem("0-task-1")))
                .andExpect(jsonPath("$.completedCount", is(1)))
                .andExpect(jsonPath("$.totalTasks", is(3)))
                .andExpect(jsonPath("$.progressPercentage", is(33)))
                .andExpect(jsonPath("$.goalProgressPercentage", is(33)))
                .andExpect(jsonPath("$.goalStatus", is("IN_PROGRESS")));

        Goal updatedGoal = goalRepository.findById(goalId).orElseThrow();
        assertEquals(33, updatedGoal.getProgressPercentage());
        assertEquals(GoalStatus.IN_PROGRESS, updatedGoal.getStatus());
    }

    @Test
    @DisplayName("PUT per-task endpoint unsets completion and reverts goal status to NOT_STARTED when 0 tasks done")
    void testUnsetTaskCompletion_Success() throws Exception {
        // First set task 1 to done
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk());

        // Now unset task 1
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedTaskIds", not(hasItem("0-task-1"))))
                .andExpect(jsonPath("$.completedCount", is(0)))
                .andExpect(jsonPath("$.progressPercentage", is(0)))
                .andExpect(jsonPath("$.goalProgressPercentage", is(0)))
                .andExpect(jsonPath("$.goalStatus", is("NOT_STARTED")));

        Goal updatedGoal = goalRepository.findById(goalId).orElseThrow();
        assertEquals(0, updatedGoal.getProgressPercentage());
        assertEquals(GoalStatus.NOT_STARTED, updatedGoal.getStatus());
    }

    @Test
    @DisplayName("PUT per-task endpoint is idempotent: repeating completion produces identical result")
    void testIdempotentRepeat() throws Exception {
        TaskCompletionRequest req = new TaskCompletionRequest(true);

        // First call
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedCount", is(1)));

        // Second duplicate call
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedCount", is(1)))
                .andExpect(jsonPath("$.progressPercentage", is(33)));
    }

    @Test
    @DisplayName("PUT per-task endpoint returns 404 for unknown task ID")
    void testUnknownTask_Returns404() throws Exception {
        TaskCompletionRequest req = new TaskCompletionRequest(true);

        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/nonexistent-task-999/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT per-task endpoint enforces ownership and user isolation")
    void testOwnershipAndIsolation() throws Exception {
        TaskCompletionRequest req = new TaskCompletionRequest(true);

        // Other user attempts to update roadmap owned by userToken
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + otherUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Two sequential requests from stale client do not erase each other's tasks")
    void testTwoSequentialRequestsFromStaleClient_DoNotEraseEachOther() throws Exception {
        // Request 1 sets task 1
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedCount", is(1)));

        // Request 2 sets task 2
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-2/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedCount", is(2)))
                .andExpect(jsonPath("$.completedTaskIds", hasItems("0-task-1", "0-task-2")))
                .andExpect(jsonPath("$.progressPercentage", is(67)));
    }

    @Test
    @DisplayName("Progress and goal status transition cleanly through 0%, partial%, and 100% completed")
    void testProgressAndGoalStatusProgression() throws Exception {
        // Task 1 -> 33% IN_PROGRESS
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-1/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercentage", is(33)))
                .andExpect(jsonPath("$.goalStatus", is("IN_PROGRESS")));

        // Task 2 -> 67% IN_PROGRESS
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-2/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercentage", is(67)))
                .andExpect(jsonPath("$.goalStatus", is("IN_PROGRESS")));

        // Task 3 -> 100% COMPLETED
        mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/0-task-3/completion")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercentage", is(100)))
                .andExpect(jsonPath("$.goalStatus", is("COMPLETED")));

        Goal finalGoal = goalRepository.findById(goalId).orElseThrow();
        assertEquals(100, finalGoal.getProgressPercentage());
        assertEquals(GoalStatus.COMPLETED, finalGoal.getStatus());
    }

    @Test
    @DisplayName("Concurrent requests on the same roadmap do not lose updates due to pessimistic lock")
    void testConcurrentRequestsOnSameRoadmap_DoNotLoseUpdates() throws Exception {
        int threads = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        List<String> tasks = List.of("0-task-1", "0-task-2", "0-task-3");
        List<Future<Integer>> futures = new ArrayList<>();

        for (String taskId : tasks) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                try {
                    MvcResult res = mockMvc.perform(put("/api/ai/roadmaps/" + roadmapId + "/tasks/" + taskId + "/completion")
                                    .header("Authorization", "Bearer " + userToken)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(new TaskCompletionRequest(true))))
                            .andReturn();
                    return res.getResponse().getStatus();
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        // Fire all threads simultaneously
        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS));
        executor.shutdown();

        for (Future<Integer> f : futures) {
            assertEquals(200, f.get());
        }

        // Verify final state in DB has all 3 tasks and 100% progress
        SavedRoadmap finalRoadmap = roadmapRepository.findById(roadmapId).orElseThrow();
        assertEquals(100, finalRoadmap.getProgressPercentage());
        JsonNode completedNode = objectMapper.readTree(finalRoadmap.getCompletedTasksJson());
        assertEquals(3, completedNode.size());
    }
}
