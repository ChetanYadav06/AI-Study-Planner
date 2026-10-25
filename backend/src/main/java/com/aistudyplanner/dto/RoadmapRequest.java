package com.aistudyplanner.dto;

import com.aistudyplanner.entity.SkillLevel;
import jakarta.validation.constraints.*;

public class RoadmapRequest {

    @NotBlank(message = "Topic is required")
    private String topic;

    private String description;

    @NotNull(message = "Skill level is required")
    private SkillLevel skillLevel;

    @NotNull(message = "Target days is required")
    @Min(value = 1, message = "Target days must be at least 1")
    @Max(value = 365, message = "Target days cannot exceed 365")
    private Integer targetDays;

    @NotNull(message = "Hours per day is required")
    @DecimalMin(value = "0.5", message = "Daily commitment must be at least 0.5 hours.")
    @DecimalMax(value = "24.0", message = "Daily commitment cannot exceed 24 hours.")
    private Double hoursPerDay;

    // Optionally link to an existing goal
    private Long goalId;

    // Enhanced Personalization Inputs
    private String specificTopics;
    private String targetOutcomes;
    private String priorKnowledge;

    public RoadmapRequest() {}

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public SkillLevel getSkillLevel() { return skillLevel; }
    public void setSkillLevel(SkillLevel skillLevel) { this.skillLevel = skillLevel; }

    public Integer getTargetDays() { return targetDays; }
    public void setTargetDays(Integer targetDays) { this.targetDays = targetDays; }

    public Double getHoursPerDay() { return hoursPerDay; }
    public void setHoursPerDay(Double hoursPerDay) { this.hoursPerDay = hoursPerDay; }

    public Long getGoalId() { return goalId; }
    public void setGoalId(Long goalId) { this.goalId = goalId; }

    public String getSpecificTopics() { return specificTopics; }
    public void setSpecificTopics(String specificTopics) { this.specificTopics = specificTopics; }

    public String getTargetOutcomes() { return targetOutcomes; }
    public void setTargetOutcomes(String targetOutcomes) { this.targetOutcomes = targetOutcomes; }

    public String getPriorKnowledge() { return priorKnowledge; }
    public void setPriorKnowledge(String priorKnowledge) { this.priorKnowledge = priorKnowledge; }
}
