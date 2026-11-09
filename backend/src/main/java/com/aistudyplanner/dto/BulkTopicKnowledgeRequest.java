package com.aistudyplanner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class BulkTopicKnowledgeRequest {

    @NotEmpty(message = "Skills list cannot be empty.")
    @Valid
    private List<TopicKnowledgeRequest> skills;

    public BulkTopicKnowledgeRequest() {
    }

    public BulkTopicKnowledgeRequest(List<TopicKnowledgeRequest> skills) {
        this.skills = skills;
    }

    public List<TopicKnowledgeRequest> getSkills() {
        return skills;
    }

    public void setSkills(List<TopicKnowledgeRequest> skills) {
        this.skills = skills;
    }
}

