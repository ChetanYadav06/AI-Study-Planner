package com.aistudyplanner.service;

import com.aistudyplanner.dto.CreateSessionRequest;
import com.aistudyplanner.dto.StudySessionResponse;
import com.aistudyplanner.dto.StudySessionSummaryResponse;
import com.aistudyplanner.entity.*;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceTest {

    @Mock
    private StudySessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private SavedRoadmapRepository roadmapRepository;

    @InjectMocks
    private StudySessionService sessionService;

    private User testUser;
    private Goal testGoal;
    private SavedRoadmap testRoadmap;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(100L);
        testUser.setEmail("student@example.com");

        testGoal = new Goal();
        testGoal.setId(50L);
        testGoal.setUser(testUser);

        testRoadmap = new SavedRoadmap();
        testRoadmap.setId(20L);
        testRoadmap.setUser(testUser);
    }

    @Test
    @DisplayName("Should create session successfully when valid")
    void testCreateSessionSuccess() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(goalRepository.findByIdAndUserId(testGoal.getId(), testUser.getId())).thenReturn(Optional.of(testGoal));
        when(roadmapRepository.findByIdAndUserEmail(testRoadmap.getId(), testUser.getEmail())).thenReturn(Optional.of(testRoadmap));
        when(sessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> {
            StudySession s = invocation.getArgument(0);
            s.setId(1L);
            return s;
        });

        CreateSessionRequest req = new CreateSessionRequest();
        req.setGoalId(testGoal.getId());
        req.setRoadmapId(testRoadmap.getId());
        req.setTaskId("0-task-1");
        req.setStartedAt(LocalDateTime.now().minusMinutes(25));
        req.setEndedAt(LocalDateTime.now());
        req.setDurationSeconds(1500);
        req.setSessionType(SessionType.FOCUS);

        StudySessionResponse res = sessionService.createSession(testUser.getEmail(), req);

        assertNotNull(res);
        assertEquals(1L, res.getId());
        assertEquals("0-task-1", res.getTaskId());
        assertEquals(1500, res.getDurationSeconds());
        verify(sessionRepository).save(any(StudySession.class));
    }

    @Test
    @DisplayName("Should reject session shorter than 60 seconds")
    void testRejectTooShortSession() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        CreateSessionRequest req = new CreateSessionRequest();
        req.setStartedAt(LocalDateTime.now().minusSeconds(40));
        req.setEndedAt(LocalDateTime.now());
        req.setDurationSeconds(40); // < 60s

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                sessionService.createSession(testUser.getEmail(), req)
        );
        assertTrue(ex.getMessage().contains("at least 60 seconds"));
    }

    @Test
    @DisplayName("Should reject session longer than 4 hours")
    void testRejectTooLongSession() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        CreateSessionRequest req = new CreateSessionRequest();
        req.setStartedAt(LocalDateTime.now().minusHours(5));
        req.setEndedAt(LocalDateTime.now());
        req.setDurationSeconds(18000); // 5 hours > 14400s

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                sessionService.createSession(testUser.getEmail(), req)
        );
        assertTrue(ex.getMessage().contains("cannot exceed 4 hours"));
    }

    @Test
    @DisplayName("Should reject session if endedAt is not after startedAt")
    void testRejectInvalidTimestamps() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        CreateSessionRequest req = new CreateSessionRequest();
        req.setStartedAt(LocalDateTime.now());
        req.setEndedAt(LocalDateTime.now().minusMinutes(5));
        req.setDurationSeconds(300);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                sessionService.createSession(testUser.getEmail(), req)
        );
        assertTrue(ex.getMessage().contains("endedAt must be strictly after startedAt"));
    }

    @Test
    @DisplayName("Should reject session if goal does not belong to user")
    void testRejectGoalBelongingToAnotherUser() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(goalRepository.findByIdAndUserId(999L, testUser.getId())).thenReturn(Optional.empty());

        CreateSessionRequest req = new CreateSessionRequest();
        req.setGoalId(999L);
        req.setStartedAt(LocalDateTime.now().minusMinutes(30));
        req.setEndedAt(LocalDateTime.now());
        req.setDurationSeconds(1800);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                sessionService.createSession(testUser.getEmail(), req)
        );
        assertTrue(ex.getMessage().contains("Goal does not belong"));
    }

    @Test
    @DisplayName("Should compute correct summary per day and per goal")
    void testGetSummary() {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        LocalDateTime now = LocalDateTime.now();
        StudySession s1 = new StudySession(testUser, 50L, 20L, "0-task-1", now.minusMinutes(30), now, 1800, SessionType.FOCUS, true);
        StudySession s2 = new StudySession(testUser, 50L, 20L, "0-task-2", now.minusMinutes(90), now.minusMinutes(60), 1800, SessionType.FOCUS, true);

        when(sessionRepository.findByUserIdOrderByStartedAtDesc(testUser.getId())).thenReturn(List.of(s1, s2));

        StudySessionSummaryResponse summary = sessionService.getSummary(testUser.getEmail(), null, null);

        assertEquals(60, summary.getTotalMinutes());
        assertEquals(2, summary.getTotalSessions());
        assertEquals(60, summary.getMinutesPerGoal().get(50L));
    }
}

