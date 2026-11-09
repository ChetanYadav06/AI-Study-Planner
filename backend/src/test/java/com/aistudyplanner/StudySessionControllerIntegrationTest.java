package com.aistudyplanner;

import com.aistudyplanner.dto.CreateSessionRequest;
import com.aistudyplanner.dto.RegisterRequest;
import com.aistudyplanner.entity.SessionType;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.UserRepository;
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

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StudySessionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudySessionRepository sessionRepository;

    private String userAToken;
    private String userBToken;

    @BeforeEach
    void setUp() throws Exception {
        userAToken = obtainToken("usera_session@example.com", "User A", "password123");
        userBToken = obtainToken("userb_session@example.com", "User B", "password123");
    }

    private String obtainToken(String email, String name, String password) throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setEmail(email);
        registerRequest.setName(name);
        registerRequest.setPassword(password);

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andReturn();

        if (result.getResponse().getStatus() == 200 || result.getResponse().getStatus() == 201) {
            String json = result.getResponse().getContentAsString();
            return objectMapper.readTree(json).get("token").asText();
        }

        // If user already exists, login
        String loginJson = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("User A creates a session and User B cannot see it (User Isolation)")
    void testUserIsolationForStudySessions() throws Exception {
        CreateSessionRequest req = new CreateSessionRequest();
        req.setTaskId("0-task-1");
        req.setStartedAt(LocalDateTime.now().minusMinutes(30));
        req.setEndedAt(LocalDateTime.now());
        req.setDurationSeconds(1800);
        req.setSessionType(SessionType.FOCUS);

        // User A creates a session
        mockMvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.durationSeconds").value(1800))
                .andExpect(jsonPath("$.taskId").value("0-task-1"));

        // User A fetches sessions: should see at least 1
        mockMvc.perform(get("/api/sessions")
                        .header("Authorization", "Bearer " + userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // User B fetches sessions: should NOT see User A's session
        mockMvc.perform(get("/api/sessions")
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // User B summary: should have 0 totalMinutes
        mockMvc.perform(get("/api/sessions/summary")
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMinutes").value(0))
                .andExpect(jsonPath("$.totalSessions").value(0));
    }
}

