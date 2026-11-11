package com.aistudyplanner.dto;

public class NeedsAttentionItem {

    private String type; // "PHASE" or "TASK"
    private Long roadmapId;
    private String roadmapTitle;
    private Integer phaseIndex;
    private String phaseTitle;
    private String taskId;
    private String taskTitle;
    private String reason;

    public NeedsAttentionItem() {
    }

    public static NeedsAttentionItem forPhase(Long roadmapId, String roadmapTitle, int phaseIndex, String phaseTitle, String reason) {
        NeedsAttentionItem item = new NeedsAttentionItem();
        item.setType("PHASE");
        item.setRoadmapId(roadmapId);
        item.setRoadmapTitle(roadmapTitle);
        item.setPhaseIndex(phaseIndex);
        item.setPhaseTitle(phaseTitle);
        item.setReason(reason);
        return item;
    }

    public static NeedsAttentionItem forTask(Long roadmapId, String roadmapTitle, int phaseIndex, String phaseTitle, String taskId, String taskTitle, String reason) {
        NeedsAttentionItem item = new NeedsAttentionItem();
        item.setType("TASK");
        item.setRoadmapId(roadmapId);
        item.setRoadmapTitle(roadmapTitle);
        item.setPhaseIndex(phaseIndex);
        item.setPhaseTitle(phaseTitle);
        item.setTaskId(taskId);
        item.setTaskTitle(taskTitle);
        item.setReason(reason);
        return item;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(Long roadmapId) {
        this.roadmapId = roadmapId;
    }

    public String getRoadmapTitle() {
        return roadmapTitle;
    }

    public void setRoadmapTitle(String roadmapTitle) {
        this.roadmapTitle = roadmapTitle;
    }

    public Integer getPhaseIndex() {
        return phaseIndex;
    }

    public void setPhaseIndex(Integer phaseIndex) {
        this.phaseIndex = phaseIndex;
    }

    public String getPhaseTitle() {
        return phaseTitle;
    }

    public void setPhaseTitle(String phaseTitle) {
        this.phaseTitle = phaseTitle;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskTitle() {
        return taskTitle;
    }

    public void setTaskTitle(String taskTitle) {
        this.taskTitle = taskTitle;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
