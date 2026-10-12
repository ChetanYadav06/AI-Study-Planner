package com.aistudyplanner.controller;

import com.aistudyplanner.dto.CreateGoalRequest;
import com.aistudyplanner.dto.GoalResponse;
import com.aistudyplanner.dto.UpdateGoalStatusRequest;
import com.aistudyplanner.service.GoalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(
            Authentication authentication,
            @Valid @RequestBody CreateGoalRequest request) {
        GoalResponse created = goalService.createGoal(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<GoalResponse>> getUserGoals(Authentication authentication) {
        List<GoalResponse> goals = goalService.getUserGoals(authentication.getName());
        return ResponseEntity.ok(goals);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoalById(
            Authentication authentication,
            @PathVariable Long id) {
        GoalResponse goal = goalService.getGoalById(authentication.getName(), id);
        return ResponseEntity.ok(goal);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<GoalResponse> updateGoalStatus(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody UpdateGoalStatusRequest request) {
        GoalResponse updated = goalService.updateGoalStatus(authentication.getName(), id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteGoal(
            Authentication authentication,
            @PathVariable Long id) {
        goalService.deleteGoal(authentication.getName(), id);
        return ResponseEntity.ok(Map.of("message", "Learning goal deleted successfully."));
    }
}
