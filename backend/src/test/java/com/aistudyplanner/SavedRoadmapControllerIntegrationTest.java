package com.aistudyplanner;

import com.aistudyplanner.dto.RegisterRequest;
import com.aistudyplanner.dto.ReplaceRoadmapRequest;
import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.repository.*;
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

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SavedRoadmapControllerIntegrationTest {

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
    private Long savedRoadmapId;

    private static final String ORIGINAL_ROADMAP_JSON = """
        {
          "overview": "Master Full-Stack Java Foundations.",
          "feasibilityNote": "Feasible 3 days.",
          "totalStudyHours": 6.0,
          "skillLevel": "BEGINNER",
          "phases": [
            {
              "phaseNumber": 1,
              "phaseTitle": "Phase 1: Full-Stack Java Basics",
              "durationDays": 3,
              "topics": ["Full-Stack Java Foundations", "REST APIs", "Spring Boot"],
              "dailyTasks": [
                {
                  "dayNumber": 1,
                  "title": "Day 1: Setup Full-Stack Java Environment",
                  "description": "Install Java 21, Maven, and Spring Boot dependencies.",
                  "estimatedMinutes": 120,
                  "activityType": "STUDY"
                },
                {
                  "dayNumber": 2,
                  "title": "Day 2: Full-Stack Java Controller Building",
                  "description": "Create REST APIs with Spring Boot controllers.",
                  "estimatedMinutes": 120,
                  "activityType": "CODING_PRACTICE"
                },
                {
                  "dayNumber": 3,
                  "title": "Day 3: Full-Stack Java Integration Review",
                  "description": "Test and review complete client API integration.",
                  "estimatedMinutes": 120,
                  "activityType": "REVIEW"
                }
              ]
            }
          ]
        }
        """;

    @BeforeEach
    void setUp() throws Exception {
        studySessionRepository.deleteAll();
        roadmapRepository.deleteAll();
        topicRepository.deleteAll();
        profileRepository.deleteAll();
        goalRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Register test user
        RegisterRequest registerReq = new RegisterRequest("Roadmap Tester", "tester@example.com", "Password123!");
        MvcResult authResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode authNode = objectMapper.readTree(authResult.getResponse().getContentAsString());
        userToken = authNode.get("token").asText();

        // 2. Create goal
        Goal goal = new Goal();
        goal.setUser(userRepository.findByEmail("tester@example.com").orElseThrow());
        goal.setTitle("Full-Stack Java");
        goal.setDescription("Full-Stack Java Spring Boot development");
        goal.setTargetDays(3);
        goal.setHoursPerDay(2.0);
        goal.setSkillLevel(SkillLevel.BEGINNER);
        goal.setStatus(GoalStatus.NOT_STARTED);
        goal.setProgressPercentage(0);
        goal = goalRepository.save(goal);
        goalId = goal.getId();

        // 3. Save initial roadmap
        SaveRoadmapRequest saveReq = new SaveRoadmapRequest();
        saveReq.setTitle("Full-Stack Java Plan");
        saveReq.setTopic("Full-Stack Java");
        saveReq.setSkillLevel(SkillLevel.BEGINNER);
        saveReq.setTargetDays(3);
        saveReq.setHoursPerDay(2.0);
        saveReq.setGoalId(goalId);
        saveReq.setRoadmapJson(ORIGINAL_ROADMAP_JSON);

        MvcResult saveResult = mockMvc.perform(post("/api/ai/roadmaps/save")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode savedNode = objectMapper.readTree(saveResult.getResponse().getContentAsString());
        savedRoadmapId = savedNode.get("id").asLong();
    }

    @Test
    @DisplayName("Should reject replacement roadmap with tampered day count and preserve original")
    void testRejectTamperedDayCount() throws Exception {
        // Tampered JSON with only 2 days instead of target 3 days
        String tamperedDaysJson = """
            {
              "overview": "Tampered Full-Stack Java Roadmap.",
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Full-Stack Java",
                  "durationDays": 2,
                  "topics": ["Java Foundations"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Full-Stack Java Intro",
                      "description": "Learn syntax.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Full-Stack Java Coding",
                      "description": "Write code.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    }
                  ]
                }
              ]
            }
            """;

        ReplaceRoadmapRequest replaceReq = new ReplaceRoadmapRequest();
        replaceReq.setTitle("Tampered Title");
        replaceReq.setRoadmapJson(tamperedDaysJson);

        // Expect 422 Unprocessable Entity
        mockMvc.perform(put("/api/ai/roadmaps/" + savedRoadmapId + "/replace")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replaceReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("Total daily tasks (2) does not match target days (3)")));

        // Verify original roadmap is untouched
        MvcResult getResult = mockMvc.perform(get("/api/ai/roadmaps/" + savedRoadmapId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode getNode = objectMapper.readTree(getResult.getResponse().getContentAsString());
        assertEquals("Full-Stack Java Plan", getNode.get("title").asText());
        assertEquals(3, getNode.get("targetDays").asInt());
        assertEquals(ORIGINAL_ROADMAP_JSON, getNode.get("roadmapJson").asText());
    }

    @Test
    @DisplayName("Should reject replacement roadmap with invalid activityType and preserve original")
    void testRejectTamperedInvalidActivityType() throws Exception {
        // Tampered JSON with invalid activityType
        String tamperedActivityJson = """
            {
              "overview": "Tampered Full-Stack Java Roadmap.",
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Full-Stack Java",
                  "durationDays": 3,
                  "topics": ["Java Foundations"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Full-Stack Java Intro",
                      "description": "Learn syntax.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Full-Stack Java Coding",
                      "description": "Write code.",
                      "estimatedMinutes": 120,
                      "activityType": "INVALID_ACTIVITY_HACK"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Day 3: Full-Stack Java Review",
                      "description": "Review code.",
                      "estimatedMinutes": 120,
                      "activityType": "REVIEW"
                    }
                  ]
                }
              ]
            }
            """;

        ReplaceRoadmapRequest replaceReq = new ReplaceRoadmapRequest();
        replaceReq.setTitle("Invalid Activity Hack");
        replaceReq.setRoadmapJson(tamperedActivityJson);

        mockMvc.perform(put("/api/ai/roadmaps/" + savedRoadmapId + "/replace")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replaceReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("Invalid activityType 'INVALID_ACTIVITY_HACK'")));

        // Verify original roadmap is untouched
        MvcResult getResult = mockMvc.perform(get("/api/ai/roadmaps/" + savedRoadmapId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode getNode = objectMapper.readTree(getResult.getResponse().getContentAsString());
        assertEquals("Full-Stack Java Plan", getNode.get("title").asText());
        assertEquals(ORIGINAL_ROADMAP_JSON, getNode.get("roadmapJson").asText());
    }

    @Test
    @DisplayName("Should successfully replace roadmap when replacement JSON is valid")
    void testAllowValidReplacement() throws Exception {
        String validReplacementJson = """
            {
              "overview": "Updated Full-Stack Java Master Plan.",
              "feasibilityNote": "Feasible 3 days.",
              "totalStudyHours": 6.0,
              "skillLevel": "BEGINNER",
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Full-Stack Java Accelerated",
                  "durationDays": 3,
                  "topics": ["Full-Stack Java Essentials"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Full-Stack Java Accelerated Core",
                      "description": "Fast-track overview of Java 21 syntax and primitives.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Full-Stack Java Service Architecture",
                      "description": "Construct scalable Spring service components.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Day 3: Full-Stack Java Capstone Integration",
                      "description": "Complete full system integration tests.",
                      "estimatedMinutes": 120,
                      "activityType": "PROJECT"
                    }
                  ]
                }
              ]
            }
            """;

        ReplaceRoadmapRequest replaceReq = new ReplaceRoadmapRequest();
        replaceReq.setTitle("Updated Full-Stack Java Master Plan");
        replaceReq.setRoadmapJson(validReplacementJson);

        mockMvc.perform(put("/api/ai/roadmaps/" + savedRoadmapId + "/replace")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replaceReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Full-Stack Java Master Plan"))
                .andExpect(jsonPath("$.progressPercentage").value(0));

        // Verify updated roadmap in DB
        MvcResult getResult = mockMvc.perform(get("/api/ai/roadmaps/" + savedRoadmapId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode getNode = objectMapper.readTree(getResult.getResponse().getContentAsString());
        assertEquals("Updated Full-Stack Java Master Plan", getNode.get("title").asText());
        assertEquals(validReplacementJson, getNode.get("roadmapJson").asText());
    }
}

