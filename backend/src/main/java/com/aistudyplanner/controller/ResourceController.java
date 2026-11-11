package com.aistudyplanner.controller;

import com.aistudyplanner.dto.ResourceCheckRequest;
import com.aistudyplanner.dto.ResourceCheckResult;
import com.aistudyplanner.dto.ResourceWithCheckDto;
import com.aistudyplanner.entity.ResourceLinkCheck;
import com.aistudyplanner.entity.SavedRoadmap;
import com.aistudyplanner.entity.User;
import com.aistudyplanner.repository.ResourceLinkCheckRepository;
import com.aistudyplanner.repository.SavedRoadmapRepository;
import com.aistudyplanner.repository.UserRepository;
import com.aistudyplanner.service.LinkCheckerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final LinkCheckerService linkCheckerService;
    private final SavedRoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final ResourceLinkCheckRepository checkRepository;
    private final ObjectMapper objectMapper;

    public ResourceController(LinkCheckerService linkCheckerService,
                              SavedRoadmapRepository roadmapRepository,
                              UserRepository userRepository,
                              ResourceLinkCheckRepository checkRepository,
                              ObjectMapper objectMapper) {
        this.linkCheckerService = linkCheckerService;
        this.roadmapRepository = roadmapRepository;
        this.userRepository = userRepository;
        this.checkRepository = checkRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/check")
    public ResponseEntity<List<ResourceCheckResult>> checkLinks(@RequestBody ResourceCheckRequest request) {
        List<String> urls = request.getUrls() != null ? request.getUrls() : Collections.emptyList();
        List<ResourceCheckResult> results = linkCheckerService.checkBatch(urls);
        return ResponseEntity.ok(results);
    }

    @GetMapping
    public ResponseEntity<List<ResourceWithCheckDto>> getResources(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<SavedRoadmap> roadmaps = roadmapRepository.findByUserEmailOrderByUpdatedAtDesc(email);
        List<ResourceWithCheckDto> results = new ArrayList<>();
        DateTimeFormatter iso = DateTimeFormatter.ISO_LOCAL_DATE;

        for (SavedRoadmap r : roadmaps) {
            if (r.getRoadmapJson() == null || r.getRoadmapJson().isBlank()) continue;
            try {
                JsonNode root = objectMapper.readTree(r.getRoadmapJson());
                JsonNode resources = root.path("learningResources");
                if (resources.isArray()) {
                    for (JsonNode res : resources) {
                        String title = res.path("title").asText("");
                        String url = res.path("url").asText("");
                        String type = res.path("type").asText("DOCUMENTATION");
                        String relevance = res.path("relevance").asText("");

                        boolean reachable = true;
                        Integer statusCode = 200;
                        String checkedAt = null;

                        if (!url.isBlank()) {
                            String hash = LinkCheckerService.computeSha256(url);
                            Optional<ResourceLinkCheck> check = checkRepository.findByUrlHash(hash);
                            if (check.isPresent()) {
                                reachable = check.get().getReachable();
                                statusCode = check.get().getStatusCode();
                                if (check.get().getCheckedAt() != null) {
                                    checkedAt = check.get().getCheckedAt().format(iso);
                                }
                            }
                        }

                        results.add(new ResourceWithCheckDto(
                                title,
                                url,
                                type,
                                relevance,
                                r.getTopic() != null ? r.getTopic() : r.getTitle(),
                                reachable,
                                statusCode,
                                checkedAt
                        ));
                    }
                }
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(results);
    }
}
