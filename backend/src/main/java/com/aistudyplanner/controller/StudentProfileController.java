package com.aistudyplanner.controller;

import com.aistudyplanner.dto.StudentProfileRequest;
import com.aistudyplanner.dto.StudentProfileResponse;
import com.aistudyplanner.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class StudentProfileController {

    private final StudentProfileService profileService;

    public StudentProfileController(StudentProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<StudentProfileResponse> getStudentProfile(Authentication authentication) {
        StudentProfileResponse profile = profileService.getProfile(authentication.getName());
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    public ResponseEntity<StudentProfileResponse> updateStudentProfile(
            Authentication authentication,
            @Valid @RequestBody StudentProfileRequest request) {
        StudentProfileResponse updated = profileService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(updated);
    }
}

