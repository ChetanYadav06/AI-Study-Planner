package com.aistudyplanner.dto;

import com.aistudyplanner.entity.TaskFeedbackRating;
import java.time.LocalDateTime;

public class TaskFeedbackResponse {

    private Long id;
    private Long roadmapId;
    private String taskId;
    private TaskFeedbackRating rating;
    private LocalDateTime updatedAt;

    public TaskFeedbackResponse() {
    }

    public TaskFeedbackResponse(Long id, Long roadmapId, String taskId, TaskFeedbackRating rating, LocalDateTime updatedAt) {
        this.id = id;
        this.roadmapId = roadmapId;
        this.taskId = taskId;
        this.rating = rating;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(Long roadmapId) {
        this.roadmapId = roadmapId;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public TaskFeedbackRating getRating() {
        return rating;
    }

    public void setRating(TaskFeedbackRating rating) {
        this.rating = rating;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

