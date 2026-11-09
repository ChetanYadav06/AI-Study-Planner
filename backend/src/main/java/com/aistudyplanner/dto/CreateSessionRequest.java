package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SessionType;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class CreateSessionRequest {

    private Long goalId;
    private Long roadmapId;
    private String taskId;

    @NotNull(message = "startedAt is required")
    private LocalDateTime startedAt;

    @NotNull(message = "endedAt is required")
    private LocalDateTime endedAt;

    @NotNull(message = "durationSeconds is required")
    private Integer durationSeconds;

    private SessionType sessionType = SessionType.FOCUS;
    private Boolean completed = true;

    public CreateSessionRequest() {
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
}

