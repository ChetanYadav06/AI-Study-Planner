package com.aistudyplanner.controller;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.service.RoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
     * Generates a personalized AI study roadmap for the authenticated student.
     * Request body: { topic, description, skillLevel, targetDays, hoursPerDay, goalId? }
     */
    @PostMapping("/roadmap")
    public ResponseEntity<RoadmapResponse> generateRoadmap(
            @Valid @RequestBody RoadmapRequest request) {

        RoadmapResponse roadmap = roadmapService.generateRoadmap(request);
        return ResponseEntity.ok(roadmap);
    }
}
