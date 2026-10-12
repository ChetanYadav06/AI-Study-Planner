package com.aistudyplanner.controller;

import com.aistudyplanner.dto.DashboardStatsResponse;
import com.aistudyplanner.service.GoalService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final GoalService goalService;

    public DashboardController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats(Authentication authentication) {
        DashboardStatsResponse stats = goalService.getDashboardStats(authentication.getName());
        return ResponseEntity.ok(stats);
    }
}
