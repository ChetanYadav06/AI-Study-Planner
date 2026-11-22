package com.aistudyplanner.controller;

import com.aistudyplanner.dto.ExtractedDocumentDto;
import com.aistudyplanner.service.DocumentTextExtractorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/notes")
public class DocumentNoteController {

    private final DocumentTextExtractorService extractorService;

    public DocumentNoteController(DocumentTextExtractorService extractorService) {
        this.extractorService = extractorService;
    }

    /**
     * POST /api/notes/extract
     * Accepts PDF, PPT, PPTX, DOC, DOCX, TXT, MD up to 15 MB and extracts clean readable text.
     */
    @PostMapping(value = "/extract", consumes = "multipart/form-data")
    public ResponseEntity<ExtractedDocumentDto> extractDocument(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required and cannot be empty.");
        }

        if (file.getSize() > DocumentTextExtractorService.MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size exceeds 15 MB limit.");
        }

        try {
            ExtractedDocumentDto result = extractorService.extractText(file);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process document: " + e.getMessage());
        }
    }
}
