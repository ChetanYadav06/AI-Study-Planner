package com.aistudyplanner.dto;

import com.aistudyplanner.entity.TaskFeedbackRating;
import jakarta.validation.constraints.NotNull;

public class TaskFeedbackRequest {

    @NotNull(message = "Rating is required")
    private TaskFeedbackRating rating;

    public TaskFeedbackRequest() {
    }

    public TaskFeedbackRequest(TaskFeedbackRating rating) {
        this.rating = rating;
    }

    public TaskFeedbackRating getRating() {
        return rating;
    }

    public void setRating(TaskFeedbackRating rating) {
        this.rating = rating;
    }
}
