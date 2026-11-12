package com.aistudyplanner.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class TopicExpansionRequest {

    @NotBlank(message = "Topic title is required")
    private String topicTitle;

    @Min(value = 1, message = "Level must be 1 or 2")
    @Max(value = 2, message = "Level must be 1 or 2")
    private int level = 1;

    public TopicExpansionRequest() {
    }

    public TopicExpansionRequest(String topicTitle, int level) {
        this.topicTitle = topicTitle;
        this.level = level;
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
}
