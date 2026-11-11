package com.aistudyplanner.controller;

import com.aistudyplanner.dto.ProgressOverviewResponse;
import com.aistudyplanner.dto.WeeklyReviewResponse;
import com.aistudyplanner.service.ProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ProgressOverviewResponse> getOverview(
            Authentication authentication,
            @RequestParam(value = "tz", required = false, defaultValue = "UTC") String tz) {
        String email = authentication.getName();
        ProgressOverviewResponse response = progressService.getOverview(email, tz);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/weekly-review")
    public ResponseEntity<WeeklyReviewResponse> getWeeklyReview(
            Authentication authentication,
            @RequestParam(value = "tz", required = false, defaultValue = "UTC") String tz) {
        String email = authentication.getName();
        WeeklyReviewResponse response = progressService.getWeeklyReview(email, tz);
        return ResponseEntity.ok(response);
    }
}
