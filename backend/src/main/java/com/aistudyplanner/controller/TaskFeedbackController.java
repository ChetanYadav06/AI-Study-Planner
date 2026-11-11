package com.aistudyplanner.controller;

import com.aistudyplanner.dto.TaskFeedbackRequest;
import com.aistudyplanner.dto.TaskFeedbackResponse;
import com.aistudyplanner.service.TaskFeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/roadmaps")
public class TaskFeedbackController {

    private final TaskFeedbackService taskFeedbackService;

    public TaskFeedbackController(TaskFeedbackService taskFeedbackService) {
        this.taskFeedbackService = taskFeedbackService;
    }

    @PutMapping("/{roadmapId}/tasks/{taskId}/feedback")
    public ResponseEntity<TaskFeedbackResponse> updateTaskFeedback(
            Authentication authentication,
            @PathVariable Long roadmapId,
            @PathVariable String taskId,
            @Valid @RequestBody TaskFeedbackRequest request) {

        String userEmail = authentication.getName();
        TaskFeedbackResponse response = taskFeedbackService.saveFeedback(userEmail, roadmapId, taskId, request);
        return ResponseEntity.ok(response);
    }
}
