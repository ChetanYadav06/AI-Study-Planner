package com.aistudyplanner.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DayPlanResponse {

    private int dayNumber;
    private String title;
    private String description;
    private int estimatedMinutes;
    private String activityType;
    private List<RoadmapResponse.DailyTopic> topics = new ArrayList<>();
    private List<TimeBlockDto> blocks = new ArrayList<>();
    private boolean completed;

    public static class TimeBlockDto {
        private String id;
        private String kind;
        private String title;
        private int minutes;
        private int orderIndex;
        private boolean completed;

        public TimeBlockDto() {}

        public TimeBlockDto(String id, String kind, String title, int minutes, int orderIndex, boolean completed) {
            this.id = id;
            this.kind = kind;
            this.title = title;
            this.minutes = minutes;
            this.orderIndex = orderIndex;
            this.completed = completed;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getKind() { return kind; }
        public void setKind(String kind) { this.kind = kind; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public int getMinutes() { return minutes; }
        public void setMinutes(int minutes) { this.minutes = minutes; }

        public int getOrderIndex() { return orderIndex; }
        public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }

        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }
    }

    public DayPlanResponse() {}

    public DayPlanResponse(int dayNumber, String title, String description, int estimatedMinutes, String activityType, List<RoadmapResponse.DailyTopic> topics, List<TimeBlockDto> blocks, boolean completed) {
        this.dayNumber = dayNumber;
        this.title = title;
        this.description = description;
        this.estimatedMinutes = estimatedMinutes;
        this.activityType = activityType;
        this.topics = topics != null ? topics : new ArrayList<>();
        this.blocks = blocks != null ? blocks : new ArrayList<>();
        this.completed = completed;
    }

    public int getDayNumber() { return dayNumber; }
    public void setDayNumber(int dayNumber) { this.dayNumber = dayNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(int estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public List<RoadmapResponse.DailyTopic> getTopics() { return topics; }
    public void setTopics(List<RoadmapResponse.DailyTopic> topics) {
        this.topics = topics != null ? topics : new ArrayList<>();
    }

    public List<TimeBlockDto> getBlocks() { return blocks; }
    public void setBlocks(List<TimeBlockDto> blocks) {
        this.blocks = blocks != null ? blocks : new ArrayList<>();
    }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}
