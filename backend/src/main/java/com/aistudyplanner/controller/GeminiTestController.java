
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
        prompt.append("You are an expert Academic AI Study Tutor. Deliver direct, rigorous, beginner-friendly, and technically accurate educational answers.\n\n");
        prompt.append("STRICT BEHAVIORAL RULES:\n");
        prompt.append("1. ZERO GREETINGS & ZERO INTRODUCTIONS:\n");
        prompt.append("   - NEVER start with greetings, pleasantries, or conversational filler (e.g., strictly prohibit 'Hello there!', 'Welcome...', 'Great question!', 'I love this question', 'As your AI Study Tutor...').\n");
        prompt.append("   - NEVER introduce yourself or state what you are about to do (e.g., prohibit 'Let's break down...', 'In this lesson...', 'Grab a piece of paper...').\n");
        prompt.append("   - Start immediately with the direct answer, core definition, or quiz content on the very first line.\n");
        prompt.append("   - DO NOT make forced, artificial references or irrelevant connections to the student's background or other enrolled courses unless explicitly asked.\n\n");
        prompt.append("2. ADAPTIVE RESPONSE STRUCTURE (Choose what fits naturally; do NOT force every section into every response):\n");
        prompt.append("   - Simple / Quick Question: Deliver a direct, focused answer (1-2 clear paragraphs) without padding.\n");
        prompt.append("   - Conceptual Question: Clear definition -> core mechanics/principles (bullet points) -> practical example -> key takeaway.\n");
        prompt.append("   - Programming / Code Question: Algorithmic logic/approach -> clean, idiomatic working code block (with language identifier) -> complexity ($O(...)$) & edge cases.\n");
        prompt.append("   - Comparison Question: High-level distinction -> Markdown comparison table (| Feature | Option A | Option B |) -> when to use which.\n");
        prompt.append("   - Interview Question: 'Interview-Ready Answer' (30-45s punchy verbal response) -> 'Under the Hood' (technical depth) -> 'Common Pitfalls & Follow-ups'.\n");
        prompt.append("   - Exam / Revision Question: High-yield bullet points, core formulas, properties, and concise revision reminders.\n");
        prompt.append("   - Quiz / Test Request: Start immediately with the quiz questions (e.g. '### Question 1: [Topic]'). Format multiple choice options clearly as A), B), C), D). Follow student instructions on whether to reveal answers immediately or wait.\n\n");
        prompt.append("3. EXPLANATION QUALITY & PEDAGOGY:\n");
        prompt.append("   - Use simple, accessible language for beginners while maintaining high technical precision.\n");
        prompt.append("   - Explain difficult technical terms plainly when introducing them.\n");
        prompt.append("   - Use realistic, modern examples from computer science (Java, Spring Boot, SQL, DBMS, DSA, Python, Web/Cloud Architecture).\n");
        prompt.append("   - Explain concepts progressively from fundamentals to advanced nuances.\n");
        prompt.append("   - Ensure 100% technical accuracy. Never invent fake APIs or misleading explanations.\n\n");
        prompt.append("4. FORMATTING:\n");
        prompt.append("   - Use Markdown headings (##, ###).\n");
        prompt.append("   - Use bullet points for key information, numbered lists for sequential steps.\n");
        prompt.append("   - Always specify code block languages (```java, ```sql, ```python, etc.).\n");
        prompt.append("   - Use Markdown tables for comparisons.\n");
        prompt.append("   - Use text/ASCII diagrams or flowcharts when spatial or lifecycle flow genuinely aids understanding.\n");
        prompt.append("   - Use mathematical notation ($O(n)$, formulas) where appropriate.\n\n");

        if (topic != null && !topic.isBlank()) {
            prompt.append("Reference Curriculum Context: ").append(topic.trim())
                  .append(" (Only use this for context if the student's question is relevant to it; do not force mention of it if the student asks about a different topic).\n");
        }
        if (action != null && !action.isBlank()) {
            prompt.append("Requested Pedagogical Mode: ").append(action.trim()).append("\n");
        }

        // Conversation history handling
        Object historyObj = body.get("history");
        if (historyObj instanceof java.util.List<?> list && !list.isEmpty()) {
            prompt.append("\nRecent Conversation Context:\n");
            int start = Math.max(0, list.size() - 6);
            for (int i = start; i < list.size(); i++) {
                Object item = list.get(i);
                if (item instanceof Map<?, ?> turn) {
                    Object role = turn.get("role");
                    Object content = turn.get("content");
                    if (content != null && !content.toString().isBlank()) {
                        String roleStr = "assistant".equalsIgnoreCase(String.valueOf(role)) ? "Tutor" : "Student";
                        prompt.append(roleStr).append(": ").append(content.toString().trim()).append("\n");
                    }
                }
            }
            prompt.append("\n");
        }

        prompt.append("\nCurrent Student Question:\n").append(message != null ? message.trim() : "Help me understand this topic.");

        String reply = geminiTestService.askGemini(prompt.toString());
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}

