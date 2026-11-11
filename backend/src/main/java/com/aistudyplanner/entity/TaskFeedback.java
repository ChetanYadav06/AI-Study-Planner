package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_feedback",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_task_feedback_user_roadmap_task", columnNames = {"user_id", "roadmap_id", "task_id"})
        })
public class TaskFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private SavedRoadmap roadmap;

    @Column(name = "task_id", nullable = false, length = 100)
    private String taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "rating", nullable = false, length = 20)
    private TaskFeedbackRating rating;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TaskFeedback() {
    }

    public TaskFeedback(User user, SavedRoadmap roadmap, String taskId, TaskFeedbackRating rating) {
        this.user = user;
        this.roadmap = roadmap;
        this.taskId = taskId;
        this.rating = rating;
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

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public SavedRoadmap getRoadmap() {
        return roadmap;
    }

    public void setRoadmap(SavedRoadmap roadmap) {
        this.roadmap = roadmap;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public TaskFeedbackRating getRating() {
        return rating;
    }

    public void setRating(TaskFeedbackRating rating) {
        this.rating = rating;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
