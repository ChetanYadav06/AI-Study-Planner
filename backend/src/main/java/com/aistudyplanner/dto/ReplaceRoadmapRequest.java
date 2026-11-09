package com.aistudyplanner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ReplaceRoadmapRequest {

    @NotBlank(message = "Roadmap JSON content is required.")
    private String roadmapJson;

    private String title;

    private Integer targetDays;

    private Double hoursPerDay;

    public ReplaceRoadmapRequest() {
    }

    public ReplaceRoadmapRequest(String roadmapJson, String title, Integer targetDays, Double hoursPerDay) {
        this.roadmapJson = roadmapJson;
        this.title = title;
        this.targetDays = targetDays;
        this.hoursPerDay = hoursPerDay;
    }

    public String getRoadmapJson() {
        return roadmapJson;
    }

    public void setRoadmapJson(String roadmapJson) {
        this.roadmapJson = roadmapJson;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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
}
