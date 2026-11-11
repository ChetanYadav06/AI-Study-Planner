package com.aistudyplanner.repository;

import com.aistudyplanner.entity.TaskFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskFeedbackRepository extends JpaRepository<TaskFeedback, Long> {

    Optional<TaskFeedback> findByUserIdAndRoadmapIdAndTaskId(Long userId, Long roadmapId, String taskId);

    List<TaskFeedback> findByUserIdAndRoadmapId(Long userId, Long roadmapId);

    List<TaskFeedback> findByUserId(Long userId);

    void deleteByRoadmapId(Long roadmapId);
}

