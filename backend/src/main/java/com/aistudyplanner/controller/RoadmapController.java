package com.aistudyplanner.controller;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.service.RoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class RoadmapController {

    private final RoadmapService roadmapService;

    public RoadmapController(RoadmapService roadmapService) {
        this.roadmapService = roadmapService;
    }

    /**
     * POST /api/ai/roadmap
     * Generates a personalized, knowledge-aware AI study roadmap for the authenticated student.
     */
    @PostMapping("/roadmap")
    public ResponseEntity<RoadmapResponse> generateRoadmap(
            Authentication authentication,
            @Valid @RequestBody RoadmapRequest request) {

        String email = authentication != null ? authentication.getName() : null;
        RoadmapResponse roadmap = roadmapService.generateRoadmap(request, email);
        return ResponseEntity.ok(roadmap);
    }
}
