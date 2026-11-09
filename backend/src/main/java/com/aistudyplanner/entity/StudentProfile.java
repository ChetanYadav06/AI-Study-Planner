package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "education_level", length = 100)
    private String educationLevel; // High School, Undergraduate, Postgraduate, Self-Taught, Working Professional

    @Column(name = "academic_background", length = 150)
    private String academicBackground; // e.g. Computer Science, Mechanical Engineering, Commerce

    @Column(name = "career_goal", length = 150)
    private String careerGoal; // e.g. Full-Stack Developer, AI/ML Engineer, Data Analyst

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", length = 30)
    private SkillLevel experienceLevel = SkillLevel.BEGINNER;

    @Column(name = "daily_study_hours")
    private Double dailyStudyHours = 2.0;

    @Column(name = "available_days_per_week")
    private Integer availableDaysPerWeek = 5;

    @Column(name = "preferred_study_time", length = 50)
    private String preferredStudyTime = "EVENING"; // MORNING, AFTERNOON, EVENING, NIGHT, FLEXIBLE

    @Column(name = "learning_methods", length = 255)
    private String learningMethods = "VIDEO,CODING_PRACTICE"; // comma-separated: VIDEO, READING, CODING_PRACTICE, PROJECTS, QUIZZES

    @Column(name = "explanation_style", length = 50)
    private String explanationStyle = "STEP_BY_STEP"; // SIMPLE, STEP_BY_STEP, TECHNICAL, EXAMPLES_FIRST

    @Column(name = "practice_style", length = 50)
    private String practiceStyle = "CODING_PROBLEMS"; // MCQS, CODING_PROBLEMS, MINI_PROJECTS, REAL_WORLD

    @Column(name = "additional_context", columnDefinition = "TEXT")
    private String additionalContext; // "What should your AI study planner know about you?"

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public StudentProfile() {
    }

    public StudentProfile(User user) {
        this.user = user;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
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

    public String getEducationLevel() {
        return educationLevel;
    }

    public void setEducationLevel(String educationLevel) {
        this.educationLevel = educationLevel;
    }

    public String getAcademicBackground() {
        return academicBackground;
    }

    public void setAcademicBackground(String academicBackground) {
        this.academicBackground = academicBackground;
    }

    public String getCareerGoal() {
        return careerGoal;
    }

    public void setCareerGoal(String careerGoal) {
        this.careerGoal = careerGoal;
    }

    public SkillLevel getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(SkillLevel experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public Double getDailyStudyHours() {
        return dailyStudyHours;
    }

    public void setDailyStudyHours(Double dailyStudyHours) {
        this.dailyStudyHours = dailyStudyHours;
    }

    public Integer getAvailableDaysPerWeek() {
        return availableDaysPerWeek;
    }

    public void setAvailableDaysPerWeek(Integer availableDaysPerWeek) {
        this.availableDaysPerWeek = availableDaysPerWeek;
    }

    public String getPreferredStudyTime() {
        return preferredStudyTime;
    }

    public void setPreferredStudyTime(String preferredStudyTime) {
        this.preferredStudyTime = preferredStudyTime;
    }

    public String getLearningMethods() {
        return learningMethods;
    }

    public void setLearningMethods(String learningMethods) {
        this.learningMethods = learningMethods;
    }

    public String getExplanationStyle() {
        return explanationStyle;
    }

    public void setExplanationStyle(String explanationStyle) {
        this.explanationStyle = explanationStyle;
    }

    public String getPracticeStyle() {
        return practiceStyle;
    }

    public void setPracticeStyle(String practiceStyle) {
        this.practiceStyle = practiceStyle;
    }

    public String getAdditionalContext() {
        return additionalContext;
    }

    public void setAdditionalContext(String additionalContext) {
        this.additionalContext = additionalContext;
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

