package com.aistudyplanner.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UpdateRoadmapProgressRequest {

    private String completedTasksJson;

    private String completedMilestonesJson;

    @NotNull(message = "Progress percentage is required.")
    @Min(value = 0, message = "Progress cannot be negative.")
    @Max(value = 100, message = "Progress cannot exceed 100.")
    private Integer progressPercentage;

    public UpdateRoadmapProgressRequest() {
    }

    public String getCompletedTasksJson() {
        return completedTasksJson;
    }

    public void setCompletedTasksJson(String completedTasksJson) {
        this.completedTasksJson = completedTasksJson;
    }

    public String getCompletedMilestonesJson() {
        return completedMilestonesJson;
    }

    public void setCompletedMilestonesJson(String completedMilestonesJson) {
        this.completedMilestonesJson = completedMilestonesJson;
    }

    public Integer getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(Integer progressPercentage) {
        this.progressPercentage = progressPercentage;
    }
}

