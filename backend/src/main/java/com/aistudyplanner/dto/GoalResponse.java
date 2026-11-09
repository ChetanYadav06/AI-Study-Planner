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
    private String subject;
    private String specificTopics;
    private String targetOutcome;
    private String priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean hasLinkedRoadmap;

    public GoalResponse() {
    }

    public GoalResponse(Goal goal) {
        this(goal, false);
    }

    public GoalResponse(Goal goal, boolean hasLinkedRoadmap) {
        this.id = goal.getId();
        this.userId = goal.getUser() != null ? goal.getUser().getId() : null;
        this.title = goal.getTitle();
        this.description = goal.getDescription();
        this.targetDays = goal.getTargetDays();
        this.hoursPerDay = goal.getHoursPerDay();
        this.skillLevel = goal.getSkillLevel();
        this.status = goal.getStatus();
        this.progressPercentage = goal.getProgressPercentage();
        this.subject = goal.getSubject();
        this.specificTopics = goal.getSpecificTopics();
        this.targetOutcome = goal.getTargetOutcome();
        this.priority = goal.getPriority();
        this.createdAt = goal.getCreatedAt();
        this.updatedAt = goal.getUpdatedAt();
        this.hasLinkedRoadmap = hasLinkedRoadmap;
    }

    public boolean isHasLinkedRoadmap() {
        return hasLinkedRoadmap;
    }

    public void setHasLinkedRoadmap(boolean hasLinkedRoadmap) {
        this.hasLinkedRoadmap = hasLinkedRoadmap;
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getSpecificTopics() {
        return specificTopics;
    }

    public void setSpecificTopics(String specificTopics) {
        this.specificTopics = specificTopics;
    }

    public String getTargetOutcome() {
        return targetOutcome;
    }

    public void setTargetOutcome(String targetOutcome) {
        this.targetOutcome = targetOutcome;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
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
