package com.aistudyplanner.repository;

import com.aistudyplanner.entity.SavedRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedRoadmapRepository extends JpaRepository<SavedRoadmap, Long> {

    @Query("SELECT r FROM SavedRoadmap r WHERE r.user.email = :email ORDER BY r.updatedAt DESC")
    List<SavedRoadmap> findByUserEmailOrderByUpdatedAtDesc(@Param("email") String email);

    @Query("SELECT r FROM SavedRoadmap r WHERE r.id = :id AND r.user.email = :email")
    Optional<SavedRoadmap> findByIdAndUserEmail(@Param("id") Long id, @Param("email") String email);

    @Query("SELECT COUNT(r) FROM SavedRoadmap r WHERE r.user.email = :email")
    long countByUserEmail(@Param("email") String email);

    Optional<SavedRoadmap> findByGoalIdAndUserEmail(Long goalId, String email);

    boolean existsByGoalId(Long goalId);

    Optional<SavedRoadmap> findByGoalId(Long goalId);
}

