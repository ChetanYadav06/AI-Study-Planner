package com.aistudyplanner;

import com.aistudyplanner.dto.*;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
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

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ProfileAndSkillsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository profileRepository;

    @Autowired
    private StudentTopicKnowledgeRepository topicRepository;

    @Autowired
    private SavedRoadmapRepository roadmapRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private com.aistudyplanner.repository.StudySessionRepository studySessionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        studySessionRepository.deleteAll();
        roadmapRepository.deleteAll();
        topicRepository.deleteAll();
        profileRepository.deleteAll();
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
    @DisplayName("Should retrieve and update student learning profile successfully")
    void shouldRetrieveAndUpdateProfile() throws Exception {
        String token = registerAndGetToken("Alice Smith", "alice@example.com", "password123");

        // Initial profile fetch
        mockMvc.perform(get("/api/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alice Smith"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.completionPercentage").isNumber());

        // Update profile
        StudentProfileRequest updateReq = new StudentProfileRequest();
        updateReq.setCareerGoal("Senior Full-Stack Engineer");
        updateReq.setEducationLevel("Undergraduate");
        updateReq.setAcademicBackground("Computer Science & Engineering");
        updateReq.setExperienceLevel(SkillLevel.INTERMEDIATE);
        updateReq.setDailyStudyHours(3.0);
        updateReq.setAvailableDaysPerWeek(6);
        updateReq.setPreferredStudyTime("EVENING");
        updateReq.setLearningMethods("VIDEO,CODING_PRACTICE,PROJECTS");
        updateReq.setExplanationStyle("STEP_BY_STEP");
        updateReq.setPracticeStyle("CODING_PROBLEMS");
        updateReq.setAdditionalContext("I want to master Spring Boot and React for campus placements.");

        mockMvc.perform(put("/api/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.careerGoal").value("Senior Full-Stack Engineer"))
                .andExpect(jsonPath("$.dailyStudyHours").value(3.0))
                .andExpect(jsonPath("$.completionPercentage", greaterThan(50)));
    }

    @Test
    @DisplayName("Should add, update, search, and delete topic knowledge records with student isolation")
    void shouldManageTopicKnowledge() throws Exception {
        String tokenA = registerAndGetToken("Alice", "alice_skills@example.com", "password123");
        String tokenB = registerAndGetToken("Bob", "bob_skills@example.com", "password123");

        // Alice adds a skill
        TopicKnowledgeRequest skill1 = new TopicKnowledgeRequest("Java Collections", TopicKnowledgeLevel.INTERMEDIATE);
        MvcResult addRes = mockMvc.perform(post("/api/skills")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(skill1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.topicName").value("Java Collections"))
                .andExpect(jsonPath("$.knowledgeLevel").value("INTERMEDIATE"))
                .andReturn();

        JsonNode skillNode = objectMapper.readTree(addRes.getResponse().getContentAsString());
        long skillId = skillNode.get("id").asLong();

        // Alice bulk adds skills
        BulkTopicKnowledgeRequest bulkReq = new BulkTopicKnowledgeRequest(List.of(
                new TopicKnowledgeRequest("Binary Search", TopicKnowledgeLevel.MASTERED),
                new TopicKnowledgeRequest("Dynamic Programming", TopicKnowledgeLevel.BEGINNER)
        ));
        mockMvc.perform(post("/api/skills/bulk")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bulkReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(2)));

        // Alice searches skills
        mockMvc.perform(get("/api/skills?search=java")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].topicName").value("Java Collections"));

        // Alice updates skill level
        mockMvc.perform(patch("/api/skills/" + skillId + "?level=MASTERED")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.knowledgeLevel").value("MASTERED"));

        // Bob should see 0 skills (student isolation)
        mockMvc.perform(get("/api/skills")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Bob cannot delete Alice's skill
        mockMvc.perform(delete("/api/skills/" + skillId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Alice deletes her skill
        mockMvc.perform(delete("/api/skills/" + skillId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should save roadmap and persist task/milestone progress to backend")
    void shouldSaveAndTrackRoadmapProgress() throws Exception {
        String token = registerAndGetToken("Charlie", "charlie@example.com", "password123");

        SaveRoadmapRequest saveReq = new SaveRoadmapRequest();
        saveReq.setTitle("30-Day Java DSA Mastery");
        saveReq.setTopic("Java Data Structures");
        saveReq.setSkillLevel(SkillLevel.INTERMEDIATE);
        saveReq.setTargetDays(30);
        saveReq.setHoursPerDay(2.0);
        saveReq.setRoadmapJson("{\"overview\":\"Master Java DSA\",\"phases\":[]}");

        MvcResult saveRes = mockMvc.perform(post("/api/ai/roadmaps/save")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("30-Day Java DSA Mastery"))
                .andExpect(jsonPath("$.progressPercentage").value(0))
                .andReturn();

        JsonNode savedNode = objectMapper.readTree(saveRes.getResponse().getContentAsString());
        long roadmapId = savedNode.get("id").asLong();

        // Update progress
        UpdateRoadmapProgressRequest progReq = new UpdateRoadmapProgressRequest();
        progReq.setCompletedTasksJson("[\"0-task-1\",\"0-task-2\"]");
        progReq.setCompletedMilestonesJson("[\"0-0\"]");
        progReq.setProgressPercentage(25);

        mockMvc.perform(patch("/api/ai/roadmaps/" + roadmapId + "/progress")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(progReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercentage").value(25))
                .andExpect(jsonPath("$.completedTasksJson").value("[\"0-task-1\",\"0-task-2\"]"));

        // Fetch saved roadmaps list
        mockMvc.perform(get("/api/ai/roadmaps")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].progressPercentage").value(25));
    }
}

