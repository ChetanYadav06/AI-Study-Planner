package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SkillLevel;
import jakarta.validation.constraints.*;

public class StudentProfileRequest {

    @Size(max = 100, message = "Education level cannot exceed 100 characters.")
    private String educationLevel;

    @Size(max = 150, message = "Academic background cannot exceed 150 characters.")
    private String academicBackground;

    @Size(max = 150, message = "Career goal cannot exceed 150 characters.")
    private String careerGoal;

    private SkillLevel experienceLevel;

    @DecimalMin(value = "0.5", message = "Daily study hours must be at least 0.5.")
    @DecimalMax(value = "24.0", message = "Daily study hours cannot exceed 24.0.")
    private Double dailyStudyHours;

    @Min(value = 1, message = "Available days per week must be between 1 and 7.")
    @Max(value = 7, message = "Available days per week must be between 1 and 7.")
    private Integer availableDaysPerWeek;

    private String preferredStudyTime;

    private String learningMethods;

    private String explanationStyle;

    private String practiceStyle;

    @Size(max = 4000, message = "Additional context cannot exceed 4000 characters.")
    private String additionalContext;

    public StudentProfileRequest() {
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
}

