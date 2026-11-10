package com.aistudyplanner.dto;

import com.aistudyplanner.entity.TopicKnowledgeLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class TopicKnowledgeRequest {

    @NotBlank(message = "Topic name is required.")
    @Size(min = 1, max = 150, message = "Topic name must be between 1 and 150 characters.")
    private String topicName;

    @NotNull(message = "Knowledge level is required.")
    private TopicKnowledgeLevel knowledgeLevel;

    private Boolean ratedByUser;

    public TopicKnowledgeRequest() {
    }

    public TopicKnowledgeRequest(String topicName, TopicKnowledgeLevel knowledgeLevel) {
        this(topicName, knowledgeLevel, false);
    }

    public TopicKnowledgeRequest(String topicName, TopicKnowledgeLevel knowledgeLevel, Boolean ratedByUser) {
        this.topicName = topicName;
        this.knowledgeLevel = knowledgeLevel;
        this.ratedByUser = ratedByUser;
    }

    public String getTopicName() {
        return topicName;
    }

    public void setTopicName(String topicName) {
        this.topicName = topicName;
    }

    public TopicKnowledgeLevel getKnowledgeLevel() {
        return knowledgeLevel;
    }

    public void setKnowledgeLevel(TopicKnowledgeLevel knowledgeLevel) {
        this.knowledgeLevel = knowledgeLevel;
    }

    public Boolean getRatedByUser() {
        return ratedByUser;
    }

    public void setRatedByUser(Boolean ratedByUser) {
        this.ratedByUser = ratedByUser;
    }
}
