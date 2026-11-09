package com.aistudyplanner.controller;

import com.aistudyplanner.dto.SaveRoadmapRequest;
import com.aistudyplanner.dto.SavedRoadmapResponse;
import com.aistudyplanner.dto.UpdateRoadmapProgressRequest;
import com.aistudyplanner.service.SavedRoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/roadmaps")
public class SavedRoadmapController {

    private final SavedRoadmapService service;

    public SavedRoadmapController(SavedRoadmapService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public ResponseEntity<SavedRoadmapResponse> saveRoadmap(
            Authentication authentication,
            @Valid @RequestBody SaveRoadmapRequest request) {
        SavedRoadmapResponse saved = service.saveRoadmap(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<SavedRoadmapResponse>> getSavedRoadmaps(Authentication authentication) {
        List<SavedRoadmapResponse> roadmaps = service.getUserSavedRoadmaps(authentication.getName());
        return ResponseEntity.ok(roadmaps);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavedRoadmapResponse> getSavedRoadmapById(
            Authentication authentication,
            @PathVariable Long id) {
        SavedRoadmapResponse roadmap = service.getSavedRoadmapById(authentication.getName(), id);
        return ResponseEntity.ok(roadmap);
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<SavedRoadmapResponse> updateRoadmapProgress(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoadmapProgressRequest request) {
        SavedRoadmapResponse updated = service.updateProgress(authentication.getName(), id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteSavedRoadmap(
            Authentication authentication,
            @PathVariable Long id) {
        service.deleteSavedRoadmap(authentication.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Saved roadmap deleted successfully."));
    }
}

