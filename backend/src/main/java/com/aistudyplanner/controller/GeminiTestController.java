
package com.aistudyplanner.controller;

import com.aistudyplanner.service.GeminiTestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class GeminiTestController {

    private final GeminiTestService geminiTestService;

    public GeminiTestController(GeminiTestService geminiTestService) {
        this.geminiTestService = geminiTestService;
    }

    @GetMapping("/test")
    public Map<String, String> testGemini() {
        String answer = geminiTestService.askGemini(
            "Explain what an array is in Java in 3 simple sentences."
        );

        return Map.of("answer", answer);
    }

    /**
     * POST /api/ai/assistant/chat
     * Powers the real-time AI Study Assistant chatbot with Gemini AI.
     */
    @PostMapping("/assistant/chat")
    public ResponseEntity<Map<String, String>> chatWithAssistant(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        String message = (String) body.get("message");
        String topic = (String) body.get("topic");
        String action = (String) body.get("action");

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert, encouraging AI Study Tutor on the AI Study Planner platform. ");
        prompt.append("Provide clear, structured, well-formatted educational responses in Markdown with code blocks, bullet points, and practical examples.\n\n");

        if (topic != null && !topic.isBlank()) {
            prompt.append("Active Curriculum Topic: ").append(topic.trim()).append("\n");
        }
        if (action != null && !action.isBlank()) {
            prompt.append("Requested Pedagogical Mode: ").append(action.trim()).append("\n");
        }
        prompt.append("\nStudent Question:\n").append(message != null ? message.trim() : "Help me understand this topic.");

        String reply = geminiTestService.askGemini(prompt.toString());
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}

