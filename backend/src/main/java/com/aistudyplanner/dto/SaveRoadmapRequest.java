package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SkillLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SaveRoadmapRequest {

    private Long goalId;

    @NotBlank(message = "Title is required.")
    private String title;

    @NotBlank(message = "Topic is required.")
    private String topic;

    @NotNull(message = "Skill level is required.")
    private SkillLevel skillLevel;

    @NotNull(message = "Target days is required.")
    private Integer targetDays;

    @NotNull(message = "Hours per day is required.")
    private Double hoursPerDay;

    @NotBlank(message = "Roadmap JSON content is required.")
    private String roadmapJson;

    public SaveRoadmapRequest() {
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
}

