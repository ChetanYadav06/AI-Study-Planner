package com.aistudyplanner;

import com.aistudyplanner.dto.CreateGoalRequest;
import com.aistudyplanner.dto.RegisterRequest;
import com.aistudyplanner.dto.UpdateGoalStatusRequest;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.repository.GoalRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class GoalControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        goalRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndGetToken(String name, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest(name, email, password);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.get("token").asText();
    }

    @Test
    @DisplayName("Should create, retrieve, update, and get dashboard stats for learning goals")
    void testGoalLifecycle() throws Exception {
        String token = registerAndGetToken("Alice Student", "alice@example.com", "Password123!");

        // 1. Create a Goal
        CreateGoalRequest createRequest = new CreateGoalRequest(
                "Master Spring Boot 3 & Microservices",
                "Complete full backend curriculum including JPA, Security, and REST APIs.",
                30,
                3.0,
                SkillLevel.INTERMEDIATE
        );

        MvcResult createResult = mockMvc.perform(post("/api/goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Master Spring Boot 3 & Microservices")))
                .andExpect(jsonPath("$.targetDays", is(30)))
                .andExpect(jsonPath("$.hoursPerDay", is(3.0)))
                .andExpect(jsonPath("$.skillLevel", is("INTERMEDIATE")))
                .andExpect(jsonPath("$.status", is("NOT_STARTED")))
                .andExpect(jsonPath("$.progressPercentage", is(0)))
                .andReturn();

        JsonNode createdNode = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long goalId = createdNode.get("id").asLong();

        // 2. Retrieve All Goals
        mockMvc.perform(get("/api/goals")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is((int) goalId)));

        // 3. Retrieve Goal by ID
        mockMvc.perform(get("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Master Spring Boot 3 & Microservices")));

        // 4. Update Goal Status & Progress
        UpdateGoalStatusRequest updateRequest = new UpdateGoalStatusRequest(GoalStatus.IN_PROGRESS, 45);
        mockMvc.perform(patch("/api/goals/" + goalId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.progressPercentage", is(45)));

        // 5. Check Dashboard Stats
        mockMvc.perform(get("/api/dashboard/stats")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGoals", is(1)))
                .andExpect(jsonPath("$.activeGoals", is(1)))
                .andExpect(jsonPath("$.completedGoals", is(0)))
                .andExpect(jsonPath("$.dailyTargetHours", is(3.0)));

        // 6. Delete Goal
        mockMvc.perform(delete("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("deleted successfully")));

        // 7. Verify Goal is gone
        mockMvc.perform(get("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should enforce strict user isolation: User B cannot access or modify User A's goal")
    void testUserIsolation() throws Exception {
        String tokenUserA = registerAndGetToken("User A", "usera@example.com", "Password123!");
        String tokenUserB = registerAndGetToken("User B", "userb@example.com", "Password123!");

        // User A creates goal
        CreateGoalRequest createRequest = new CreateGoalRequest(
                "User A Confidential Goal",
                "Private learning goal",
                14,
                2.0,
                SkillLevel.BEGINNER
        );

        MvcResult createResult = mockMvc.perform(post("/api/goals")
                        .header("Authorization", "Bearer " + tokenUserA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        long goalId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // User B attempts to access User A's goal -> 404
        mockMvc.perform(get("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + tokenUserB))
                .andExpect(status().isNotFound());

        // User B attempts to delete User A's goal -> 404
        mockMvc.perform(delete("/api/goals/" + goalId)
                        .header("Authorization", "Bearer " + tokenUserB))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should reject invalid goal creation payload with validation errors")
    void testValidationErrors() throws Exception {
        String token = registerAndGetToken("Test User", "testuser@example.com", "Password123!");

        // Invalid: empty title, 0 days, 0 hours
        CreateGoalRequest invalidRequest = new CreateGoalRequest(
                "",
                "Valid description",
                0,
                0.0,
                SkillLevel.BEGINNER
        );

        mockMvc.perform(post("/api/goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title", notNullValue()))
                .andExpect(jsonPath("$.errors.targetDays", notNullValue()))
                .andExpect(jsonPath("$.errors.hoursPerDay", notNullValue()));
    }
}
