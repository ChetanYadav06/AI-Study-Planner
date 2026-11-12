package com.aistudyplanner.dto;

import com.aistudyplanner.entity.DayExtraTopic;

public class DayExtraTopicResponse {

    private Long id;
    private Long roadmapId;
    private int dayNumber;
    private String title;
    private String summary;

    public DayExtraTopicResponse() {
    }

    public DayExtraTopicResponse(Long id, Long roadmapId, int dayNumber, String title, String summary) {
        this.id = id;
        this.roadmapId = roadmapId;
        this.dayNumber = dayNumber;
        this.title = title;
        this.summary = summary;
    }

    public DayExtraTopicResponse(DayExtraTopic entity) {
        this.id = entity.getId();
        this.roadmapId = entity.getRoadmap() != null ? entity.getRoadmap().getId() : null;
        this.dayNumber = entity.getDayNumber();
        this.title = entity.getTitle();
        this.summary = entity.getSummary();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(Long roadmapId) {
        this.roadmapId = roadmapId;
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}
