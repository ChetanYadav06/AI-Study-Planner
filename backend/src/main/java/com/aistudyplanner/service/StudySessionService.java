package com.aistudyplanner.service;

import com.aistudyplanner.dto.CreateSessionRequest;
import com.aistudyplanner.dto.StudySessionResponse;
import com.aistudyplanner.dto.StudySessionSummaryResponse;
import com.aistudyplanner.entity.StudySession;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.StudySessionRepository;
import com.aistudyplanner.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudySessionService {

    private final StudySessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;
    private final SavedRoadmapRepository roadmapRepository;

    public StudySessionService(StudySessionRepository sessionRepository,
                               UserRepository userRepository,
                               GoalRepository goalRepository,
                               SavedRoadmapRepository roadmapRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.goalRepository = goalRepository;
        this.roadmapRepository = roadmapRepository;
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }

    @Transactional
    public StudySessionResponse createSession(String userEmail, CreateSessionRequest request) {
        User user = getAuthenticatedUser(userEmail);

        if (request.getStartedAt() == null || request.getEndedAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startedAt and endedAt must not be null.");
        }

        if (!request.getEndedAt().isAfter(request.getStartedAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endedAt must be strictly after startedAt.");
        }

        int duration = request.getDurationSeconds() != null ? request.getDurationSeconds() : 0;
        if (duration < 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session duration must be at least 60 seconds (1 minute).");
        }

        if (duration > 14400) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session duration cannot exceed 4 hours (14400 seconds).");
        }

        // Ownership validation: goalId
        if (request.getGoalId() != null) {
            boolean goalBelongsToUser = goalRepository.findByIdAndUserId(request.getGoalId(), user.getId()).isPresent();
            if (!goalBelongsToUser) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Goal does not belong to authenticated user.");
            }
        }

        // Ownership validation: roadmapId
        if (request.getRoadmapId() != null) {
            boolean roadmapBelongsToUser = roadmapRepository.findByIdAndUserEmail(request.getRoadmapId(), userEmail).isPresent();
            if (!roadmapBelongsToUser) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Roadmap does not belong to authenticated user.");
            }
        }

        StudySession session = new StudySession(
                user,
                request.getGoalId(),
                request.getRoadmapId(),
                request.getTaskId(),
                request.getStartedAt(),
                request.getEndedAt(),
                duration,
                request.getSessionType(),
                request.getCompleted()
        );

        StudySession saved = sessionRepository.save(session);
        return new StudySessionResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<StudySessionResponse> getSessions(String userEmail, LocalDateTime from, LocalDateTime to) {
        User user = getAuthenticatedUser(userEmail);
        List<StudySession> sessions;

        if (from != null && to != null) {
            sessions = sessionRepository.findByUserIdAndDateRange(user.getId(), from, to);
        } else {
            sessions = sessionRepository.findByUserIdOrderByStartedAtDesc(user.getId());
        }

        return sessions.stream().map(StudySessionResponse::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudySessionSummaryResponse getSummary(String userEmail, LocalDateTime from, LocalDateTime to) {
        List<StudySessionResponse> sessions = getSessions(userEmail, from, to);

        long totalMinutes = 0;
        Map<String, Long> minutesPerDay = new TreeMap<>();
        Map<Long, Long> minutesPerGoal = new HashMap<>();

        for (StudySessionResponse s : sessions) {
            long mins = Math.round(s.getDurationSeconds() / 60.0);
            totalMinutes += mins;

            LocalDate day = s.getStartedAt().toLocalDate();
            String dayKey = day.toString();
            minutesPerDay.put(dayKey, minutesPerDay.getOrDefault(dayKey, 0L) + mins);

            if (s.getGoalId() != null) {
                minutesPerGoal.put(s.getGoalId(), minutesPerGoal.getOrDefault(s.getGoalId(), 0L) + mins);
            }
        }

        return new StudySessionSummaryResponse(totalMinutes, sessions.size(), minutesPerDay, minutesPerGoal);
    }
}

