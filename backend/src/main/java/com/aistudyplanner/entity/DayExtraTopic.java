package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "day_extra_topics")
public class DayExtraTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private SavedRoadmap roadmap;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public DayExtraTopic() {
    }

    public DayExtraTopic(SavedRoadmap roadmap, int dayNumber, String title, String summary) {
        this.roadmap = roadmap;
        this.dayNumber = dayNumber;
        this.title = title;
        this.summary = summary;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
