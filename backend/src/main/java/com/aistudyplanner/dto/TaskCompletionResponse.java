package com.aistudyplanner.dto;

import java.util.List;

public class TaskCompletionResponse {

    private List<String> completedTaskIds;
    private int completedCount;
    private int totalTasks;
    private int progressPercentage;
    private Integer goalProgressPercentage;
    private String goalStatus;

    public TaskCompletionResponse() {
    }

    public TaskCompletionResponse(
            List<String> completedTaskIds,
            int completedCount,
            int totalTasks,
            int progressPercentage,
            Integer goalProgressPercentage,
            String goalStatus) {
        this.completedTaskIds = completedTaskIds;
        this.completedCount = completedCount;
        this.totalTasks = totalTasks;
        this.progressPercentage = progressPercentage;
        this.goalProgressPercentage = goalProgressPercentage;
        this.goalStatus = goalStatus;
    }

    public List<String> getCompletedTaskIds() {
        return completedTaskIds;
    }

    public void setCompletedTaskIds(List<String> completedTaskIds) {
        this.completedTaskIds = completedTaskIds;
    }

    public int getCompletedCount() {
        return completedCount;
    }

    public void setCompletedCount(int completedCount) {
        this.completedCount = completedCount;
    }

    public int getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(int totalTasks) {
        this.totalTasks = totalTasks;
    }

    public int getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(int progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public Integer getGoalProgressPercentage() {
        return goalProgressPercentage;
    }

    public void setGoalProgressPercentage(Integer goalProgressPercentage) {
        this.goalProgressPercentage = goalProgressPercentage;
    }

    public String getGoalStatus() {
        return goalStatus;
    }

    public void setGoalStatus(String goalStatus) {
        this.goalStatus = goalStatus;
    }
}
