package com.aistudyplanner.service;

import com.aistudyplanner.dto.ProgressOverviewResponse.ScheduleStatusDto;
import com.aistudyplanner.entity.SavedRoadmap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class ScheduleStatusService {

    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Autowired
    public ScheduleStatusService(ObjectMapper objectMapper) {
        this(objectMapper, Clock.systemUTC());
    }

    public ScheduleStatusService(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public ScheduleStatusDto computeScheduleStatus(SavedRoadmap roadmap, int availableDaysPerWeek) {
        if (roadmap == null || roadmap.getCreatedAt() == null) {
            return new ScheduleStatusDto("ON_TRACK", "On Track", "No active roadmap to track", 0, 0, 0);
        }

        int availableDaysCount = Math.max(1, Math.min(7, availableDaysPerWeek > 0 ? availableDaysPerWeek : 5));
        LocalDateTime createdDate = roadmap.getCreatedAt();
        LocalDateTime now = LocalDateTime.now(clock);

        long diffSeconds = Math.max(0, Duration.between(createdDate, now).getSeconds());
        long calendarDaysElapsed = diffSeconds / (60 * 60 * 24);

        int expectedStudyDays = Math.max(1, (int) Math.round((calendarDaysElapsed * (double) availableDaysCount) / 7.0));

        int completedCount = 0;
        if (roadmap.getCompletedTasksJson() != null && !roadmap.getCompletedTasksJson().isBlank()) {
            try {
                JsonNode arr = objectMapper.readTree(roadmap.getCompletedTasksJson());
                if (arr.isArray()) {
                    completedCount = arr.size();
                }
            } catch (Exception ignored) {
            }
        }

        int delta = completedCount - expectedStudyDays;

        if (delta >= 1) {
            String dayWord = delta == 1 ? "day" : "days";
            return new ScheduleStatusDto(
                    "AHEAD",
                    "Ahead of Schedule",
                    "+" + delta + " " + dayWord + " ahead (" + completedCount + " completed vs " + expectedStudyDays + " expected)",
                    delta,
                    completedCount,
                    expectedStudyDays
            );
        } else if (Math.abs(delta) <= 1) {
            return new ScheduleStatusDto(
                    "ON_TRACK",
                    "On Track",
                    "On pace (" + completedCount + " completed of ~" + expectedStudyDays + " expected study days)",
                    delta,
                    completedCount,
                    expectedStudyDays
            );
        } else {
            int behindDays = Math.abs(delta);
            String dayWord = behindDays == 1 ? "day" : "days";
            return new ScheduleStatusDto(
                    "BEHIND",
                    "Behind Schedule",
                    behindDays + " " + dayWord + " behind (" + completedCount + " completed vs " + expectedStudyDays + " expected)",
                    delta,
                    completedCount,
                    expectedStudyDays
            );
        }
    }
}

