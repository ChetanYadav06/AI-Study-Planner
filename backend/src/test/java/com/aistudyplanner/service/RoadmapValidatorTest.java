package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.dto.RoadmapResponse.DailyTask;
import com.aistudyplanner.dto.RoadmapResponse.WeeklyPhase;
import com.aistudyplanner.entity.SkillLevel;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class RoadmapValidatorTest {

    private RoadmapValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        validator = new RoadmapValidator();
        objectMapper = new ObjectMapper();
    }

    private RoadmapRequest createSampleRequest(String topic, int days, double hours) {
        RoadmapRequest req = new RoadmapRequest();
        req.setTopic(topic);
        req.setDescription("Comprehensive foundational and applied study for " + topic);
        req.setSkillLevel(SkillLevel.INTERMEDIATE);
        req.setTargetDays(days);
        req.setHoursPerDay(hours);
        return req;
    }

    private RoadmapResponse createValidResponse(int days, double hours, String topic) {
        RoadmapResponse res = new RoadmapResponse();
        res.setId("roadmap_valid_1");
        res.setTopic(topic);
        res.setTargetDays(days);
        res.setHoursPerDay(hours);

        WeeklyPhase phase = new WeeklyPhase();
        phase.setPhaseNumber(1);
        phase.setPhaseTitle("Phase 1: Foundations of " + topic);
        phase.setDurationDays(days);
        phase.setTopics(List.of(topic + " Core Concepts"));

        List<DailyTask> tasks = new ArrayList<>();
        String[] acts = {"STUDY", "CODING_PRACTICE", "PROJECT"};
        for (int i = 1; i <= days; i++) {
            DailyTask task = new DailyTask();
            task.setDayNumber(i);
            task.setTitle("Day " + i + ": " + topic + " Module " + i);
            task.setDescription("Master core mechanics and apply practical hands-on examples for " + topic + ".");
            task.setEstimatedMinutes((int) (hours * 60));
            task.setActivityType(acts[(i - 1) % acts.length]);
            tasks.add(task);
        }
        phase.setDailyTasks(tasks);
        res.setPhases(List.of(phase));
        return res;
    }

    @Test
    @DisplayName("Valid roadmap passes all quality validation checks")
    void testValidRoadmapPasses() {
        RoadmapRequest req = createSampleRequest("Machine Learning", 14, 2.0);
        RoadmapResponse res = createValidResponse(14, 2.0, "Machine Learning");

        List<String> errors = validator.validate(res, req);
        assertTrue(errors.isEmpty(), "Expected no validation errors but found: " + errors);
    }

    @Test
    @DisplayName("Roadmap 9 JSON gives exactly 45 unique task IDs")
    void testRoadmap9UniqueTaskIds() throws Exception {
        SavedRoadmapService service = new SavedRoadmapService(null, null, null, objectMapper);
        String r9Json = getRoadmap9Json();
        assertNotNull(r9Json, "Roadmap 9 JSON should be present");

        Set<String> validIds = service.extractValidTaskIds(r9Json);
        assertEquals(45, validIds.size(), "Roadmap 9 should have exactly 45 unique task IDs");
    }

    @Test
    @DisplayName("Should reject roadmap with wrong day count")
    void testRejectWrongDayCount() {
        RoadmapRequest req = createSampleRequest("Machine Learning", 10, 2.0);
        RoadmapResponse res = createValidResponse(8, 2.0, "Machine Learning"); // only 8 tasks

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("does not match target days")));
    }

    @Test
    @DisplayName("Should reject task exceeding daily minutes target beyond tolerance")
    void testRejectTooManyMinutes() {
        RoadmapRequest req = createSampleRequest("Machine Learning", 5, 2.0); // 120 min allowance + 15% = 138 min
        RoadmapResponse res = createValidResponse(5, 2.0, "Machine Learning");
        res.getPhases().get(0).getDailyTasks().get(0).setEstimatedMinutes(180); // 180 > 138

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("exceeds daily target allowance")));
    }

    @Test
    @DisplayName("Should reject invalid activityType")
    void testRejectBadActivityType() {
        RoadmapRequest req = createSampleRequest("Machine Learning", 5, 2.0);
        RoadmapResponse res = createValidResponse(5, 2.0, "Machine Learning");
        res.getPhases().get(0).getDailyTasks().get(0).setActivityType("WATCH_NETFLIX");

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("Invalid activityType")));
    }

    @Test
    @DisplayName("Should reject duplicate task titles")
    void testRejectDuplicateTitles() {
        RoadmapRequest req = createSampleRequest("Machine Learning", 5, 2.0);
        RoadmapResponse res = createValidResponse(5, 2.0, "Machine Learning");
        res.getPhases().get(0).getDailyTasks().get(1).setTitle(res.getPhases().get(0).getDailyTasks().get(0).getTitle());

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("Duplicate task title")));
    }

    @Test
    @DisplayName("Should reject off-topic roadmap where tasks do not match goal topic")
    void testRejectOffTopicRoadmap() {
        RoadmapRequest req = createSampleRequest("Machine Learning & Generative AI", 5, 2.0);
        req.setDescription("Neural networks, PyTorch, LLMs, and prompt engineering.");

        RoadmapResponse res = new RoadmapResponse();
        res.setId("roadmap_offtopic");
        res.setTopic("Algorithms");
        res.setTargetDays(5);
        res.setHoursPerDay(2.0);

        WeeklyPhase phase = new WeeklyPhase();
        phase.setPhaseNumber(1);
        phase.setPhaseTitle("Phase 1: Data Structures");
        phase.setDurationDays(5);
        phase.setTopics(List.of("Hashing", "Binary Search"));

        List<DailyTask> tasks = new ArrayList<>();
        String[] titles = {
            "Problem Patterns: Hashing and Frequency Maps",
            "Binary Search Range Invariants",
            "Graph Traversal via DFS",
            "Breadth First Search Shortest Path",
            "Dynamic Programming Memoization"
        };
        for (int i = 1; i <= 5; i++) {
            DailyTask t = new DailyTask();
            t.setDayNumber(i);
            t.setTitle(titles[i - 1]);
            t.setDescription("Classic competitive programming problem patterns.");
            t.setEstimatedMinutes(120);
            t.setActivityType("CODING_PRACTICE");
            tasks.add(t);
        }
        phase.setDailyTasks(tasks);
        res.setPhases(List.of(phase));

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("Roadmap off-topic")));
    }

    @Test
    @DisplayName("Shared task ID fixture verification against canonical generator")
    void testSharedTaskIdFixture() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("task-id-fixtures.json");
        assertNotNull(stream, "task-id-fixtures.json should exist on classpath");

        JsonNode root = objectMapper.readTree(stream);
        JsonNode testCases = root.get("testCases");
        assertNotNull(testCases);

        for (JsonNode tc : testCases) {
            int phaseIdx = tc.get("phaseIndex").asInt();
            JsonNode tasks = tc.get("tasks");
            JsonNode expectedIds = tc.get("expectedCanonicalIds");

            Map<String, Integer> suffixCounts = new HashMap<>();
            for (int tIdx = 0; tIdx < tasks.size(); tIdx++) {
                JsonNode taskNode = tasks.get(tIdx);
                String expectedId = expectedIds.get(tIdx).asText();

                String customId = taskNode.hasNonNull("id") ? taskNode.get("id").asText() : null;
                Integer dayNumber = taskNode.hasNonNull("dayNumber") ? taskNode.get("dayNumber").asInt() : null;

                String generated = RoadmapValidator.generateCanonicalTaskId(phaseIdx, dayNumber, customId, tIdx, suffixCounts);
                assertEquals(expectedId, generated, "Discrepancy for " + tc.get("description").asText());

                // Also verify SavedRoadmapService.getCanonicalTaskId gives identical result
                Map<String, Integer> serviceCounts = new HashMap<>();
                for (int j = 0; j < tIdx; j++) {
                    JsonNode prev = tasks.get(j);
                    SavedRoadmapService.getCanonicalTaskId(phaseIdx, prev, j, serviceCounts);
                }
                String serviceGenerated = SavedRoadmapService.getCanonicalTaskId(phaseIdx, taskNode, tIdx, serviceCounts);
                assertEquals(expectedId, serviceGenerated, "SavedRoadmapService discrepancy for " + tc.get("description").asText());
            }
        }
    }

    @Test
    @DisplayName("Roadmap 9 fails the 60% single activity type rule (36/45 CODING_PRACTICE > 60%)")
    void testRoadmap9FailsSixtyPercentActivityRule() {
        RoadmapRequest req = createSampleRequest("Machine Learning & Generative AI", 45, 2.0);
        RoadmapResponse res = new RoadmapResponse();
        res.setId("roadmap_9_sim");
        res.setTopic("Machine Learning & Generative AI");
        res.setTargetDays(45);
        res.setHoursPerDay(2.0);

        int currentDay = 1;
        int[] phaseDays = {7, 10, 10, 10, 8};
        List<WeeklyPhase> phases = new ArrayList<>();

        // In Roadmap 9: 36 tasks are CODING_PRACTICE, 5 are STUDY, 4 are REVIEW (3 distinct types, but CODING_PRACTICE = 80%)
        int codingPracticeAssigned = 0;
        for (int p = 0; p < phaseDays.length; p++) {
            WeeklyPhase phase = new WeeklyPhase();
            phase.setPhaseNumber(p + 1);
            phase.setPhaseTitle("Phase " + (p + 1) + ": ML Module");
            phase.setDurationDays(phaseDays[p]);
            phase.setTopics(List.of("Machine Learning", "Generative AI"));

            List<DailyTask> tasks = new ArrayList<>();
            for (int d = 0; d < phaseDays[p]; d++) {
                DailyTask t = new DailyTask();
                t.setDayNumber(currentDay);
                t.setTitle("Day " + currentDay + " Machine Learning Exercise");
                t.setDescription("Implement neural network algorithms in Python.");
                t.setEstimatedMinutes(120);

                if (codingPracticeAssigned < 36) {
                    t.setActivityType("CODING_PRACTICE");
                    codingPracticeAssigned++;
                } else if (codingPracticeAssigned < 41) {
                    t.setActivityType("STUDY");
                    codingPracticeAssigned++;
                } else {
                    t.setActivityType("REVIEW");
                    codingPracticeAssigned++;
                }
                tasks.add(t);
                currentDay++;
            }
            phase.setDailyTasks(tasks);
            phases.add(phase);
        }
        res.setPhases(phases);

        List<String> errors = validator.validate(res, req);
        assertFalse(errors.isEmpty(), "Roadmap 9 shape should fail 60% activity cap");
        assertTrue(errors.stream().anyMatch(e -> e.contains("Activity type 'CODING_PRACTICE' makes up 80.0% of tasks")),
                "Expected 60% rule failure error, found: " + errors);
    }

    private String getRoadmap9Json() {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"phases\":[");
        int currentDay = 1;
        int[] phaseDays = {7, 10, 10, 10, 8};
        for (int p = 0; p < phaseDays.length; p++) {
            if (p > 0) sb.append(",");
            sb.append("{\"phaseNumber\":").append(p + 1).append(",\"dailyTasks\":[");
            for (int d = 0; d < phaseDays[p]; d++) {
                if (d > 0) sb.append(",");
                sb.append("{\"dayNumber\":").append(currentDay++).append(",\"title\":\"Task ").append(currentDay).append("\"}");
            }
            sb.append("]}");
        }
        sb.append("]}");
        return sb.toString();
    }
}
