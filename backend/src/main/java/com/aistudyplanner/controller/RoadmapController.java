package com.aistudyplanner.controller;

import com.aistudyplanner.dto.RoadmapJobResponse;
import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import com.aistudyplanner.service.RoadmapJobService;
import com.aistudyplanner.service.RoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final RoadmapJobService roadmapJobService;
    private final SlidingWindowRateLimiter rateLimiter;

    public RoadmapController(RoadmapService roadmapService, RoadmapJobService roadmapJobService, SlidingWindowRateLimiter rateLimiter) {
        this.roadmapService = roadmapService;
        this.roadmapJobService = roadmapJobService;
        this.rateLimiter = rateLimiter;
    }

    /**
     * POST /api/ai/roadmap
     * Generates a personalized, knowledge-aware AI study roadmap for the authenticated student (synchronous legacy).
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

    /**
     * POST /api/ai/roadmap/generate
     * Starts an asynchronous roadmap generation job. Returns 202 Accepted with { jobId }.
     */
    @PostMapping("/roadmap/generate")
    public ResponseEntity<Map<String, String>> startRoadmapJob(
            Authentication authentication,
            @Valid @RequestBody RoadmapRequest request) {
        String email = authentication != null ? authentication.getName() : "anonymous";
        String jobId = roadmapJobService.startJob(request, email);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("jobId", jobId));
    }

    /**
     * GET /api/ai/roadmap/generate/{jobId}
     * Queries the status of an asynchronous roadmap generation job.
     */
    @GetMapping("/roadmap/generate/{jobId}")
    public ResponseEntity<RoadmapJobResponse> getRoadmapJob(
            Authentication authentication,
            @PathVariable String jobId) {
        String email = authentication != null ? authentication.getName() : "anonymous";
        RoadmapJobResponse job = roadmapJobService.getJob(jobId, email);
        return ResponseEntity.ok(job);
    }
}
