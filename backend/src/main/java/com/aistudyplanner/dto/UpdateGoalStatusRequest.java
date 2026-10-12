package com.aistudyplanner.dto;

import com.aistudyplanner.entity.GoalStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class UpdateGoalStatusRequest {

    private GoalStatus status;

    @Min(value = 0, message = "Progress percentage cannot be less than 0.")
    @Max(value = 100, message = "Progress percentage cannot exceed 100.")
    private Integer progressPercentage;

    public UpdateGoalStatusRequest() {
    }

    public UpdateGoalStatusRequest(GoalStatus status, Integer progressPercentage) {
        this.status = status;
        this.progressPercentage = progressPercentage;
    }

    public GoalStatus getStatus() {
        return status;
    }

    public void setStatus(GoalStatus status) {
        this.status = status;
    }

    public Integer getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(Integer progressPercentage) {
        this.progressPercentage = progressPercentage;
    }
}
