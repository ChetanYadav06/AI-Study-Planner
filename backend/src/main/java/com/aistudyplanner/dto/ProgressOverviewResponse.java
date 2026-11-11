package com.aistudyplanner.dto;

import java.util.List;

public class ProgressOverviewResponse {
    private List<DailyStudyMinutes> studyHistory14Days;
    private int currentStreakDays;
    private List<PhaseProgressItem> phaseProgress;
    private List<NeedsAttentionItem> needsAttention;
    private ScheduleStatusDto scheduleStatus;

    public ProgressOverviewResponse() {}

    public ProgressOverviewResponse(List<DailyStudyMinutes> studyHistory14Days, int currentStreakDays,
                                  List<PhaseProgressItem> phaseProgress, List<NeedsAttentionItem> needsAttention,
                                  ScheduleStatusDto scheduleStatus) {
        this.studyHistory14Days = studyHistory14Days;
        this.currentStreakDays = currentStreakDays;
        this.phaseProgress = phaseProgress;
        this.needsAttention = needsAttention;
        this.scheduleStatus = scheduleStatus;
    }

    public List<DailyStudyMinutes> getStudyHistory14Days() {
        return studyHistory14Days;
    }

    public void setStudyHistory14Days(List<DailyStudyMinutes> studyHistory14Days) {
        this.studyHistory14Days = studyHistory14Days;
    }

    public int getCurrentStreakDays() {
        return currentStreakDays;
    }

    public void setCurrentStreakDays(int currentStreakDays) {
        this.currentStreakDays = currentStreakDays;
    }

    public List<PhaseProgressItem> getPhaseProgress() {
        return phaseProgress;
    }

    public void setPhaseProgress(List<PhaseProgressItem> phaseProgress) {
        this.phaseProgress = phaseProgress;
    }

    public List<NeedsAttentionItem> getNeedsAttention() {
        return needsAttention;
    }

    public void setNeedsAttention(List<NeedsAttentionItem> needsAttention) {
        this.needsAttention = needsAttention;
    }

    public ScheduleStatusDto getScheduleStatus() {
        return scheduleStatus;
    }

    public void setScheduleStatus(ScheduleStatusDto scheduleStatus) {
        this.scheduleStatus = scheduleStatus;
    }

    public static class DailyStudyMinutes {
        private String date; // YYYY-MM-DD
        private int minutes;

        public DailyStudyMinutes() {}

        public DailyStudyMinutes(String date, int minutes) {
            this.date = date;
            this.minutes = minutes;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public int getMinutes() {
            return minutes;
        }

        public void setMinutes(int minutes) {
            this.minutes = minutes;
        }
    }

    public static class PhaseProgressItem {
        private int phaseIndex;
        private String phaseTitle;
        private int completedTasks;
        private int totalTasks;
        private int progressPercentage;

        public PhaseProgressItem() {}

        public PhaseProgressItem(int phaseIndex, String phaseTitle, int completedTasks, int totalTasks, int progressPercentage) {
            this.phaseIndex = phaseIndex;
            this.phaseTitle = phaseTitle;
            this.completedTasks = completedTasks;
            this.totalTasks = totalTasks;
            this.progressPercentage = progressPercentage;
        }

        public int getPhaseIndex() {
            return phaseIndex;
        }

        public void setPhaseIndex(int phaseIndex) {
            this.phaseIndex = phaseIndex;
        }

        public String getPhaseTitle() {
            return phaseTitle;
        }

        public void setPhaseTitle(String phaseTitle) {
            this.phaseTitle = phaseTitle;
        }

        public int getCompletedTasks() {
            return completedTasks;
        }

        public void setCompletedTasks(int completedTasks) {
            this.completedTasks = completedTasks;
        }

        public int getTotalTasks() {
            return totalTasks;
        }

        public void setTotalTasks(int totalTasks) {
            this.totalTasks = totalTasks;
        }

        public int getProgressPercentage() {
            return progressPercentage;
        }

        public void setProgressPercentage(int progressPercentage) {
            this.progressPercentage = progressPercentage;
        }
    }

    public static class ScheduleStatusDto {
        private String status; // AHEAD, ON_TRACK, BEHIND
        private String label;  // Ahead of Schedule, On Track, Behind Schedule
        private String detail;
        private int delta;
        private int completedDays;
        private int expectedDays;

        public ScheduleStatusDto() {}

        public ScheduleStatusDto(String status, String label, String detail, int delta, int completedDays, int expectedDays) {
            this.status = status;
            this.label = label;
            this.detail = detail;
            this.delta = delta;
            this.completedDays = completedDays;
            this.expectedDays = expectedDays;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getDetail() {
            return detail;
        }

        public void setDetail(String detail) {
            this.detail = detail;
        }

        public int getDelta() {
            return delta;
        }

        public void setDelta(int delta) {
            this.delta = delta;
        }

        public int getCompletedDays() {
            return completedDays;
        }

        public void setCompletedDays(int completedDays) {
            this.completedDays = completedDays;
        }

        public int getExpectedDays() {
            return expectedDays;
        }

        public void setExpectedDays(int expectedDays) {
            this.expectedDays = expectedDays;
        }
    }
}

