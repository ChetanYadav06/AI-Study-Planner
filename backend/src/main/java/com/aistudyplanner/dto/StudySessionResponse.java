package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SessionType;
import com.aistudyplanner.entity.StudySession;
import java.time.LocalDateTime;

public class StudySessionResponse {

    private Long id;
    private Long goalId;
    private Long roadmapId;
    private String taskId;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer durationSeconds;
    private SessionType sessionType;
    private Boolean completed;
    private LocalDateTime createdAt;

    public StudySessionResponse() {
    }

    public StudySessionResponse(StudySession session) {
        this.id = session.getId();
        this.goalId = session.getGoalId();
        this.roadmapId = session.getRoadmapId();
        this.taskId = session.getTaskId();
        this.startedAt = session.getStartedAt();
        this.endedAt = session.getEndedAt();
        this.durationSeconds = session.getDurationSeconds();
        this.sessionType = session.getSessionType();
        this.completed = session.getCompleted();
        this.createdAt = session.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getGoalId() {
        return goalId;
    }

    public void setGoalId(Long goalId) {
        this.goalId = goalId;
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

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public SessionType getSessionType() {
        return sessionType;
    }

    public void setSessionType(SessionType sessionType) {
        this.sessionType = sessionType;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

