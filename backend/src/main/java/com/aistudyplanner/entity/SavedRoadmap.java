package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_roadmaps")
public class SavedRoadmap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "goal_id")
    private Long goalId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 150)
    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_level", nullable = false, length = 30)
    private SkillLevel skillLevel;

    @Column(name = "target_days", nullable = false)
    private Integer targetDays;

    @Column(name = "hours_per_day", nullable = false)
    private Double hoursPerDay;

    @Column(name = "roadmap_json", columnDefinition = "LONGTEXT", nullable = false)
    private String roadmapJson;

    @Column(name = "completed_tasks_json", columnDefinition = "TEXT")
    private String completedTasksJson = "[]";

    @Column(name = "completed_milestones_json", columnDefinition = "TEXT")
    private String completedMilestonesJson = "[]";

    @Column(name = "progress_percentage", nullable = false)
    private Integer progressPercentage = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SavedRoadmap() {
    }

    public SavedRoadmap(User user, String title, String topic, SkillLevel skillLevel, Integer targetDays, Double hoursPerDay, String roadmapJson) {
        this.user = user;
        this.title = title;
        this.topic = topic;
        this.skillLevel = skillLevel;
        this.targetDays = targetDays;
        this.hoursPerDay = hoursPerDay;
        this.roadmapJson = roadmapJson;
        this.progressPercentage = 0;
        this.completedTasksJson = "[]";
        this.completedMilestonesJson = "[]";
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.progressPercentage == null) this.progressPercentage = 0;
        if (this.completedTasksJson == null) this.completedTasksJson = "[]";
        if (this.completedMilestonesJson == null) this.completedMilestonesJson = "[]";
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

    public Long getGoalId() {
        return goalId;
    }

    public void setGoalId(Long goalId) {
        this.goalId = goalId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public SkillLevel getSkillLevel() {
        return skillLevel;
    }

    public void setSkillLevel(SkillLevel skillLevel) {
        this.skillLevel = skillLevel;
    }

    public Integer getTargetDays() {
        return targetDays;
    }

    public void setTargetDays(Integer targetDays) {
        this.targetDays = targetDays;
    }

    public Double getHoursPerDay() {
        return hoursPerDay;
    }

    public void setHoursPerDay(Double hoursPerDay) {
        this.hoursPerDay = hoursPerDay;
    }

    public String getRoadmapJson() {
        return roadmapJson;
    }

    public void setRoadmapJson(String roadmapJson) {
        this.roadmapJson = roadmapJson;
    }

    public String getCompletedTasksJson() {
        return completedTasksJson;
    }

    public void setCompletedTasksJson(String completedTasksJson) {
        this.completedTasksJson = completedTasksJson;
    }

    public String getCompletedMilestonesJson() {
        return completedMilestonesJson;
    }

    public void setCompletedMilestonesJson(String completedMilestonesJson) {
        this.completedMilestonesJson = completedMilestonesJson;
    }

    public Integer getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(Integer progressPercentage) {
        this.progressPercentage = progressPercentage;
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

