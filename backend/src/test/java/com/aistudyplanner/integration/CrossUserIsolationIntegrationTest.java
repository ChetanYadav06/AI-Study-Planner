package com.aistudyplanner.integration;

import com.aistudyplanner.dto.CreateGoalRequest;
import com.aistudyplanner.dto.GoalResponse;
import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.SkillLevel;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.GoalRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.aistudyplanner.security.JwtUtil;
import com.aistudyplanner.service.GoalService;
import com.aistudyplanner.service.SavedRoadmapService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class CrossUserIsolationIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private SavedRoadmapRepository savedRoadmapRepository;

    @Autowired
    private GoalService goalService;

    @Autowired
    private SavedRoadmapService savedRoadmapService;

    @Autowired
    private JwtUtil jwtUtil;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        alice = userRepository.save(new User("Alice", "alice_iso@test.com", "passhash123"));
        bob = userRepository.save(new User("Bob", "bob_iso@test.com", "passhash123"));
    }

    @Test
    void testAliceCannotAccessOrMutateBobsGoal() {
        // Create a goal for Bob
        CreateGoalRequest bobGoalReq = new CreateGoalRequest("Bob Private Study", "Desc", 30, 2.0, SkillLevel.INTERMEDIATE);
        GoalResponse bobGoal = goalService.createGoal(bob.getEmail(), bobGoalReq);

        // Alice attempts to get Bob's goal
        assertThrows(ResponseStatusException.class, () -> goalService.getGoalById(alice.getEmail(), bobGoal.getId()));

        // Alice attempts to delete Bob's goal
        assertThrows(ResponseStatusException.class, () -> goalService.deleteGoal(alice.getEmail(), bobGoal.getId()));

        // Confirm Bob's goal is still intact
        Goal intact = goalRepository.findById(bobGoal.getId()).orElse(null);
        assertNotNull(intact);
        assertEquals(bob.getId(), intact.getUser().getId());
    }

    @Test
    void testAliceCannotAccessOrDeleteBobsRoadmap() {
        // Create a roadmap owned by Bob
        SavedRoadmap bobRoadmap = new SavedRoadmap();
        bobRoadmap.setUser(bob);
        bobRoadmap.setTitle("Bob Roadmap");
        bobRoadmap.setTopic("Bob Topic");
        bobRoadmap.setTargetDays(30);
        bobRoadmap.setHoursPerDay(2.0);
        bobRoadmap.setSkillLevel(SkillLevel.INTERMEDIATE);
        bobRoadmap.setRoadmapJson("{\"phases\":[]}");
        bobRoadmap = savedRoadmapRepository.save(bobRoadmap);

        Long bobRoadmapId = bobRoadmap.getId();

        // Alice attempts to delete Bob's roadmap
        assertThrows(ResponseStatusException.class, () -> savedRoadmapService.deleteSavedRoadmap(alice.getEmail(), bobRoadmapId));

        // Confirm Bob's roadmap is still present
        assertTrue(savedRoadmapRepository.findById(bobRoadmapId).isPresent());
    }
}
