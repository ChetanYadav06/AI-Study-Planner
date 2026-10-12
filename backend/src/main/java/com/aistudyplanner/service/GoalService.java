package com.aistudyplanner.service;

import com.aistudyplanner.dto.CreateGoalRequest;
import com.aistudyplanner.dto.DashboardStatsResponse;
import com.aistudyplanner.dto.GoalResponse;
import com.aistudyplanner.dto.UpdateGoalStatusRequest;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    public GoalService(GoalRepository goalRepository, UserRepository userRepository) {
        this.goalRepository = goalRepository;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User account not found."));
    }

    @Transactional
    public GoalResponse createGoal(String userEmail, CreateGoalRequest request) {
        User user = getAuthenticatedUser(userEmail);

        Goal goal = new Goal(
                user,
                request.getTitle().trim(),
                request.getDescription() != null ? request.getDescription().trim() : "",
                request.getTargetDays(),
                request.getHoursPerDay(),
                request.getSkillLevel()
        );

        Goal savedGoal = goalRepository.save(goal);
        return new GoalResponse(savedGoal);
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getUserGoals(String userEmail) {
        User user = getAuthenticatedUser(userEmail);
        return goalRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(GoalResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GoalResponse getGoalById(String userEmail, Long goalId) {
        User user = getAuthenticatedUser(userEmail);
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Learning goal not found."));
        return new GoalResponse(goal);
    }

    @Transactional
    public GoalResponse updateGoalStatus(String userEmail, Long goalId, UpdateGoalStatusRequest request) {
        User user = getAuthenticatedUser(userEmail);
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Learning goal not found."));

        if (request.getStatus() != null) {
            goal.setStatus(request.getStatus());
            if (request.getStatus() == GoalStatus.COMPLETED && goal.getProgressPercentage() < 100) {
                goal.setProgressPercentage(100);
            }
        }

        if (request.getProgressPercentage() != null) {
            goal.setProgressPercentage(request.getProgressPercentage());
            if (request.getProgressPercentage() == 100) {
                goal.setStatus(GoalStatus.COMPLETED);
            } else if (request.getProgressPercentage() > 0 && goal.getStatus() == GoalStatus.NOT_STARTED) {
                goal.setStatus(GoalStatus.IN_PROGRESS);
            }
        }

        Goal updatedGoal = goalRepository.save(goal);
        return new GoalResponse(updatedGoal);
    }

    @Transactional
    public void deleteGoal(String userEmail, Long goalId) {
        User user = getAuthenticatedUser(userEmail);
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Learning goal not found."));
        goalRepository.delete(goal);
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(String userEmail) {
        User user = getAuthenticatedUser(userEmail);
        Long userId = user.getId();

        long totalGoals = goalRepository.countByUserId(userId);
        long inProgressGoals = goalRepository.countByUserIdAndStatus(userId, GoalStatus.IN_PROGRESS);
        long notStartedGoals = goalRepository.countByUserIdAndStatus(userId, GoalStatus.NOT_STARTED);
        long activeGoals = inProgressGoals + notStartedGoals;
        long completedGoals = goalRepository.countByUserIdAndStatus(userId, GoalStatus.COMPLETED);

        Double totalDailyHours = goalRepository.sumDailyHoursByUserId(userId);
        if (totalDailyHours == null) {
            totalDailyHours = 0.0;
        }

        // Default initial streak to 1 if active goals exist, else 0
        int studyStreakDays = activeGoals > 0 || completedGoals > 0 ? 1 : 0;
        int roadmapsGenerated = 0; // Phase 4 will increment this when roadmaps are saved

        return new DashboardStatsResponse(
                totalGoals,
                activeGoals,
                completedGoals,
                Math.round(totalDailyHours * 10.0) / 10.0,
                studyStreakDays,
                roadmapsGenerated
        );
    }
}
