package com.aistudyplanner.repository;

import com.aistudyplanner.entity.Goal;
import com.aistudyplanner.entity.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Goal> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, GoalStatus status);

    @Query("SELECT COALESCE(SUM(g.hoursPerDay), 0.0) FROM Goal g WHERE g.user.id = :userId AND g.status <> 'COMPLETED' AND g.status <> 'ARCHIVED'")
    Double sumDailyHoursByUserId(@Param("userId") Long userId);
}
