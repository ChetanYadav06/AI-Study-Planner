package com.aistudyplanner.service;

import com.aistudyplanner.dto.TopicKnowledgeRequest;
import com.aistudyplanner.dto.TopicKnowledgeResponse;
import com.aistudyplanner.entity.StudentTopicKnowledge;
import com.aistudyplanner.entity.TopicKnowledgeLevel;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.StudentTopicKnowledgeRepository;
import com.aistudyplanner.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TopicKnowledgeService {

    private final StudentTopicKnowledgeRepository repository;
    private final UserRepository userRepository;

    public TopicKnowledgeService(StudentTopicKnowledgeRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student user account not found."));
    }

    @Transactional(readOnly = true)
    public List<TopicKnowledgeResponse> getSkills(String email, String search) {
        List<StudentTopicKnowledge> list;
        if (search != null && !search.trim().isEmpty()) {
            list = repository.searchByStudentEmailAndTopic(email, search.trim());
        } else {
            list = repository.findByStudentEmail(email);
        }
        return list.stream().map(TopicKnowledgeResponse::new).collect(Collectors.toList());
    }

    @Transactional
    public TopicKnowledgeResponse upsertSkill(String email, TopicKnowledgeRequest request) {
        User user = getAuthenticatedUser(email);
        String topicName = request.getTopicName().trim();

        // Check if user already has this topic (case-insensitive)
        Optional<StudentTopicKnowledge> existing = repository.findByStudentIdAndTopicNameIgnoreCase(user.getId(), topicName);
        StudentTopicKnowledge entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setKnowledgeLevel(request.getKnowledgeLevel());
        } else {
            entity = new StudentTopicKnowledge(user, topicName, request.getKnowledgeLevel());
        }

        StudentTopicKnowledge saved = repository.save(entity);
        return new TopicKnowledgeResponse(saved);
    }

    @Transactional
    public List<TopicKnowledgeResponse> bulkUpsertSkills(String email, List<TopicKnowledgeRequest> requests) {
        User user = getAuthenticatedUser(email);
        List<TopicKnowledgeResponse> responses = new ArrayList<>();

        for (TopicKnowledgeRequest req : requests) {
            if (req.getTopicName() == null || req.getTopicName().isBlank() || req.getKnowledgeLevel() == null) {
                continue;
            }
            String topicName = req.getTopicName().trim();
            Optional<StudentTopicKnowledge> existing = repository.findByStudentIdAndTopicNameIgnoreCase(user.getId(), topicName);
            StudentTopicKnowledge entity;
            if (existing.isPresent()) {
                entity = existing.get();
                entity.setKnowledgeLevel(req.getKnowledgeLevel());
            } else {
                entity = new StudentTopicKnowledge(user, topicName, req.getKnowledgeLevel());
            }
            StudentTopicKnowledge saved = repository.save(entity);
            responses.add(new TopicKnowledgeResponse(saved));
        }

        return responses;
    }

    @Transactional
    public TopicKnowledgeResponse updateSkillLevel(String email, Long id, TopicKnowledgeLevel level) {
        StudentTopicKnowledge entity = repository.findByIdAndStudentEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill topic not found."));

        entity.setKnowledgeLevel(level);
        StudentTopicKnowledge saved = repository.save(entity);
        return new TopicKnowledgeResponse(saved);
    }

    @Transactional
    public void deleteSkill(String email, Long id) {
        StudentTopicKnowledge entity = repository.findByIdAndStudentEmail(id, email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill topic not found."));
        repository.delete(entity);
    }
}

