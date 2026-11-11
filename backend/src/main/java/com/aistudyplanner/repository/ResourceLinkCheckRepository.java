package com.aistudyplanner.repository;

import com.aistudyplanner.entity.ResourceLinkCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResourceLinkCheckRepository extends JpaRepository<ResourceLinkCheck, Long> {
    Optional<ResourceLinkCheck> findByUrlHash(String urlHash);
}

