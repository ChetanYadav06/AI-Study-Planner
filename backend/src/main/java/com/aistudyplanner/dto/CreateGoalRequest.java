package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SkillLevel;
import jakarta.validation.constraints.*;

public class CreateGoalRequest {

    @NotBlank(message = "Goal title is required.")
    @Size(min = 3, max = 150, message = "Goal title must be between 3 and 150 characters.")
    private String title;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters.")
    private String description;

    @NotNull(message = "Target duration in days is required.")
    @Min(value = 1, message = "Target duration must be at least 1 day.")
    @Max(value = 365, message = "Target duration cannot exceed 365 days.")
    private Integer targetDays;

    @NotNull(message = "Daily study commitment hours is required.")
    @DecimalMin(value = "0.5", message = "Daily commitment must be at least 0.5 hours.")
    @DecimalMax(value = "24.0", message = "Daily commitment cannot exceed 24 hours.")
    private Double hoursPerDay;

    @NotNull(message = "Skill level is required.")
    private SkillLevel skillLevel;

    public CreateGoalRequest() {
    }

    public CreateGoalRequest(String title, String description, Integer targetDays, Double hoursPerDay, SkillLevel skillLevel) {
        this.title = title;
        this.description = description;
        this.targetDays = targetDays;
        this.hoursPerDay = hoursPerDay;
        this.skillLevel = skillLevel;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public SkillLevel getSkillLevel() {
        return skillLevel;
    }

    public void setSkillLevel(SkillLevel skillLevel) {
        this.skillLevel = skillLevel;
    }
}
