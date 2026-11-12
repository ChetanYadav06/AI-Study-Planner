package com.aistudyplanner.repository;

import com.aistudyplanner.entity.TopicExpansion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicExpansionRepository extends JpaRepository<TopicExpansion, Long> {

    Optional<TopicExpansion> findByRoadmapIdAndDayNumberAndTopicTitleAndLevel(Long roadmapId, int dayNumber, String topicTitle, int level);

    List<TopicExpansion> findByRoadmapIdAndDayNumber(Long roadmapId, int dayNumber);

    List<TopicExpansion> findByRoadmapIdAndDayNumberAndTopicTitle(Long roadmapId, int dayNumber, String topicTitle);

    void deleteByRoadmapIdAndDayNumberAndTopicTitleAndLevel(Long roadmapId, int dayNumber, String topicTitle, int level);

    void deleteByRoadmapIdAndDayNumberAndTopicTitle(Long roadmapId, int dayNumber, String topicTitle);

    void deleteByRoadmapId(Long roadmapId);
}
