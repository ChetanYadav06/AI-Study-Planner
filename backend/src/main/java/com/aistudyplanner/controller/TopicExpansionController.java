package com.aistudyplanner.controller;

import com.aistudyplanner.dto.DayExtraTopicResponse;
import com.aistudyplanner.dto.DayTopicsAndExpansionsResponse;
import com.aistudyplanner.dto.TopicExpansionRequest;
import com.aistudyplanner.dto.TopicExpansionResponse;
import com.aistudyplanner.service.TopicExpansionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai/roadmaps/{id}/days/{dayNumber}")
public class TopicExpansionController {

    private final TopicExpansionService topicExpansionService;

    public TopicExpansionController(TopicExpansionService topicExpansionService) {
        this.topicExpansionService = topicExpansionService;
    }

    @PostMapping("/topics/expand")
    public ResponseEntity<TopicExpansionResponse> expandTopic(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable int dayNumber,
            @Valid @RequestBody TopicExpansionRequest request) {
        TopicExpansionResponse response = topicExpansionService.expandTopic(authentication.getName(), id, dayNumber, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/extra-topics/suggest")
    public ResponseEntity<List<DayExtraTopicResponse>> suggestExtraTopics(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable int dayNumber) {
        List<DayExtraTopicResponse> response = topicExpansionService.suggestExtraTopics(authentication.getName(), id, dayNumber);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/topics/expand")
    public ResponseEntity<Void> deleteExpansion(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable int dayNumber,
            @RequestParam String topicTitle,
            @RequestParam(required = false) Integer level) {
        topicExpansionService.deleteExpansion(authentication.getName(), id, dayNumber, topicTitle, level);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/extra-topics/{extraId}")
    public ResponseEntity<Void> deleteExtraTopic(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable int dayNumber,
            @PathVariable Long extraId) {
        topicExpansionService.deleteExtraTopic(authentication.getName(), id, extraId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/topics")
    public ResponseEntity<DayTopicsAndExpansionsResponse> getDayTopicsAndExpansions(
            Authentication authentication,
            @PathVariable Long id,
            @PathVariable int dayNumber) {
        DayTopicsAndExpansionsResponse response = topicExpansionService.getDayTopicsAndExpansions(authentication.getName(), id, dayNumber);
        return ResponseEntity.ok(response);
    }
}
