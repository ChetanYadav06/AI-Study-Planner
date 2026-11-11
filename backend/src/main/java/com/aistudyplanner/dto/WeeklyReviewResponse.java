package com.aistudyplanner.dto;

import java.util.List;

public class WeeklyReviewResponse {
    private String weekStartDate; // YYYY-MM-DD
    private String weekEndDate;   // YYYY-MM-DD
    private int completedTasksCount;
    private double hoursStudied;
    private double hoursPlanned;
    private List<String> hardestTasks;
    private List<String> hardestPhases;
    private ProgressOverviewResponse.ScheduleStatusDto scheduleStatus;
    private List<String> suggestions;

    public WeeklyReviewResponse() {}

    public WeeklyReviewResponse(String weekStartDate, String weekEndDate, int completedTasksCount,
                                double hoursStudied, double hoursPlanned, List<String> hardestTasks,
                                List<String> hardestPhases, ProgressOverviewResponse.ScheduleStatusDto scheduleStatus,
                                List<String> suggestions) {
        this.weekStartDate = weekStartDate;
        this.weekEndDate = weekEndDate;
        this.completedTasksCount = completedTasksCount;
        this.hoursStudied = hoursStudied;
        this.hoursPlanned = hoursPlanned;
        this.hardestTasks = hardestTasks;
        this.hardestPhases = hardestPhases;
        this.scheduleStatus = scheduleStatus;
        this.suggestions = suggestions;
    }

    public String getWeekStartDate() {
        return weekStartDate;
    }

    public void setWeekStartDate(String weekStartDate) {
        this.weekStartDate = weekStartDate;
    }

    public String getWeekEndDate() {
        return weekEndDate;
    }

    public void setWeekEndDate(String weekEndDate) {
        this.weekEndDate = weekEndDate;
    }

    public int getCompletedTasksCount() {
        return completedTasksCount;
    }

    public void setCompletedTasksCount(int completedTasksCount) {
        this.completedTasksCount = completedTasksCount;
    }

    public double getHoursStudied() {
        return hoursStudied;
    }

    public void setHoursStudied(double hoursStudied) {
        this.hoursStudied = hoursStudied;
    }

    public double getHoursPlanned() {
        return hoursPlanned;
    }

    public void setHoursPlanned(double hoursPlanned) {
        this.hoursPlanned = hoursPlanned;
    }

    public List<String> getHardestTasks() {
        return hardestTasks;
    }

    public void setHardestTasks(List<String> hardestTasks) {
        this.hardestTasks = hardestTasks;
    }

    public List<String> getHardestPhases() {
        return hardestPhases;
    }

    public void setHardestPhases(List<String> hardestPhases) {
        this.hardestPhases = hardestPhases;
    }

    public ProgressOverviewResponse.ScheduleStatusDto getScheduleStatus() {
        return scheduleStatus;
    }

    public void setScheduleStatus(ProgressOverviewResponse.ScheduleStatusDto scheduleStatus) {
        this.scheduleStatus = scheduleStatus;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions;
    }
}

