package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.entity.StudentProfile;
import com.aistudyplanner.entity.StudentTopicKnowledge;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import com.aistudyplanner.exception.RoadmapGenerationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private GeminiTestService geminiTestService;

    private RoadmapValidator roadmapValidator;
    private RoadmapService roadmapService;

    @BeforeEach
    void setUp() {
        roadmapValidator = new RoadmapValidator();
        roadmapService = new RoadmapService(geminiTestService, roadmapValidator, null, null);
    }

    @Test
    @DisplayName("Should correctly generate and parse structured JSON roadmap from Gemini")
    void shouldGenerateAndParseStructuredJsonRoadmap() {
        String mockJsonResponse = """
            {
              "overview": "Master enterprise Full-Stack Java with Spring Boot and React.",
              "feasibilityNote": "Ideal timeline: 6 hours over 3 days allows focused practice.",
              "totalStudyHours": 6.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Basic Java syntax", "HTML/CSS fundamentals"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Full-Stack Java Core",
                  "durationDays": 3,
                  "topics": ["Full-Stack Java Foundations", "REST Controllers", "React Integration"],
                  "subtopics": ["@RestController", "Repository interfaces", "React setup"],
                  "milestones": ["Build CRUD REST API", "Connect React UI"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Setup Full-Stack Java project",
                      "description": "Initialize via Spring Initializr and verify hello world endpoint.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Build Full-Stack Java REST Controllers",
                      "description": "Create REST API endpoints with Spring Boot and JPA entities.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Connect Full-Stack Java frontend client",
                      "description": "Build React interface and test complete integration.",
                      "estimatedMinutes": 120,
                      "activityType": "PROJECT"
                    }
                  ],
                  "practicalExercises": [
                    {
                      "title": "Mini Student Directory API",
                      "instructions": "Create GET /students and POST /students with in-memory H2.",
                      "difficulty": "BEGINNER"
                    }
                  ],
                  "assessment": {
                    "title": "Phase 1 Checkpoint",
                    "type": "PROJECT",
                    "description": "Submit a working student API with unit tests.",
                    "passingCriteria": "All endpoints respond with 200/201 and tests pass."
                  }
                }
              ],
              "learningResources": [
                {
                  "title": "Official Spring Boot Guides",
                  "url": "https://spring.io/guides",
                  "type": "DOCUMENTATION",
                  "relevance": "Authoritative quickstart tutorials.",
                  "isVerified": true
                }
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(mockJsonResponse);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Full-Stack Java");
        request.setDescription("Master enterprise apps with Full-Stack Java");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(3);
        request.setHoursPerDay(2.0);
        request.setSpecificTopics("Spring Boot, React");
        request.setTargetOutcomes("Build enterprise web app");
        request.setPriorKnowledge("Basic Java");

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("Full-Stack Java", response.getTopic());
        assertEquals("BEGINNER", response.getSkillLevel());
        assertEquals(3, response.getTargetDays());
        assertEquals(2.0, response.getHoursPerDay());
        assertEquals(6.0, response.getTotalStudyHours());
        assertNotNull(response.getFeasibilityNote());
        assertEquals(1, response.getPhases().size());
        assertEquals(3, response.getPhases().get(0).getDailyTasks().size());
    }

    @Test
    @DisplayName("Should extract JSON from markdown wrapped codeblock")
    void shouldParseMarkdownWrappedJson() {
        String wrappedJson = """
            ```json
            {
              "overview": "Learn Docker basics and image creation.",
              "feasibilityNote": "Great pace for 2 days.",
              "totalStudyHours": 4.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Linux CLI"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Docker Basics",
                  "durationDays": 2,
                  "topics": ["Containers", "Images"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Docker Architecture",
                      "description": "Learn daemon and client basics in Docker.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Build First Dockerfile",
                      "description": "Write a multi-stage Docker container file.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    }
                  ]
                }
              ]
            }
            ```
            """;

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(wrappedJson);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Docker Containers");
        request.setDescription("Master Docker container deployment");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(2);
        request.setHoursPerDay(2.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("Docker Containers", response.getTopic());
        assertEquals(1, response.getPhases().size());
        assertEquals(2, response.getPhases().get(0).getDailyTasks().size());
    }

    @Test
    @DisplayName("Should throw RoadmapGenerationException without silent fallback when unparseable")
    void shouldThrowRoadmapGenerationExceptionOnUnparseableResponse() {
        String legacyText = "OVERVIEW: Invalid text response that is not JSON";

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(legacyText);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Spring Core");
        request.setSkillLevel(SkillLevel.INTERMEDIATE);
        request.setTargetDays(7);
        request.setHoursPerDay(2.0);

        RoadmapGenerationException ex = assertThrows(RoadmapGenerationException.class, () ->
                roadmapService.generateRoadmap(request)
        );
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
        assertTrue(ex.getMessage().contains("unparseable response"));
    }

    @Test
    @DisplayName("Should include personalization inputs in generated prompt")
    void shouldIncorporatePersonalizationInputsInPrompt() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Microservices Architecture");
        request.setDescription("Design resilient microservices");
        request.setSkillLevel(SkillLevel.ADVANCED);
        request.setTargetDays(21);
        request.setHoursPerDay(3.0);
        request.setSpecificTopics("Kafka event streaming, gRPC");
        request.setTargetOutcomes("Deploy fault-tolerant cluster");
        request.setPriorKnowledge("Senior Java Developer, Docker expert");

        String prompt = roadmapService.buildPrompt(request);

        assertNotNull(prompt);
        assertTrue(prompt.contains("Microservices Architecture"));
        assertTrue(prompt.contains("Kafka event streaming, gRPC"));
        assertTrue(prompt.contains("Deploy fault-tolerant cluster"));
        assertTrue(prompt.contains("Senior Java Developer, Docker expert"));
        assertTrue(prompt.contains("63.0 hours"));
        assertTrue(prompt.contains("ADVANCED"));
    }

    @Test
    @DisplayName("Should place primary subject directive before student preferences in prompt")
    void shouldPlaceSubjectBeforePreferencesInPrompt() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning & PyTorch");
        request.setDescription("Deep learning foundations");
        request.setSkillLevel(SkillLevel.INTERMEDIATE);
        request.setTargetDays(14);
        request.setHoursPerDay(2.0);

        StudentProfile profile = new StudentProfile();
        profile.setCareerGoal("ML Engineer");
        profile.setPracticeStyle("Algorithmic Challenges");

        String prompt = roadmapService.buildPrompt(request, profile, List.of());

        int subjectIdx = prompt.indexOf("[SUBJECT & CURRICULUM GOAL - PRIMARY DIRECTIVE]");
        int prefIdx = prompt.indexOf("[STUDENT FORMAT & PEDAGOGY PREFERENCES]");

        assertTrue(subjectIdx >= 0, "Prompt must include primary subject directive");
        assertTrue(prefIdx >= 0, "Prompt must include student preferences");
        assertTrue(subjectIdx < prefIdx, "Subject directive must appear before student preferences");
    }

    @Test
    @DisplayName("Should omit unrated topics from prompt knowledge constraints")
    void shouldOmitUnratedTopicsFromPrompt() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(7);
        request.setHoursPerDay(1.5);

        StudentTopicKnowledge unrated = new StudentTopicKnowledge();
        unrated.setTopicName("Linear Algebra Fundamentals");
        unrated.setKnowledgeLevel(TopicKnowledgeLevel.INTERMEDIATE);
        unrated.setRatedByUser(false);

        String prompt = roadmapService.buildPrompt(request, null, List.of(unrated));

        assertFalse(prompt.contains("Linear Algebra Fundamentals"),
                "Unrated topics must NOT be injected into the prompt constraints");
    }

    @Test
    @DisplayName("Should include rated topics in prompt knowledge constraints")
    void shouldIncludeRatedTopicsInKnowledgeConstraints() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(7);
        request.setHoursPerDay(1.5);

        StudentTopicKnowledge rated = new StudentTopicKnowledge();
        rated.setTopicName("NumPy Arrays");
        rated.setKnowledgeLevel(TopicKnowledgeLevel.MASTERED);
        rated.setRatedByUser(true);

        String prompt = roadmapService.buildPrompt(request, null, List.of(rated));

        assertTrue(prompt.contains("[KNOWLEDGE-AWARE CONSTRAINTS]"));
        assertTrue(prompt.contains("NumPy Arrays"));
        assertTrue(prompt.contains("ALREADY MASTERED"));
    }

    @Test
    @DisplayName("Should omit entire knowledge constraints block when no rated topics exist")
    void shouldOmitKnowledgeConstraintsBlockWhenNoRatedTopics() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(7);
        request.setHoursPerDay(1.5);

        StudentTopicKnowledge unrated1 = new StudentTopicKnowledge();
        unrated1.setTopicName("Topic A");
        unrated1.setKnowledgeLevel(TopicKnowledgeLevel.NOT_LEARNED);
        unrated1.setRatedByUser(false);

        StudentTopicKnowledge unrated2 = new StudentTopicKnowledge();
        unrated2.setTopicName("Topic B");
        unrated2.setKnowledgeLevel(TopicKnowledgeLevel.BEGINNER);
        unrated2.setRatedByUser(false);

        String prompt = roadmapService.buildPrompt(request, null, List.of(unrated1, unrated2));

        assertFalse(prompt.contains("[KNOWLEDGE-AWARE CONSTRAINTS]"),
                "Knowledge constraints block should not exist when no topics are rated by user");
    }

    @Test
    @DisplayName("Should include format-only preference rule with ML/DSA distinction")
    void shouldIncludePreferenceIsFormatOnlyDirectiveInPrompt() {
        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning");
        request.setSkillLevel(SkillLevel.INTERMEDIATE);
        request.setTargetDays(10);
        request.setHoursPerDay(2.0);

        StudentProfile profile = new StudentProfile();
        profile.setPracticeStyle("Code Challenges");

        String prompt = roadmapService.buildPrompt(request, profile, List.of());

        assertTrue(prompt.contains("Learning preferences and practice styles only modify the FORMAT of tasks, never the subject itself."));
        assertTrue(prompt.contains("For example, if the goal is Machine Learning and the practice style is Algorithmic Challenges, practice tasks MUST be ML/Python exercises"));
    }

    @Test
    @DisplayName("Should strictly validate URL hosts against allowlist")
    void shouldEnforceHostAllowlist() {
        assertTrue(roadmapService.isAllowedUrl("https://docs.python.org/3/tutorial/"));
        assertTrue(roadmapService.isAllowedUrl("https://subdomain.docs.python.org/api"));
        assertTrue(roadmapService.isAllowedUrl("https://pytorch.org/docs/stable/"));
        assertTrue(roadmapService.isAllowedUrl("https://scikit-learn.org/stable/"));

        // Reject spoofed subdomain suffix
        assertFalse(roadmapService.isAllowedUrl("https://pytorch.org.evil.com/exploit"));
        // Reject non-http/https
        assertFalse(roadmapService.isAllowedUrl("ftp://docs.python.org/download"));
        assertFalse(roadmapService.isAllowedUrl("javascript:alert(1)"));
        // Reject invalid URL strings
        assertFalse(roadmapService.isAllowedUrl("not-a-valid-url"));
        assertFalse(roadmapService.isAllowedUrl(null));
        assertFalse(roadmapService.isAllowedUrl(""));
    }

    @Test
    @DisplayName("Should abort retry when remaining deadline budget is less than 40 seconds")
    void shouldAbortRetryWhenRemainingBudgetLessThanFortySeconds() {
        // Construct RoadmapService with a short 30-second budget (< 40s)
        RoadmapService shortBudgetService = new RoadmapService(
                geminiTestService,
                roadmapValidator,
                null,
                null,
                30,
                RoadmapService.DEFAULT_ALLOWED_HOSTS
        );

        when(geminiTestService.askGeminiJson(anyString())).thenReturn("Not valid JSON output");

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Deep Learning");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(5);
        request.setHoursPerDay(1.0);

        RoadmapGenerationException ex = assertThrows(RoadmapGenerationException.class, () ->
                shortBudgetService.generateRoadmap(request)
        );

        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        assertTrue(ex.getMessage().contains("exceeded allowed time budget"));
    }

    @Test
    @DisplayName("Should continue roadmap generation when AI relevance reviewer fails")
    void shouldContinueGenerationWhenAIReviewerFails() {
        String validRoadmapJson = """
            {
              "overview": "Python Machine Learning foundations.",
              "feasibilityNote": "Feasible 3 days.",
              "totalStudyHours": 6.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Python"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: ML Fundamentals",
                  "durationDays": 3,
                  "topics": ["Tensors", "Loss Functions", "Gradient Descent"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Intro to Tensors in Machine Learning",
                      "description": "Understand multidimensional arrays and tensor operations.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Implement Loss Functions in Machine Learning",
                      "description": "Calculate Mean Squared Error and Cross Entropy loss.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Day 3: Gradient Descent Project for Machine Learning",
                      "description": "Build a linear regression model from scratch with gradient descent.",
                      "estimatedMinutes": 120,
                      "activityType": "PROJECT"
                    }
                  ]
                }
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString()))
                .thenReturn(validRoadmapJson)
                .thenThrow(new RuntimeException("Simulated AI Reviewer quota exceeded"));

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning Foundations");
        request.setDescription("Master core Machine Learning math and tensor fundamentals");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(3);
        request.setHoursPerDay(2.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals(3, response.getTargetDays());
        assertEquals("Machine Learning Foundations", response.getTopic());
    }

    @Test
    @DisplayName("Should feed off-topic day warnings into retry prompt when reviewer flags tasks")
    void shouldFeedOffTopicDaysIntoRetryPrompt() {
        String offTopicRoadmapJson = """
            {
              "overview": "Machine Learning roadmap.",
              "feasibilityNote": "Feasible 3 days.",
              "totalStudyHours": 6.0,
              "skillLevel": "BEGINNER",
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Fundamentals",
                  "durationDays": 3,
                  "topics": ["Basics", "Algorithms", "Capstone"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Machine Learning Tensor Overview",
                      "description": "Study core Machine Learning concepts.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Competitive Programming Two Pointers",
                      "description": "Solve unrelated LeetCode algorithmic puzzle.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Day 3: Machine Learning Project",
                      "description": "Train linear model.",
                      "estimatedMinutes": 120,
                      "activityType": "PROJECT"
                    }
                  ]
                }
              ]
            }
            """;

        String reviewerOffTopicFlag = """
            {
              "offTopicDays": [
                {
                  "dayNumber": 2,
                  "reason": "Teaches competitive programming two-pointers instead of Machine Learning"
                }
              ]
            }
            """;

        String fixedRoadmapJson = """
            {
              "overview": "Machine Learning roadmap.",
              "feasibilityNote": "Feasible 3 days.",
              "totalStudyHours": 6.0,
              "skillLevel": "BEGINNER",
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Phase 1: Fundamentals",
                  "durationDays": 3,
                  "topics": ["Basics", "Loss Functions", "Capstone"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Day 1: Machine Learning Tensor Overview",
                      "description": "Study core Machine Learning concepts.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    },
                    {
                      "dayNumber": 2,
                      "title": "Day 2: Machine Learning Loss Optimization",
                      "description": "Implement mean squared error for regression.",
                      "estimatedMinutes": 120,
                      "activityType": "CODING_PRACTICE"
                    },
                    {
                      "dayNumber": 3,
                      "title": "Day 3: Machine Learning Project",
                      "description": "Train linear model.",
                      "estimatedMinutes": 120,
                      "activityType": "PROJECT"
                    }
                  ]
                }
              ]
            }
            """;

        String reviewerAllClean = "{ \"offTopicDays\": [] }";

        org.mockito.stubbing.OngoingStubbing<String> stubbing = when(geminiTestService.askGeminiJson(anyString()));
        stubbing.thenReturn(offTopicRoadmapJson)   // 1. Initial generation
                .thenReturn(reviewerOffTopicFlag) // 2. AI Reviewer flags day 2
                .thenReturn(fixedRoadmapJson)      // 3. Retry generation
                .thenReturn(reviewerAllClean);     // 4. AI Reviewer cleans retry

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Machine Learning Foundations");
        request.setDescription("Master core Machine Learning math and tensor fundamentals");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(3);
        request.setHoursPerDay(2.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals(3, response.getTargetDays());
    }
}
