package com.aistudyplanner.service;

import com.aistudyplanner.dto.DayExtraTopicResponse;
import com.aistudyplanner.dto.DayTopicsAndExpansionsResponse;
import com.aistudyplanner.dto.TopicExpansionRequest;
import com.aistudyplanner.dto.TopicExpansionResponse;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.TopicExpansion;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.DayExtraTopicRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.TopicExpansionRepository;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TopicExpansionServiceTest {

    @Mock
    private SavedRoadmapRepository roadmapRepository;

    @Mock
    private TopicExpansionRepository topicExpansionRepository;

    @Mock
    private DayExtraTopicRepository dayExtraTopicRepository;

    @Mock
    private GeminiTestService geminiTestService;

    private SlidingWindowRateLimiter rateLimiter;
    private TopicExpansionService service;
    private ObjectMapper objectMapper;

    private User alice;
    private SavedRoadmap aliceRoadmap;
    private final String initialRoadmapJson = "{\"topic\":\"Docker Mastery\",\"targetDays\":30,\"phases\":[{\"phaseNumber\":1,\"dailyTasks\":[{\"dayNumber\":1,\"title\":\"Docker Architecture\",\"topics\":[{\"title\":\"Container vs VM\",\"summary\":\"Differences in isolation\"}]}]}]}";

    @BeforeEach
    void setUp() {
        rateLimiter = new SlidingWindowRateLimiter();
        objectMapper = new ObjectMapper();
        service = new TopicExpansionService(
                roadmapRepository,
                topicExpansionRepository,
                dayExtraTopicRepository,
                geminiTestService,
                rateLimiter,
                objectMapper
        );

        alice = new User("Alice", "alice@example.com", "pass");
        aliceRoadmap = new SavedRoadmap();
        aliceRoadmap.setId(101L);
        aliceRoadmap.setUser(alice);
        aliceRoadmap.setTopic("Docker Mastery");
        aliceRoadmap.setTargetDays(30);
        aliceRoadmap.setRoadmapJson(initialRoadmapJson);
    }

    @Test
    void shouldExpandTopicLevel1SuccessfullyAndPreserveRoadmapJson() {
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Container vs VM", 1))
                .thenReturn(Optional.empty());
        when(geminiTestService.askGemini(anyString()))
                .thenReturn("### 1. Mental Model\nContainers share host kernel.\n```bash\ndocker run alpine\n```");

        TopicExpansion savedEntity = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 1, "### 1. Mental Model\nContainers share host kernel.\n```bash\ndocker run alpine\n```");
        when(topicExpansionRepository.save(any(TopicExpansion.class))).thenReturn(savedEntity);

        TopicExpansionResponse response = service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest("Container vs VM", 1));

        assertNotNull(response);
        assertEquals(1, response.getLevel());
        assertEquals("Container vs VM", response.getTopicTitle());
        assertFalse(response.isCached());
        assertTrue(response.getMarkdownContent().contains("Containers share host kernel"));

        // Design Principle 9 verification: Stored roadmapJson must be byte-for-byte identical!
        assertEquals(initialRoadmapJson, aliceRoadmap.getRoadmapJson());
        verify(geminiTestService, times(1)).askGemini(anyString());
    }

    @Test
    void shouldReturnCachedExpansionWithoutCallingGemini() {
        TopicExpansion cachedEntity = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 1, "Cached markdown");
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Container vs VM", 1))
                .thenReturn(Optional.of(cachedEntity));

        TopicExpansionResponse response = service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest("Container vs VM", 1));

        assertNotNull(response);
        assertTrue(response.isCached());
        assertEquals("Cached markdown", response.getMarkdownContent());
        verify(geminiTestService, never()).askGemini(anyString());
    }

    @Test
    void shouldRejectLevel2WhenLevel1DoesNotExistWithConflict() {
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Container vs VM", 1))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest("Container vs VM", 2))
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Level 1 expansion must exist before requesting Level 2"));
    }

    @Test
    void shouldAllowLevel2WhenLevel1Exists() {
        TopicExpansion l1Entity = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 1, "L1 Content");
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Container vs VM", 1))
                .thenReturn(Optional.of(l1Entity));
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Container vs VM", 2))
                .thenReturn(Optional.empty());
        when(geminiTestService.askGemini(anyString()))
                .thenReturn("### Architecture & Trade-offs\nNamespaces and cgroups.");

        TopicExpansion l2Saved = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 2, "### Architecture & Trade-offs\nNamespaces and cgroups.");
        when(topicExpansionRepository.save(any(TopicExpansion.class))).thenReturn(l2Saved);

        TopicExpansionResponse response = service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest("Container vs VM", 2));

        assertNotNull(response);
        assertEquals(2, response.getLevel());
        assertFalse(response.isCached());
        assertTrue(response.getMarkdownContent().contains("Namespaces and cgroups"));
    }

    @Test
    void shouldRejectWhenUserDoesNotOwnRoadmap() {
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.expandTopic("bob@example.com", 101L, 1, new TopicExpansionRequest("Container vs VM", 1))
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void shouldEnforceRateLimitAfterThirtyCallsPerHour() {
        when(roadmapRepository.findById(101L)).thenReturn(aliceRoadmap != null ? Optional.of(aliceRoadmap) : Optional.empty());
        when(geminiTestService.askGemini(anyString())).thenReturn("Sample markdown content");
        when(topicExpansionRepository.save(any(TopicExpansion.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Perform 30 successful non-cached requests
        for (int i = 1; i <= 30; i++) {
            String topic = "Topic " + i;
            when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, topic, 1))
                    .thenReturn(Optional.empty());
            TopicExpansionResponse res = service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest(topic, 1));
            assertNotNull(res);
        }

        // 31st request should be rejected with 429
        when(topicExpansionRepository.findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(101L, 1, "Topic 31", 1))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.expandTopic("alice@example.com", 101L, 1, new TopicExpansionRequest("Topic 31", 1))
        );

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Expansion rate limit exceeded"));
    }

    @Test
    void shouldSuggestExtraTopicsAndSaveThem() {
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(geminiTestService.askGeminiJson(anyString())).thenReturn("""
            [
              {
                "title": "OCI Image Spec",
                "summary": "Deep dive into open container initiative image specifications."
              },
              {
                "title": "Rootless Containers",
                "summary": "Running container engines without root privileges for security."
              }
            ]
            """);

        when(dayExtraTopicRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<DayExtraTopicResponse> result = service.suggestExtraTopics("alice@example.com", 101L, 1);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("OCI Image Spec", result.get(0).getTitle());
        assertEquals("Rootless Containers", result.get(1).getTitle());
        verify(dayExtraTopicRepository, times(2)).save(any());
    }

    @Test
    void shouldGetDayTopicsAndGroupExpansions() {
        when(roadmapRepository.findById(101L)).thenReturn(Optional.of(aliceRoadmap));
        when(dayExtraTopicRepository.findByRoadmapIdAndDayNumber(101L, 1)).thenReturn(List.of());

        TopicExpansion exp1 = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 1, "L1 Content");
        TopicExpansion exp2 = new TopicExpansion(aliceRoadmap, 1, "Container vs VM", 2, "L2 Content");
        when(topicExpansionRepository.findByRoadmapIdAndDayNumber(101L, 1)).thenReturn(List.of(exp1, exp2));

        DayTopicsAndExpansionsResponse res = service.getDayTopicsAndExpansions("alice@example.com", 101L, 1);

        assertNotNull(res);
        assertEquals(1, res.getDayNumber());
        assertEquals(1, res.getBaseTopics().size());
        assertEquals("Container vs VM", res.getBaseTopics().get(0).getTitle());
        assertTrue(res.getExpansions().containsKey("Container vs VM"));
        assertEquals("L1 Content", res.getExpansions().get("Container vs VM").get(1));
        assertEquals("L2 Content", res.getExpansions().get("Container vs VM").get(2));
    }
}
