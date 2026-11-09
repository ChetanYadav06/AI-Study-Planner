package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.exception.RoadmapGenerationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

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
}
