package com.aistudyplanner.dto;

import com.aistudyplanner.entity.StudentTopicKnowledge;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import java.time.LocalDateTime;

public class TopicKnowledgeResponse {

    private Long id;
    private String topicName;
    private TopicKnowledgeLevel knowledgeLevel;
    private Boolean ratedByUser;
    private LocalDateTime lastAssessedAt;

    public TopicKnowledgeResponse() {
    }

    public TopicKnowledgeResponse(StudentTopicKnowledge knowledge) {
        this.id = knowledge.getId();
        this.topicName = knowledge.getTopicName();
        this.knowledgeLevel = knowledge.getKnowledgeLevel();
        this.ratedByUser = knowledge.getRatedByUser();
        this.lastAssessedAt = knowledge.getLastAssessedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public LocalDateTime getLastAssessedAt() {
        return lastAssessedAt;
    }

    public void setLastAssessedAt(LocalDateTime lastAssessedAt) {
        this.lastAssessedAt = lastAssessedAt;
    }
}
