package com.aistudyplanner.dto;

import jakarta.validation.constraints.NotNull;

public class TaskCompletionRequest {

    @NotNull(message = "completed status is required")
    private Boolean completed;

    public TaskCompletionRequest() {
    }

    public TaskCompletionRequest(Boolean completed) {
        this.completed = completed;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }
}
