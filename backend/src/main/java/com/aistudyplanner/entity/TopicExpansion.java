package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "topic_expansions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_topic_expansion", columnNames = {"roadmap_id", "day_number", "topic_title", "level"})
        })
public class TopicExpansion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private SavedRoadmap roadmap;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "topic_title", nullable = false, length = 255)
    private String topicTitle;

    @Column(name = "level", nullable = false)
    private int level;

    @Lob
    @Column(name = "markdown_content", columnDefinition = "LONGTEXT", nullable = false)
    private String markdownContent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TopicExpansion() {
    }

    public TopicExpansion(SavedRoadmap roadmap, int dayNumber, String topicTitle, int level, String markdownContent) {
        this.roadmap = roadmap;
        this.dayNumber = dayNumber;
        this.topicTitle = topicTitle;
        this.level = level;
        this.markdownContent = markdownContent;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public SavedRoadmap getRoadmap() {
        return roadmap;
    }

    public void setRoadmap(SavedRoadmap roadmap) {
        this.roadmap = roadmap;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
