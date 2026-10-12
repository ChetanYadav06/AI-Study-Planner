package com.aistudyplanner.dto;

import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.SkillLevel;

import java.time.LocalDateTime;

public class GoalResponse {

    private Long id;
    private Long userId;
    private String title;
    private String description;
    private Integer targetDays;
    private Double hoursPerDay;
    private SkillLevel skillLevel;
    private GoalStatus status;
    private Integer progressPercentage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public GoalResponse() {
    }

    public GoalResponse(Goal goal) {
        this.id = goal.getId();
        this.userId = goal.getUser() != null ? goal.getUser().getId() : null;
        this.title = goal.getTitle();
        this.description = goal.getDescription();
        this.targetDays = goal.getTargetDays();
        this.hoursPerDay = goal.getHoursPerDay();
        this.skillLevel = goal.getSkillLevel();
        this.status = goal.getStatus();
        this.progressPercentage = goal.getProgressPercentage();
        this.createdAt = goal.getCreatedAt();
        this.updatedAt = goal.getUpdatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getTargetDays() {
        return targetDays;
    }

    public void setTargetDays(Integer targetDays) {
        this.targetDays = targetDays;
    }

    public Double getHoursPerDay() {
        return hoursPerDay;
    }

    public void setHoursPerDay(Double hoursPerDay) {
        this.hoursPerDay = hoursPerDay;
    }

    public SkillLevel getSkillLevel() {
        return skillLevel;
    }

    public void setSkillLevel(SkillLevel skillLevel) {
        this.skillLevel = skillLevel;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
