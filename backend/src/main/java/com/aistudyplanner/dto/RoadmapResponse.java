package com.aistudyplanner.dto;

import java.util.ArrayList;
import java.util.List;

public class RoadmapResponse {

    private String id;
    private String topic;
    private String skillLevel;
    private Integer targetDays;
    private Double hoursPerDay;
    private Double totalStudyHours;
    private String feasibilityNote;
    private List<String> prerequisites = new ArrayList<>();
    private String overview;
    private List<WeeklyPhase> phases = new ArrayList<>();
    private List<ResourceItem> learningResources = new ArrayList<>();
    private List<String> resources = new ArrayList<>(); // Legacy compatibility
    private String rawRoadmap;

    public RoadmapResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public static class DailyTask {
        private int dayNumber;
        private String title;
        private String description;
        private int estimatedMinutes;
        private String activityType; // STUDY | PRACTICE | REVISION | ASSESSMENT

        public DailyTask() {}

        public DailyTask(int dayNumber, String title, String description, int estimatedMinutes, String activityType) {
            this.dayNumber = dayNumber;
            this.title = title;
            this.description = description;
            this.estimatedMinutes = estimatedMinutes;
            this.activityType = activityType;
        }

        public int getDayNumber() { return dayNumber; }
        public void setDayNumber(int dayNumber) { this.dayNumber = dayNumber; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public int getEstimatedMinutes() { return estimatedMinutes; }
        public void setEstimatedMinutes(int estimatedMinutes) { this.estimatedMinutes = estimatedMinutes; }

        public String getActivityType() { return activityType; }
        public void setActivityType(String activityType) { this.activityType = activityType; }
    }

    public static class PracticalExercise {
        private String title;
        private String instructions;
        private String difficulty; // BEGINNER | INTERMEDIATE | ADVANCED

        public PracticalExercise() {}

        public PracticalExercise(String title, String instructions, String difficulty) {
            this.title = title;
            this.instructions = instructions;
            this.difficulty = difficulty;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }

        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    }

    public static class Assessment {
        private String title;
        private String type; // QUIZ | PROJECT | CODE_CHALLENGE
        private String description;
        private String passingCriteria;

        public Assessment() {}

        public Assessment(String title, String type, String description, String passingCriteria) {
            this.title = title;
            this.type = type;
            this.description = description;
            this.passingCriteria = passingCriteria;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getPassingCriteria() { return passingCriteria; }
        public void setPassingCriteria(String passingCriteria) { this.passingCriteria = passingCriteria; }
    }

    public static class ResourceItem {
        private String title;
        private String url;
        private String type; // DOCUMENTATION | VIDEO | COURSE | BOOK | PRACTICE_PLATFORM
        private String relevance;
        private boolean isVerified;

        public ResourceItem() {}

        public ResourceItem(String title, String url, String type, String relevance, boolean isVerified) {
            this.title = title;
            this.url = url;
            this.type = type;
            this.relevance = relevance;
            this.isVerified = isVerified;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getRelevance() { return relevance; }
        public void setRelevance(String relevance) { this.relevance = relevance; }

        public boolean isVerified() { return isVerified; }
        public void setVerified(boolean verified) { isVerified = verified; }
    }

    public static class WeeklyPhase {
        private Integer phaseNumber;
        private String phase;
        private String phaseTitle;
        private String duration;
        private Integer durationDays;
        private List<String> topics = new ArrayList<>();
        private List<String> subtopics = new ArrayList<>();
        private List<String> milestones = new ArrayList<>();
        private List<DailyTask> dailyTasks = new ArrayList<>();
        private List<PracticalExercise> practicalExercises = new ArrayList<>();
        private Assessment assessment;

        public WeeklyPhase() {}

        public Integer getPhaseNumber() { return phaseNumber; }
        public void setPhaseNumber(Integer phaseNumber) { this.phaseNumber = phaseNumber; }

        public String getPhase() {
            return phase != null && !phase.isBlank() ? phase : phaseTitle;
        }

        public void setPhase(String phase) {
            this.phase = phase;
            if (this.phaseTitle == null) this.phaseTitle = phase;
        }

        public String getPhaseTitle() {
            return phaseTitle != null && !phaseTitle.isBlank() ? phaseTitle : phase;
        }

        public void setPhaseTitle(String phaseTitle) {
            this.phaseTitle = phaseTitle;
            if (this.phase == null) this.phase = phaseTitle;
        }

        public String getDuration() { return duration; }
        public void setDuration(String duration) { this.duration = duration; }

        public Integer getDurationDays() { return durationDays; }
        public void setDurationDays(Integer durationDays) {
            this.durationDays = durationDays;
            if (this.duration == null && durationDays != null) {
                this.duration = durationDays + " days";
            }
        }

        public List<String> getTopics() { return topics; }
        public void setTopics(List<String> topics) { this.topics = topics != null ? topics : new ArrayList<>(); }

        public List<String> getSubtopics() { return subtopics; }
        public void setSubtopics(List<String> subtopics) { this.subtopics = subtopics != null ? subtopics : new ArrayList<>(); }

        public List<String> getMilestones() { return milestones; }
        public void setMilestones(List<String> milestones) { this.milestones = milestones != null ? milestones : new ArrayList<>(); }

        public List<DailyTask> getDailyTasks() { return dailyTasks; }
        public void setDailyTasks(List<DailyTask> dailyTasks) { this.dailyTasks = dailyTasks != null ? dailyTasks : new ArrayList<>(); }

        public List<PracticalExercise> getPracticalExercises() { return practicalExercises; }
        public void setPracticalExercises(List<PracticalExercise> practicalExercises) { this.practicalExercises = practicalExercises != null ? practicalExercises : new ArrayList<>(); }

        public Assessment getAssessment() { return assessment; }
        public void setAssessment(Assessment assessment) { this.assessment = assessment; }
    }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getSkillLevel() { return skillLevel; }
    public void setSkillLevel(String skillLevel) { this.skillLevel = skillLevel; }

    public Integer getTargetDays() { return targetDays; }
    public void setTargetDays(Integer targetDays) { this.targetDays = targetDays; }

    public Double getHoursPerDay() { return hoursPerDay; }
    public void setHoursPerDay(Double hoursPerDay) { this.hoursPerDay = hoursPerDay; }

    public Double getTotalStudyHours() { return totalStudyHours; }
    public void setTotalStudyHours(Double totalStudyHours) { this.totalStudyHours = totalStudyHours; }

    public String getFeasibilityNote() { return feasibilityNote; }
    public void setFeasibilityNote(String feasibilityNote) { this.feasibilityNote = feasibilityNote; }

    public List<String> getPrerequisites() { return prerequisites; }
    public void setPrerequisites(List<String> prerequisites) { this.prerequisites = prerequisites != null ? prerequisites : new ArrayList<>(); }

    public String getOverview() { return overview; }
    public void setOverview(String overview) { this.overview = overview; }

    public List<WeeklyPhase> getPhases() { return phases; }
    public void setPhases(List<WeeklyPhase> phases) { this.phases = phases != null ? phases : new ArrayList<>(); }

    public List<ResourceItem> getLearningResources() { return learningResources; }
    public void setLearningResources(List<ResourceItem> learningResources) {
        this.learningResources = learningResources != null ? learningResources : new ArrayList<>();
        // Sync legacy resources list if empty
        if ((this.resources == null || this.resources.isEmpty()) && !this.learningResources.isEmpty()) {
            this.resources = this.learningResources.stream()
                .map(r -> r.getTitle() + (r.getUrl() != null && !r.getUrl().isBlank() ? " (" + r.getUrl() + ")" : ""))
                .toList();
        }
    }

    public List<String> getResources() { return resources; }
    public void setResources(List<String> resources) { this.resources = resources != null ? resources : new ArrayList<>(); }

    public String getRawRoadmap() { return rawRoadmap; }
    public void setRawRoadmap(String rawRoadmap) { this.rawRoadmap = rawRoadmap; }
}
