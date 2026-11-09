package com.aistudyplanner;

import com.aistudyplanner.dto.CreateSessionRequest;
import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.entity.*;
import com.aistudyplanner.repository.*;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StudySessionCascadeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private SavedRoadmapRepository roadmapRepository;

    @Autowired
    private StudentTopicKnowledgeRepository topicRepository;

    @Autowired
    private StudentProfileRepository profileRepository;

    @Autowired
    private StudySessionRepository studySessionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String userToken;
    private Long goalId;
    private Long roadmapId;

    @BeforeEach
    void setUp() throws Exception {
        studySessionRepository.deleteAll();
        roadmapRepository.deleteAll();
        topicRepository.deleteAll();
        profileRepository.deleteAll();
        goalRepository.deleteAll();
        userRepository.deleteAll();

        // Register user
        String authPayload = """
            {
              "name": "Cascade Student",
              "email": "cascade@example.com",
              "password": "Password123!"
            }
            """;
        MvcResult authResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(authPayload))
                .andExpect(status().isCreated())
                .andReturn();

        userToken = objectMapper.readTree(authResult.getResponse().getContentAsString()).get("token").asText();

        // Create Goal
        String goalPayload = """
            {
              "title": "Machine Learning",
              "description": "Learn ML basics",
              "targetDate": "%s",
              "targetDays": 30,
              "skillLevel": "INTERMEDIATE",
              "hoursPerDay": 2.0
            }
            """.formatted(LocalDate.now().plusDays(30));

        MvcResult goalResult = mockMvc.perform(post("/api/goals")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(goalPayload))
                .andExpect(status().isCreated())
                .andReturn();

        goalId = objectMapper.readTree(goalResult.getResponse().getContentAsString()).get("id").asLong();

        // Create Saved Roadmap
        SaveRoadmapRequest roadmapReq = new SaveRoadmapRequest();
        roadmapReq.setGoalId(goalId);
        roadmapReq.setTitle("ML Foundations Roadmap");
        roadmapReq.setTopic("Machine Learning");
        roadmapReq.setSkillLevel(SkillLevel.INTERMEDIATE);
        roadmapReq.setTargetDays(14);
        roadmapReq.setHoursPerDay(2.0);
        roadmapReq.setRoadmapJson("{\"phases\":[]}");

        MvcResult roadmapResult = mockMvc.perform(post("/api/ai/roadmaps/save")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(roadmapReq)))
                .andExpect(status().isCreated())
                .andReturn();

        roadmapId = objectMapper.readTree(roadmapResult.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    @DisplayName("Study sessions retain null references when linked Goal and Roadmap are deleted")
    void testSessionsRetainNullOnGoalAndRoadmapDeletion() throws Exception {
        // Create a study session linked to both goal and roadmap
        CreateSessionRequest sessionReq = new CreateSessionRequest();
        sessionReq.setGoalId(goalId);
        sessionReq.setRoadmapId(roadmapId);
        sessionReq.setTaskId("0-task-1");
        sessionReq.setStartedAt(LocalDateTime.now().minusMinutes(30));
        sessionReq.setEndedAt(LocalDateTime.now());
        sessionReq.setDurationSeconds(1800);
        sessionReq.setSessionType(SessionType.FOCUS);

        MvcResult sessionResult = mockMvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sessionReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long sessionId = objectMapper.readTree(sessionResult.getResponse().getContentAsString()).get("id").asLong();

        // Delete the goal
        mockMvc.perform(delete("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());

        // Verify the session still exists, but goalId is now null
        StudySession afterGoalDelete = studySessionRepository.findById(sessionId).orElseThrow();
        assertNull(afterGoalDelete.getGoalId(), "goalId should be null after goal deletion");
        assertEquals(roadmapId, afterGoalDelete.getRoadmapId(), "roadmapId should remain intact");
        assertEquals(1800, afterGoalDelete.getDurationSeconds());

        // Delete the roadmap
        mockMvc.perform(delete("/api/ai/roadmaps/" + roadmapId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk());

        // Verify the session still exists, and roadmapId is now null
        StudySession afterRoadmapDelete = studySessionRepository.findById(sessionId).orElseThrow();
        assertNull(afterRoadmapDelete.getGoalId(), "goalId should still be null");
        assertNull(afterRoadmapDelete.getRoadmapId(), "roadmapId should be null after roadmap deletion");
        assertEquals(1800, afterRoadmapDelete.getDurationSeconds(), "study session duration and records must remain intact");
    }
}
