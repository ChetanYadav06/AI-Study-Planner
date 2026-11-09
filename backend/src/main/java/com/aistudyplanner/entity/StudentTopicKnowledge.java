package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_topic_knowledge", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "student_id", "topic_name" })
})
public class StudentTopicKnowledge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "topic_name", nullable = false, length = 150)
    private String topicName;

    @Enumerated(EnumType.STRING)
    @Column(name = "knowledge_level", nullable = false, length = 30)
    private TopicKnowledgeLevel knowledgeLevel;

    @Column(name = "last_assessed_at")
    private LocalDateTime lastAssessedAt;

    public StudentTopicKnowledge() {
    }

    public StudentTopicKnowledge(
            User student,
            String topicName,
            TopicKnowledgeLevel knowledgeLevel) {
        this.student = student;
        this.topicName = topicName;
        this.knowledgeLevel = knowledgeLevel;
    }

    @PrePersist
    @PreUpdate
    protected void updateAssessmentTimestamp() {
        this.lastAssessedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
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

    public LocalDateTime getLastAssessedAt() {
        return lastAssessedAt;
    }

    public void setLastAssessedAt(LocalDateTime lastAssessedAt) {
        this.lastAssessedAt = lastAssessedAt;
    }
}