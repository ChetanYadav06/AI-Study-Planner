package com.aistudyplanner.controller;

import com.aistudyplanner.dto.BulkTopicKnowledgeRequest;
import com.aistudyplanner.dto.TopicKnowledgeRequest;
import com.aistudyplanner.dto.TopicKnowledgeResponse;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import com.aistudyplanner.service.TopicKnowledgeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skills")
public class TopicKnowledgeController {

    private final TopicKnowledgeService service;

    public TopicKnowledgeController(TopicKnowledgeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<TopicKnowledgeResponse>> getSkills(
            Authentication authentication,
            @RequestParam(required = false) String search) {
        List<TopicKnowledgeResponse> skills = service.getSkills(authentication.getName(), search);
        return ResponseEntity.ok(skills);
    }

    @PostMapping
    public ResponseEntity<TopicKnowledgeResponse> upsertSkill(
            Authentication authentication,
            @Valid @RequestBody TopicKnowledgeRequest request) {
        TopicKnowledgeResponse skill = service.upsertSkill(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(skill);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<TopicKnowledgeResponse>> bulkUpsertSkills(
            Authentication authentication,
            @Valid @RequestBody BulkTopicKnowledgeRequest request) {
        List<TopicKnowledgeResponse> skills = service.bulkUpsertSkills(authentication.getName(), request.getSkills());
        return ResponseEntity.status(HttpStatus.CREATED).body(skills);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TopicKnowledgeResponse> updateSkillLevel(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam TopicKnowledgeLevel level) {
        TopicKnowledgeResponse updated = service.updateSkillLevel(authentication.getName(), id, level);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteSkill(
            Authentication authentication,
            @PathVariable Long id) {
        service.deleteSkill(authentication.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Skill topic removed successfully."));
    }
}

