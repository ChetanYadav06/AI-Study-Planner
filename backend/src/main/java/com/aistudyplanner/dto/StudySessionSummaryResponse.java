package com.aistudyplanner.dto;

import java.util.Map;

public class StudySessionSummaryResponse {

    private long totalMinutes;
    private long totalSessions;
    private Map<String, Long> minutesPerDay;
    private Map<Long, Long> minutesPerGoal;

    public StudySessionSummaryResponse() {
    }

    public StudySessionSummaryResponse(long totalMinutes, long totalSessions,
                                       Map<String, Long> minutesPerDay,
                                       Map<Long, Long> minutesPerGoal) {
        this.totalMinutes = totalMinutes;
        this.totalSessions = totalSessions;
        this.minutesPerDay = minutesPerDay;
        this.minutesPerGoal = minutesPerGoal;
    }

    public long getTotalMinutes() {
        return totalMinutes;
    }

    public void setTotalMinutes(long totalMinutes) {
        this.totalMinutes = totalMinutes;
    }

    public long getTotalSessions() {
        return totalSessions;
    }

    public void setTotalSessions(long totalSessions) {
        this.totalSessions = totalSessions;
    }

    public Map<String, Long> getMinutesPerDay() {
        return minutesPerDay;
    }

    public void setMinutesPerDay(Map<String, Long> minutesPerDay) {
        this.minutesPerDay = minutesPerDay;
    }

    public Map<Long, Long> getMinutesPerGoal() {
        return minutesPerGoal;
    }

    public void setMinutesPerGoal(Map<Long, Long> minutesPerGoal) {
        this.minutesPerGoal = minutesPerGoal;
    }
}

