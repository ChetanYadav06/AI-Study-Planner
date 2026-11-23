
package com.aistudyplanner.controller;

import com.aistudyplanner.service.GeminiTestService;
import com.aistudyplanner.util.TutorResponseSanitizer;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

        StringBuilder sysInstruction = new StringBuilder();
        sysInstruction.append("You are an expert Academic AI Study Tutor.\n");
        sysInstruction.append("Your highest priority is to provide direct, academic, technically accurate, and beginner-friendly answers.\n\n");
        sysInstruction.append("CRITICAL INSTRUCTION - ZERO CONVERSATIONAL FILLER:\n");
        sysInstruction.append("- The VERY FIRST LINE of your response MUST contain direct educational content answering the question.\n");
        sysInstruction.append("- NEVER start with greetings, pleasantries, or welcomes (e.g., 'Hello', 'Hi', 'Welcome', 'Hey').\n");
        sysInstruction.append("- NEVER use flattery or emotional filler (e.g., 'Great question!', 'I love this question!', 'I am excited to help you').\n");
        sysInstruction.append("- NEVER state preambles or agendas (e.g., 'Let's break this down', 'Today we are exploring', 'In this lesson', 'As your AI Study Tutor', 'Grab a piece of paper').\n");
        sysInstruction.append("- NEVER make artificial or forced connections to the student's background or unrelated enrolled topics.\n");
        sysInstruction.append("- NEVER add closing pleasantries or unsolicited offers for more help (e.g., 'Hope this helps!', 'Let me know if you need more help').\n\n");
        sysInstruction.append("ADAPTIVE STRUCTURE:\n");
        sysInstruction.append("- Definitions / What is X: Start immediately with: '[X] is a [definition] that [purpose]...'\n");
        sysInstruction.append("- Conceptual Questions: Start immediately with the core concept and its mechanics using clear bullet points.\n");
        sysInstruction.append("- Programming Questions: Start with algorithmic logic, then working code block, then complexity ($O(...)$).\n");
        sysInstruction.append("- Comparison Questions: Start with primary distinction, then Markdown comparison table (| Feature | A | B |).\n");
        sysInstruction.append("- Interview / Exam Questions: High-yield punchy answer first, followed by key technical mechanics and gotchas.\n");
        sysInstruction.append("- Quizzes: Start immediately with '### Question 1: [Topic]'. Format options clearly as A), B), C), D).\n\n");
        sysInstruction.append("FORMATTING:\n");
        sysInstruction.append("- Use Markdown headings (##, ###), bullet points, and syntax-highlighted code blocks (```java, ```sql, etc.).\n");
        sysInstruction.append("- Use mathematical notation ($O(1)$, formulas) where applicable.");

        StringBuilder userPrompt = new StringBuilder();
        if (topic != null && !topic.isBlank()) {
            userPrompt.append("Reference Context: ").append(topic.trim())
                      .append(" (Only use if directly relevant to inquiry; do not force mention of it).\n");
        }
        if (action != null && !action.isBlank()) {
            userPrompt.append("Pedagogical Mode: ").append(action.trim()).append("\n");
        }

        // Conversation history handling
        Object historyObj = body.get("history");
        if (historyObj instanceof java.util.List<?> list && !list.isEmpty()) {
            userPrompt.append("\nRecent Conversation History:\n");
            int start = Math.max(0, list.size() - 6);
            for (int i = start; i < list.size(); i++) {
                Object item = list.get(i);
                if (item instanceof Map<?, ?> turn) {
                    Object role = turn.get("role");
                    Object content = turn.get("content");
                    if (content != null && !content.toString().isBlank()) {
                        String roleStr = "assistant".equalsIgnoreCase(String.valueOf(role)) ? "Tutor" : "Student";
                        userPrompt.append(roleStr).append(": ").append(content.toString().trim()).append("\n");
                    }
                }
            }
            userPrompt.append("\n");
        }

        userPrompt.append("\nStudent Question:\n").append(message != null ? message.trim() : "Help me understand this topic.");
        userPrompt.append("\n\n(Important: Start directly with the answer on line 1. No greetings, introductions, or conversational filler.)");

        String rawReply = geminiTestService.askGemini(sysInstruction.toString(), userPrompt.toString());
        String cleanReply = TutorResponseSanitizer.sanitize(rawReply);

        return ResponseEntity.ok(Map.of("reply", cleanReply));
    }
}


