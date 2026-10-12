package com.aistudyplanner.dto;

public class DashboardStatsResponse {

    private long totalGoals;
    private long activeGoals;
    private long completedGoals;
    private double dailyTargetHours;
    private int studyStreakDays;
    private int roadmapsGenerated;

    public DashboardStatsResponse() {
    }

    public DashboardStatsResponse(long totalGoals, long activeGoals, long completedGoals, double dailyTargetHours, int studyStreakDays, int roadmapsGenerated) {
        this.totalGoals = totalGoals;
        this.activeGoals = activeGoals;
        this.completedGoals = completedGoals;
        this.dailyTargetHours = dailyTargetHours;
        this.studyStreakDays = studyStreakDays;
        this.roadmapsGenerated = roadmapsGenerated;
    }

    public long getTotalGoals() {
        return totalGoals;
    }

    public void setTotalGoals(long totalGoals) {
        this.totalGoals = totalGoals;
    }

    public long getActiveGoals() {
        return activeGoals;
    }

    public void setActiveGoals(long activeGoals) {
        this.activeGoals = activeGoals;
    }

    public long getCompletedGoals() {
        return completedGoals;
    }

    public void setCompletedGoals(long completedGoals) {
        this.completedGoals = completedGoals;
    }

    public double getDailyTargetHours() {
        return dailyTargetHours;
    }

    public void setDailyTargetHours(double dailyTargetHours) {
        this.dailyTargetHours = dailyTargetHours;
    }

    public int getStudyStreakDays() {
        return studyStreakDays;
    }

    public void setStudyStreakDays(int studyStreakDays) {
        this.studyStreakDays = studyStreakDays;
    }

    public int getRoadmapsGenerated() {
        return roadmapsGenerated;
    }

    public void setRoadmapsGenerated(int roadmapsGenerated) {
        this.roadmapsGenerated = roadmapsGenerated;
    }
}
