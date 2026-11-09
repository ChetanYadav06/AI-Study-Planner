package com.aistudyplanner.repository;

import com.aistudyplanner.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    Optional<StudentProfile> findByUserId(Long userId);

    @Query("SELECT p FROM StudentProfile p JOIN FETCH p.user u WHERE u.email = :email")
    Optional<StudentProfile> findByUserEmail(@Param("email") String email);

    boolean existsByUserId(Long userId);
}

