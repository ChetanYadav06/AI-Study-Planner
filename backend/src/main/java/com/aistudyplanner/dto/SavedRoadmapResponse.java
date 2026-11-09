package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.SkillLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class SavedRoadmapResponse {

    private Long id;
    private Long goalId;
    private String title;
    private String topic;
    private SkillLevel skillLevel;
    private Integer targetDays;
    private Double hoursPerDay;
    private String roadmapJson;
    private String completedTasksJson;
    private String completedMilestonesJson;
    private Integer progressPercentage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public SavedRoadmapResponse() {
    }

    public SavedRoadmapResponse(SavedRoadmap entity) {
        this.id = entity.getId();
        this.goalId = entity.getGoalId();
        this.title = entity.getTitle();
        this.topic = entity.getTopic();
        this.skillLevel = entity.getSkillLevel();
        this.targetDays = entity.getTargetDays();
        this.hoursPerDay = entity.getHoursPerDay();
        this.roadmapJson = entity.getRoadmapJson();
        this.completedTasksJson = entity.getCompletedTasksJson();
        this.completedMilestonesJson = entity.getCompletedMilestonesJson();
        this.progressPercentage = entity.getProgressPercentage();
        this.createdAt = entity.getCreatedAt();
        this.updatedAt = entity.getUpdatedAt();
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public SkillLevel getSkillLevel() {
        return skillLevel;
    }

    public void setSkillLevel(SkillLevel skillLevel) {
        this.skillLevel = skillLevel;
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

    public String getRoadmapJson() {
        return roadmapJson;
    }

    public void setRoadmapJson(String roadmapJson) {
        this.roadmapJson = roadmapJson;
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

