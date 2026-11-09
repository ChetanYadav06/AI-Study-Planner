package com.aistudyplanner.controller;

import com.aistudyplanner.dto.CreateSessionRequest;
import com.aistudyplanner.dto.StudySessionResponse;
import com.aistudyplanner.dto.StudySessionSummaryResponse;
import com.aistudyplanner.service.StudySessionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class StudySessionController {

    private final StudySessionService sessionService;

    public StudySessionController(StudySessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<StudySessionResponse> createSession(
            Authentication authentication,
            @Valid @RequestBody CreateSessionRequest request) {
        StudySessionResponse response = sessionService.createSession(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<StudySessionResponse>> getSessions(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        List<StudySessionResponse> sessions = sessionService.getSessions(authentication.getName(), from, to);
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/summary")
    public ResponseEntity<StudySessionSummaryResponse> getSummary(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        StudySessionSummaryResponse summary = sessionService.getSummary(authentication.getName(), from, to);
        return ResponseEntity.ok(summary);
    }
}

