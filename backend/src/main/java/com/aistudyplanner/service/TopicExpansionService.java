package com.aistudyplanner.service;

import com.aistudyplanner.dto.DayExtraTopicResponse;
import com.aistudyplanner.dto.DayTopicsAndExpansionsResponse;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.dto.TopicExpansionRequest;
import com.aistudyplanner.dto.TopicExpansionResponse;
import com.aistudyplanner.entity.DayExtraTopic;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.TopicExpansion;
import com.aistudyplanner.repository.DayExtraTopicRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.TopicExpansionRepository;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class TopicExpansionService {

    private static final Logger log = LoggerFactory.getLogger(TopicExpansionService.class);
    private static final int MAX_REQUESTS_PER_HOUR = 30;
    private static final long ONE_HOUR_SECONDS = 3600;

    private final SavedRoadmapRepository roadmapRepository;
    private final TopicExpansionRepository topicExpansionRepository;
    private final DayExtraTopicRepository dayExtraTopicRepository;
    private final GeminiTestService geminiTestService;
    private final SlidingWindowRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    @Autowired
    public TopicExpansionService(SavedRoadmapRepository roadmapRepository,
                                 TopicExpansionRepository topicExpansionRepository,
                                 DayExtraTopicRepository dayExtraTopicRepository,
                                 GeminiTestService geminiTestService,
                                 SlidingWindowRateLimiter rateLimiter,
                                 ObjectMapper objectMapper) {
        this.roadmapRepository = roadmapRepository;
        this.topicExpansionRepository = topicExpansionRepository;
        this.dayExtraTopicRepository = dayExtraTopicRepository;
        this.geminiTestService = geminiTestService;
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Transactional
    public TopicExpansionResponse expandTopic(String userEmail, Long roadmapId, int dayNumber, TopicExpansionRequest request) {
        SavedRoadmap roadmap = validateOwnershipAndGetRoadmap(userEmail, roadmapId);
        validateDayBounds(roadmap, dayNumber);

        if (request == null || request.getTopicTitle() == null || request.getTopicTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic title is required.");
        }

        String topicTitle = request.getTopicTitle().trim();
        int level = request.getLevel();
        if (level < 1 || level > 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expansion level must be 1 or 2.");
        }

        // Rule: Level 2 requires Level 1 to exist first
        if (level == 2) {
            Optional<TopicExpansion> level1 = topicExpansionRepository
                    .findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(roadmapId, dayNumber, topicTitle, 1);
            if (level1.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Level 1 expansion must exist before requesting Level 2.");
            }
        }

        // Check cache
        Optional<TopicExpansion> existing = topicExpansionRepository
                .findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(roadmapId, dayNumber, topicTitle, level);
        if (existing.isPresent()) {
            TopicExpansion e = existing.get();
            return new TopicExpansionResponse(e.getId(), roadmapId, dayNumber, e.getTopicTitle(), e.getLevel(), e.getMarkdownContent(), true);
        }

        // Check rate limiter: 30 calls per hour per user
        String rateLimitKey = "topic_expansion:" + userEmail.trim().toLowerCase();
        if (!rateLimiter.tryAcquire(rateLimitKey, MAX_REQUESTS_PER_HOUR, ONE_HOUR_SECONDS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Expansion rate limit exceeded. Up to 30 requests per hour allowed.");
        }

        // Generate expansion with Gemini
        String prompt = buildExpansionPrompt(roadmap.getTopic(), dayNumber, topicTitle, level);
        String markdownContent;
        try {
            markdownContent = geminiTestService.askGemini(prompt);
            if (markdownContent == null || markdownContent.isBlank()) {
                throw new IllegalStateException("Empty response from AI client.");
            }
        } catch (Exception e) {
            log.error("Failed to generate topic expansion for roadmap {} day {} topic {}: {}", roadmapId, dayNumber, topicTitle, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to generate topic expansion: " + e.getMessage());
        }

        TopicExpansion expansion = new TopicExpansion(roadmap, dayNumber, topicTitle, level, markdownContent);
        TopicExpansion saved = topicExpansionRepository.save(expansion);

        return new TopicExpansionResponse(saved.getId(), roadmapId, dayNumber, saved.getTopicTitle(), saved.getLevel(), saved.getMarkdownContent(), false);
    }

    @Transactional
    public List<DayExtraTopicResponse> suggestExtraTopics(String userEmail, Long roadmapId, int dayNumber) {
        SavedRoadmap roadmap = validateOwnershipAndGetRoadmap(userEmail, roadmapId);
        validateDayBounds(roadmap, dayNumber);

        // Check rate limiter
        String rateLimitKey = "topic_expansion:" + userEmail.trim().toLowerCase();
        if (!rateLimiter.tryAcquire(rateLimitKey, MAX_REQUESTS_PER_HOUR, ONE_HOUR_SECONDS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Expansion rate limit exceeded. Up to 30 requests per hour allowed.");
        }

        String prompt = String.format("""
            You are a curriculum designer.
            Suggest 2 to 3 relevant extra or elective topics for Day %d of a study roadmap on "%s".
            Each topic must include a clear title (3-60 characters) and a focused summary (10-160 characters).
            Return a JSON array of objects with the exact shape:
            [
              {
                "title": "Topic Title",
                "summary": "Concise summary of the extra topic."
              }
            ]
            """, dayNumber, roadmap.getTopic());

        List<DayExtraTopicResponse> results = new ArrayList<>();
        try {
            String rawJson = geminiTestService.askGeminiJson(prompt);
            String cleaned = extractJsonArray(rawJson);
            JsonNode arrayNode = objectMapper.readTree(cleaned);

            if (arrayNode != null && arrayNode.isArray()) {
                for (JsonNode item : arrayNode) {
                    if (item.hasNonNull("title") && item.hasNonNull("summary")) {
                        String title = item.get("title").asText().trim();
                        String summary = item.get("summary").asText().trim();
                        if (!title.isBlank() && !summary.isBlank()) {
                            DayExtraTopic entity = new DayExtraTopic(roadmap, dayNumber, title, summary);
                            DayExtraTopic saved = dayExtraTopicRepository.save(entity);
                            results.add(new DayExtraTopicResponse(saved));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to suggest extra topics for roadmap {} day {}: {}", roadmapId, dayNumber, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to generate extra topics: " + e.getMessage());
        }

        return results;
    }

    @Transactional
    public void deleteExpansion(String userEmail, Long roadmapId, int dayNumber, String topicTitle, Integer level) {
        validateOwnershipAndGetRoadmap(userEmail, roadmapId);

        if (topicTitle == null || topicTitle.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Topic title is required.");
        }

        String trimmed = topicTitle.trim();
        if (level != null) {
            if (level == 1) {
                // If level 1 is deleted, also delete dependent level 2
                topicExpansionRepository.deleteByRoadmapIdAndDayNumberAndTopicTitle(roadmapId, dayNumber, trimmed);
            } else {
                topicExpansionRepository.deleteByRoadmapIdAndDayNumberAndTopicTitleAndLevel(roadmapId, dayNumber, trimmed, level);
            }
        } else {
            topicExpansionRepository.deleteByRoadmapIdAndDayNumberAndTopicTitle(roadmapId, dayNumber, trimmed);
        }
    }

    @Transactional
    public void deleteExtraTopic(String userEmail, Long roadmapId, Long extraId) {
        validateOwnershipAndGetRoadmap(userEmail, roadmapId);

        DayExtraTopic extra = dayExtraTopicRepository.findByIdAndRoadmapId(extraId, roadmapId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Extra topic not found."));

        dayExtraTopicRepository.deleteByRoadmapIdAndId(roadmapId, extra.getId());
    }

    @Transactional(readOnly = true)
    public DayTopicsAndExpansionsResponse getDayTopicsAndExpansions(String userEmail, Long roadmapId, int dayNumber) {
        SavedRoadmap roadmap = validateOwnershipAndGetRoadmap(userEmail, roadmapId);
        validateDayBounds(roadmap, dayNumber);

        // 1. Base topics from roadmapJson
        List<RoadmapResponse.DailyTopic> baseTopics = new ArrayList<>();
        try {
            RoadmapResponse parsed = objectMapper.readValue(roadmap.getRoadmapJson(), RoadmapResponse.class);
            if (parsed.getPhases() != null) {
                for (RoadmapResponse.WeeklyPhase phase : parsed.getPhases()) {
                    if (phase.getDailyTasks() != null) {
                        for (RoadmapResponse.DailyTask task : phase.getDailyTasks()) {
                            if (task.getDayNumber() == dayNumber) {
                                if (task.getTopics() != null && !task.getTopics().isEmpty()) {
                                    baseTopics.addAll(task.getTopics());
                                } else if (task.getSubtopics() != null) {
                                    for (String st : task.getSubtopics()) {
                                        baseTopics.add(new RoadmapResponse.DailyTopic(st, ""));
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse roadmapJson for roadmap {}: {}", roadmapId, e.getMessage());
        }

        // 2. Extra topics from day_extra_topics
        List<DayExtraTopic> extraEntities = dayExtraTopicRepository.findByRoadmapIdAndDayNumber(roadmapId, dayNumber);
        List<DayExtraTopicResponse> extraTopics = extraEntities.stream().map(DayExtraTopicResponse::new).toList();

        // 3. Expansions from topic_expansions
        List<TopicExpansion> expansionsList = topicExpansionRepository.findByRoadmapIdAndDayNumber(roadmapId, dayNumber);
        Map<String, Map<Integer, String>> expansionsMap = new LinkedHashMap<>();
        for (TopicExpansion te : expansionsList) {
            expansionsMap.computeIfAbsent(te.getTopicTitle(), k -> new LinkedHashMap<>())
                    .put(te.getLevel(), te.getMarkdownContent());
        }

        return new DayTopicsAndExpansionsResponse(dayNumber, baseTopics, extraTopics, expansionsMap);
    }

    private SavedRoadmap validateOwnershipAndGetRoadmap(String userEmail, Long roadmapId) {
        if (userEmail == null || userEmail.isBlank() || "anonymous".equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        SavedRoadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap not found."));

        if (!roadmap.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this roadmap.");
        }
        return roadmap;
    }

    private void validateDayBounds(SavedRoadmap roadmap, int dayNumber) {
        int targetDays = roadmap.getTargetDays() != null ? roadmap.getTargetDays() : 30;
        if (dayNumber < 1 || dayNumber > targetDays) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Day number " + dayNumber + " is outside roadmap range (1-" + targetDays + ").");
        }
    }

    private String buildExpansionPrompt(String roadmapTopic, int dayNumber, String topicTitle, int level) {
        if (level == 1) {
            return String.format("""
                You are an expert technical tutor providing a focused, high-value Deep Dive on a curriculum topic.
                Topic: %s
                Roadmap Subject: %s (Day %d)

                Write a comprehensive yet concise learning guide in Markdown covering:
                ### 1. Mental Model & Core Principles
                ### 2. Syntax & Implementation Pattern
                ### 3. Practical Working Code Example
                ### 4. Common Pitfalls & Debugging Tips

                Provide clean, runnable code and clear technical explanations without conversational pleasantries.
                """, topicTitle, roadmapTopic, dayNumber);
        } else {
            return String.format("""
                You are a principal engineer providing an Advanced Exploration & Edge Cases deep dive on a technical topic.
                Topic: %s
                Roadmap Subject: %s (Day %d)

                Write an advanced technical guide in Markdown covering:
                ### 1. Architecture & Design Trade-offs
                ### 2. Internal Mechanics & Runtime Behavior
                ### 3. Performance & Memory Optimizations
                ### 4. Edge Cases, Failure Modes & Defensive Strategies

                Provide realistic production insights and architectural analysis without conversational pleasantries.
                """, topicTitle, roadmapTopic, dayNumber);
        }
    }

    private String extractJsonArray(String raw) {
        if (raw == null) return "[]";
        String s = raw.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            int lastBackticks = s.lastIndexOf("```");
            if (firstNewline != -1 && lastBackticks > firstNewline) {
                s = s.substring(firstNewline + 1, lastBackticks).trim();
            }
        }
        int start = s.indexOf('[');
        int end = s.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return s.substring(start, end + 1);
        }
        return s;
    }
}
