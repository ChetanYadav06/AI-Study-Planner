package com.aistudyplanner.service;

import com.aistudyplanner.dto.ProgressOverviewResponse.ScheduleStatusDto;
import com.aistudyplanner.entity.SavedRoadmap;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleStatusServiceTest {

    private ScheduleStatusService scheduleStatusService;
    private ObjectMapper objectMapper;
    private Clock fixedClock;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        Instant fixedInstant = Instant.parse("2026-03-15T12:00:00Z");
        fixedClock = Clock.fixed(fixedInstant, ZoneOffset.UTC);
        scheduleStatusService = new ScheduleStatusService(objectMapper, fixedClock);
    }

    @Test
    void testAheadOfSchedule() {
        SavedRoadmap roadmap = new SavedRoadmap();
        // Created 7 calendar days ago
        roadmap.setCreatedAt(LocalDateTime.of(2026, 3, 8, 12, 0, 0));
        // Available days 5 -> expected study days = round(7 * 5 / 7) = 5
        // Completed 7 tasks -> delta = 7 - 5 = +2 -> Ahead
        roadmap.setCompletedTasksJson("[\"t1\",\"t2\",\"t3\",\"t4\",\"t5\",\"t6\",\"t7\"]");

        ScheduleStatusDto result = scheduleStatusService.computeScheduleStatus(roadmap, 5);
        assertEquals("AHEAD", result.getStatus());
        assertEquals("Ahead of Schedule", result.getLabel());
        assertEquals(2, result.getDelta());
        assertEquals(7, result.getCompletedDays());
        assertEquals(5, result.getExpectedDays());
    }

    @Test
    void testOnTrackSchedule() {
        SavedRoadmap roadmap = new SavedRoadmap();
        // Created 7 calendar days ago -> expected = 5
        roadmap.setCreatedAt(LocalDateTime.of(2026, 3, 8, 12, 0, 0));
        // Completed 5 tasks -> delta = 0 -> On Track
        roadmap.setCompletedTasksJson("[\"t1\",\"t2\",\"t3\",\"t4\",\"t5\"]");

        ScheduleStatusDto result = scheduleStatusService.computeScheduleStatus(roadmap, 5);
        assertEquals("ON_TRACK", result.getStatus());
        assertEquals("On Track", result.getLabel());
        assertEquals(0, result.getDelta());
    }

    @Test
    void testBehindSchedule() {
        SavedRoadmap roadmap = new SavedRoadmap();
        // Created 14 calendar days ago -> expected = 10
        roadmap.setCreatedAt(LocalDateTime.of(2026, 3, 1, 12, 0, 0));
        // Completed 4 tasks -> delta = 4 - 10 = -6 -> Behind
        roadmap.setCompletedTasksJson("[\"t1\",\"t2\",\"t3\",\"t4\"]");

        ScheduleStatusDto result = scheduleStatusService.computeScheduleStatus(roadmap, 5);
        assertEquals("BEHIND", result.getStatus());
        assertEquals("Behind Schedule", result.getLabel());
        assertEquals(-6, result.getDelta());
    }

    @Test
    void testNullRoadmapSafeFallback() {
        ScheduleStatusDto result = scheduleStatusService.computeScheduleStatus(null, 5);
        assertEquals("ON_TRACK", result.getStatus());
        assertEquals(0, result.getDelta());
    }
}

