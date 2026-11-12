package com.aistudyplanner.repository;

import com.aistudyplanner.entity.DayExtraTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DayExtraTopicRepository extends JpaRepository<DayExtraTopic, Long> {

    List<DayExtraTopic> findByRoadmapIdAndDayNumber(Long roadmapId, int dayNumber);

    Optional<DayExtraTopic> findByIdAndRoadmapId(Long id, Long roadmapId);

    void deleteByRoadmapIdAndId(Long roadmapId, Long id);

    void deleteByRoadmapId(Long roadmapId);
}
