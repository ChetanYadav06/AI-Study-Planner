package com.aistudyplanner.dto;

public class TopicExpansionResponse {

    private Long id;
    private Long roadmapId;
    private int dayNumber;
    private String topicTitle;
    private int level;
    private String markdownContent;
    private boolean cached;

    public TopicExpansionResponse() {
    }

    public TopicExpansionResponse(Long id, Long roadmapId, int dayNumber, String topicTitle, int level, String markdownContent, boolean cached) {
        this.id = id;
        this.roadmapId = roadmapId;
        this.dayNumber = dayNumber;
        this.topicTitle = topicTitle;
        this.level = level;
        this.markdownContent = markdownContent;
        this.cached = cached;
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

    public String getTopicTitle() {
        return topicTitle;
    }

    public void setTopicTitle(String topicTitle) {
        this.topicTitle = topicTitle;
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public String getMarkdownContent() {
        return markdownContent;
    }

    public void setMarkdownContent(String markdownContent) {
        this.markdownContent = markdownContent;
    }

    public boolean isCached() {
        return cached;
    }

    public void setCached(boolean cached) {
        this.cached = cached;
    }
}
