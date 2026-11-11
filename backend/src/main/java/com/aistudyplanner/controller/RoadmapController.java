package com.aistudyplanner.controller;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import com.aistudyplanner.service.RoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final SlidingWindowRateLimiter rateLimiter;

    public RoadmapController(RoadmapService roadmapService, SlidingWindowRateLimiter rateLimiter) {
        this.roadmapService = roadmapService;
        this.rateLimiter = rateLimiter;
    }

    /**
     * POST /api/ai/roadmap
     * Generates a personalized, knowledge-aware AI study roadmap for the authenticated student.
     * Rate limited to 5 generations per hour per authenticated student.
     */
    @PostMapping("/roadmap")
    public ResponseEntity<RoadmapResponse> generateRoadmap(
            Authentication authentication,
            @Valid @RequestBody RoadmapRequest request) {

        String email = authentication != null ? authentication.getName() : "anonymous";
        String rateLimitKey = "roadmap_gen:" + email;

        // 5 requests per hour (3600 seconds)
        if (!rateLimiter.tryAcquire(rateLimitKey, 5, 3600)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Roadmap generation limit reached (maximum 5 per hour). Please try again later.");
        }

        RoadmapResponse roadmap = roadmapService.generateRoadmap(request, email);
        return ResponseEntity.ok(roadmap);
    }
}
