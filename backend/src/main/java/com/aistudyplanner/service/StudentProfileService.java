package com.aistudyplanner.service;

import com.aistudyplanner.dto.StudentProfileRequest;
import com.aistudyplanner.dto.StudentProfileResponse;
import com.aistudyplanner.entity.GoalStatus;
import com.aistudyplanner.entity.StudentProfile;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.StudentProfileRepository;
import com.aistudyplanner.repository.StudentTopicKnowledgeRepository;
import com.aistudyplanner.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Service
public class StudentProfileService {

    private final StudentProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final StudentTopicKnowledgeRepository topicKnowledgeRepository;
    private final GoalRepository goalRepository;

    public StudentProfileService(
            StudentProfileRepository profileRepository,
            UserRepository userRepository,
            StudentTopicKnowledgeRepository topicKnowledgeRepository,
            GoalRepository goalRepository) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.topicKnowledgeRepository = topicKnowledgeRepository;
        this.goalRepository = goalRepository;
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student user account not found."));
    }

    @Transactional
    public StudentProfileResponse getProfile(String email) {
        User user = getAuthenticatedUser(email);
        StudentProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    StudentProfile newProfile = new StudentProfile(user);
                    return profileRepository.save(newProfile);
                });

        return buildResponse(user, profile);
    }

    @Transactional
    public StudentProfileResponse updateProfile(String email, StudentProfileRequest request) {
        User user = getAuthenticatedUser(email);
        StudentProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> new StudentProfile(user));

        if (request.getEducationLevel() != null) {
            profile.setEducationLevel(request.getEducationLevel().trim());
        }
        if (request.getAcademicBackground() != null) {
            profile.setAcademicBackground(request.getAcademicBackground().trim());
        }
        if (request.getCareerGoal() != null) {
            profile.setCareerGoal(request.getCareerGoal().trim());
        }
        if (request.getExperienceLevel() != null) {
            profile.setExperienceLevel(request.getExperienceLevel());
        }
        if (request.getDailyStudyHours() != null) {
            profile.setDailyStudyHours(request.getDailyStudyHours());
        }
        if (request.getAvailableDaysPerWeek() != null) {
            profile.setAvailableDaysPerWeek(request.getAvailableDaysPerWeek());
        }
        if (request.getPreferredStudyTime() != null) {
            profile.setPreferredStudyTime(request.getPreferredStudyTime().trim());
        }
        if (request.getLearningMethods() != null) {
            profile.setLearningMethods(request.getLearningMethods().trim());
        }
        if (request.getExplanationStyle() != null) {
            profile.setExplanationStyle(request.getExplanationStyle().trim());
        }
        if (request.getPracticeStyle() != null) {
            profile.setPracticeStyle(request.getPracticeStyle().trim());
        }
        if (request.getAdditionalContext() != null) {
            profile.setAdditionalContext(request.getAdditionalContext().trim());
        }

        StudentProfile saved = profileRepository.save(profile);
        return buildResponse(user, saved);
    }

    private StudentProfileResponse buildResponse(User user, StudentProfile profile) {
        StudentProfileResponse resp = new StudentProfileResponse();
        resp.setUserId(user.getId());
        resp.setName(user.getName());
        resp.setEmail(user.getEmail());
        resp.setMemberSince(user.getCreatedAt());

        resp.setEducationLevel(profile.getEducationLevel());
        resp.setAcademicBackground(profile.getAcademicBackground());
        resp.setCareerGoal(profile.getCareerGoal());
        resp.setExperienceLevel(profile.getExperienceLevel());
        resp.setDailyStudyHours(profile.getDailyStudyHours());
        resp.setAvailableDaysPerWeek(profile.getAvailableDaysPerWeek());
        resp.setPreferredStudyTime(profile.getPreferredStudyTime());
        resp.setLearningMethods(profile.getLearningMethods());
        resp.setExplanationStyle(profile.getExplanationStyle());
        resp.setPracticeStyle(profile.getPracticeStyle());
        resp.setAdditionalContext(profile.getAdditionalContext());
        resp.setUpdatedAt(profile.getUpdatedAt());

        long skillsCount = topicKnowledgeRepository.countByStudentEmail(user.getEmail());
        resp.setTotalSkills(skillsCount);

        long activeGoals = goalRepository.countByUserIdAndStatus(user.getId(), GoalStatus.IN_PROGRESS)
                + goalRepository.countByUserIdAndStatus(user.getId(), GoalStatus.NOT_STARTED);
        resp.setActiveGoals(activeGoals);

        Map<String, Long> dist = new HashMap<>();
        for (TopicKnowledgeLevel level : TopicKnowledgeLevel.values()) {
            dist.put(level.name(), topicKnowledgeRepository.countByStudentEmailAndLevel(user.getEmail(), level));
        }
        resp.setSkillsDistribution(dist);

        // Calculate dynamic completion percentage based on actual filled fields
        int completion = 10; // baseline for having an account
        if (profile.getCareerGoal() != null && !profile.getCareerGoal().isBlank()) completion += 15;
        if (profile.getEducationLevel() != null && !profile.getEducationLevel().isBlank()) completion += 15;
        if (profile.getAcademicBackground() != null && !profile.getAcademicBackground().isBlank()) completion += 10;
        if (profile.getExperienceLevel() != null) completion += 10;
        if (profile.getDailyStudyHours() != null && profile.getDailyStudyHours() > 0) completion += 10;
        if (profile.getLearningMethods() != null && !profile.getLearningMethods().isBlank()) completion += 10;
        if (profile.getAdditionalContext() != null && !profile.getAdditionalContext().isBlank()) completion += 10;
        if (skillsCount > 0) completion += 10;

        resp.setCompletionPercentage(Math.min(100, completion));
        return resp;
    }
}

