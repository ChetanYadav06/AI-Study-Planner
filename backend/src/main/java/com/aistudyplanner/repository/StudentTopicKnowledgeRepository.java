package com.aistudyplanner.repository;

import com.aistudyplanner.entity.StudentTopicKnowledge;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTopicKnowledgeRepository extends JpaRepository<StudentTopicKnowledge, Long> {

    @Query("SELECT k FROM StudentTopicKnowledge k WHERE k.student.email = :email ORDER BY k.topicName ASC")
    List<StudentTopicKnowledge> findByStudentEmail(@Param("email") String email);

    @Query("SELECT k FROM StudentTopicKnowledge k WHERE k.student.email = :email AND LOWER(k.topicName) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY k.topicName ASC")
    List<StudentTopicKnowledge> searchByStudentEmailAndTopic(@Param("email") String email, @Param("search") String search);

    @Query("SELECT k FROM StudentTopicKnowledge k WHERE k.student.id = :studentId AND LOWER(k.topicName) = LOWER(:topicName)")
    Optional<StudentTopicKnowledge> findByStudentIdAndTopicNameIgnoreCase(@Param("studentId") Long studentId, @Param("topicName") String topicName);

    @Query("SELECT k FROM StudentTopicKnowledge k WHERE k.id = :id AND k.student.email = :email")
    Optional<StudentTopicKnowledge> findByIdAndStudentEmail(@Param("id") Long id, @Param("email") String email);

    @Query("SELECT COUNT(k) FROM StudentTopicKnowledge k WHERE k.student.email = :email")
    long countByStudentEmail(@Param("email") String email);

    @Query("SELECT COUNT(k) FROM StudentTopicKnowledge k WHERE k.student.email = :email AND k.knowledgeLevel = :level")
    long countByStudentEmailAndLevel(@Param("email") String email, @Param("level") TopicKnowledgeLevel level);
}

