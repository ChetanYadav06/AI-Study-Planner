package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.entity.SkillLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private GeminiTestService geminiTestService;

    @InjectMocks
    private RoadmapService roadmapService;

    @Test
    @DisplayName("Should correctly generate and parse structured JSON roadmap from Gemini")
    void shouldGenerateAndParseStructuredJsonRoadmap() {
        String mockJsonResponse = """
            {
              "overview": "Master enterprise Full-Stack Java with Spring Boot 3.4 and React 19.",
              "feasibilityNote": "Ideal timeline: 30 hours over 15 days allows in-depth practice.",
              "totalStudyHours": 30.0,
              "skillLevel": "BEGINNER",
              "prerequisites": ["Basic Java syntax", "HTML/CSS fundamentals"],
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "Spring Boot & REST Core",
                  "durationDays": 7,
                  "topics": ["Dependency Injection", "REST Controllers", "Spring Data JPA"],
                  "subtopics": ["@RestController", "Repository interfaces", "H2 database setup"],
                  "milestones": ["Build CRUD REST API", "Implement JPA Entity mapping"],
                  "dailyTasks": [
                    {
                      "dayNumber": 1,
                      "title": "Setup Spring Boot project",
                      "description": "Initialize via Spring Initializr and verify hello world endpoint.",
                      "estimatedMinutes": 120,
                      "activityType": "STUDY"
                    }
                  ],
                  "practicalExercises": [
                    {
                      "title": "Student Management API",
                      "instructions": "Create a fully functioning REST API with GET and POST endpoints.",
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
        request.setDescription("Master enterprise apps");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(15);
        request.setHoursPerDay(2.0);
        request.setSpecificTopics("Spring Boot, React");
        request.setTargetOutcomes("Build enterprise web app");
        request.setPriorKnowledge("Basic Java");

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("Full-Stack Java", response.getTopic());
        assertEquals("BEGINNER", response.getSkillLevel());
        assertEquals(15, response.getTargetDays());
        assertEquals(2.0, response.getHoursPerDay());
        assertEquals(30.0, response.getTotalStudyHours());
        assertNotNull(response.getFeasibilityNote());

        assertEquals(2, response.getPrerequisites().size());
        assertEquals(1, response.getPhases().size());

        RoadmapResponse.WeeklyPhase phase = response.getPhases().get(0);
        assertEquals("Spring Boot & REST Core", phase.getPhaseTitle());
        assertEquals(1, phase.getDailyTasks().size());
        assertEquals("Setup Spring Boot project", phase.getDailyTasks().get(0).getTitle());
        assertEquals(1, phase.getPracticalExercises().size());
        assertNotNull(phase.getAssessment());

        // Check backward compatibility
        assertNotNull(response.getResources());
        assertFalse(response.getResources().isEmpty());
        assertTrue(response.getResources().get(0).contains("Official Spring Boot Guides"));
    }

    @Test
    @DisplayName("Should parse markdown-wrapped JSON code blocks gracefully")
    void shouldParseMarkdownWrappedJson() {
        String wrappedJson = """
            ```json
            {
              "overview": "React 19 Deep Dive.",
              "feasibilityNote": "Feasible with disciplined daily focus.",
              "totalStudyHours": 14.0,
              "phases": [
                {
                  "phaseNumber": 1,
                  "phaseTitle": "React Hooks & State",
                  "durationDays": 7,
                  "topics": ["useState", "useEffect", "useMemo"],
                  "milestones": ["Build dynamic dashboard"]
                }
              ],
              "learningResources": [
                {
                  "title": "React Docs",
                  "url": "https://react.dev",
                  "type": "DOCUMENTATION",
                  "relevance": "Primary documentation"
                }
              ]
            }
            ```
            """;

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(wrappedJson);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("React 19");
        request.setSkillLevel(SkillLevel.INTERMEDIATE);
        request.setTargetDays(7);
        request.setHoursPerDay(2.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("React 19", response.getTopic());
        assertEquals(1, response.getPhases().size());
        assertEquals("React Hooks & State", response.getPhases().get(0).getPhaseTitle());
        assertEquals("7 days", response.getPhases().get(0).getDuration());
        assertEquals(1, response.getLearningResources().size());
        assertTrue(response.getLearningResources().get(0).isVerified());
    }

    @Test
    @DisplayName("Should auto-repair incomplete JSON with missing fields and bad URLs")
    void shouldAutoRepairMissingFieldsAndBadUrls() {
        String partialJson = """
            {
              "phases": [
                {
                  "duration": "5 days"
                }
              ],
              "learningResources": [
                {
                  "title": "Invalid Resource",
                  "url": "not-a-valid-url"
                }
              ]
            }
            """;

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(partialJson);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Docker & Kubernetes");
        request.setSkillLevel(SkillLevel.BEGINNER);
        request.setTargetDays(5);
        request.setHoursPerDay(1.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("Docker & Kubernetes", response.getTopic());
        assertEquals(5.0, response.getTotalStudyHours());
        assertNotNull(response.getFeasibilityNote());
        assertTrue(response.getFeasibilityNote().toLowerCase().contains("accelerated pace"));

        assertEquals(1, response.getPhases().size());
        assertEquals("Phase 1", response.getPhases().get(0).getPhaseTitle());
        assertEquals(5, response.getPhases().get(0).getDurationDays());

        // Verify invalid URL was marked unverified
        assertEquals(1, response.getLearningResources().size());
        assertFalse(response.getLearningResources().get(0).isVerified());
    }

    @Test
    @DisplayName("Should fallback cleanly to legacy text parsing when Gemini returns plain text")
    void shouldFallbackToLegacyTextParsingGracefully() {
        String legacyText = """
            OVERVIEW
            Master Spring Boot and build enterprise APIs.

            PHASES
            PHASE: Spring Core & Context
            DURATION: 7 days
            TOPICS: Dependency Injection | IoC Container | Bean Lifecycle
            MILESTONES: Configured Spring App | Verified Beans

            RESOURCES
            - https://spring.io (Official Docs)
            - Baeldung Spring Guides
            """;

        when(geminiTestService.askGeminiJson(anyString())).thenReturn(legacyText);

        RoadmapRequest request = new RoadmapRequest();
        request.setTopic("Spring Core");
        request.setSkillLevel(SkillLevel.INTERMEDIATE);
        request.setTargetDays(7);
        request.setHoursPerDay(2.0);

        RoadmapResponse response = roadmapService.generateRoadmap(request);

        assertNotNull(response);
        assertEquals("Spring Core", response.getTopic());
        assertNotNull(response.getOverview());
        assertTrue(response.getOverview().contains("Master Spring Boot"));
        assertEquals(1, response.getPhases().size());
        assertEquals("Spring Core & Context", response.getPhases().get(0).getPhaseTitle());
        assertEquals(3, response.getPhases().get(0).getTopics().size());
        assertEquals(2, response.getResources().size());
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
