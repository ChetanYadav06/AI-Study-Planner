package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SkillLevel;
import java.time.LocalDateTime;
import java.util.Map;

public class StudentProfileResponse {

    private Long userId;
    private String name;
    private String email;
    private LocalDateTime memberSince;

    private String educationLevel;
    private String academicBackground;
    private String careerGoal;
    private SkillLevel experienceLevel;
    private Double dailyStudyHours;
    private Integer availableDaysPerWeek;
    private String preferredStudyTime;
    private String learningMethods;
    private String explanationStyle;
    private String practiceStyle;
    private String additionalContext;
    private LocalDateTime updatedAt;

    // Computed Profile Stats
    private int completionPercentage;
    private long totalSkills;
    private long activeGoals;
    private Map<String, Long> skillsDistribution;

    public StudentProfileResponse() {
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDateTime getMemberSince() {
        return memberSince;
    }

    public void setMemberSince(LocalDateTime memberSince) {
        this.memberSince = memberSince;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public int getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(int completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public long getTotalSkills() {
        return totalSkills;
    }

    public void setTotalSkills(long totalSkills) {
        this.totalSkills = totalSkills;
    }

    public long getActiveGoals() {
        return activeGoals;
    }

    public void setActiveGoals(long activeGoals) {
        this.activeGoals = activeGoals;
    }

    public Map<String, Long> getSkillsDistribution() {
        return skillsDistribution;
    }

    public void setSkillsDistribution(Map<String, Long> skillsDistribution) {
        this.skillsDistribution = skillsDistribution;
    }
}

