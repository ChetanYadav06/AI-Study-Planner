package com.aistudyplanner.controller;

import com.aistudyplanner.service.GeminiTestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeminiTestControllerTest {

    private GeminiTestService geminiTestService;
    private GeminiTestController controller;

    @BeforeEach
    void setUp() {
        geminiTestService = mock(GeminiTestService.class);
        controller = new GeminiTestController(geminiTestService);
    }

    @Test
    void testChatWithAssistantDirectAnswerAndNoGreetings() {
        when(geminiTestService.askGemini(anyString())).thenReturn("A compiler translates source code into machine code.");

        Map<String, Object> body = Map.of(
                "message", "what is compiler design",
                "topic", "Spring Boot and REST API Development"
        );

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("A compiler translates source code into machine code.", response.getBody().get("reply"));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(geminiTestService).askGemini(captor.capture());

        String promptSent = captor.getValue();
        // Verify prompt rules
        assertTrue(promptSent.contains("ZERO GREETINGS & ZERO INTRODUCTIONS"));
        assertTrue(promptSent.contains("NEVER start with greetings, pleasantries, or conversational filler"));
        assertTrue(promptSent.contains("Start immediately with the direct answer"));
        assertTrue(promptSent.contains("DO NOT make forced, artificial references or irrelevant connections"));
        assertTrue(promptSent.contains("what is compiler design"));
        // Topic should be strictly reference, not forced
        assertTrue(promptSent.contains("Reference Curriculum Context: Spring Boot and REST API Development"));
    }

    @Test
    void testChatWithAssistantIncludesMultiTurnConversationHistory() {
        when(geminiTestService.askGemini(anyString())).thenReturn("In Java, ArrayList is backed by an array.");

        Map<String, Object> body = Map.of(
                "message", "How does its resizing work?",
                "history", List.of(
                        Map.of("role", "user", "content", "What is ArrayList?"),
                        Map.of("role", "assistant", "content", "ArrayList is a resizable array implementation of the List interface.")
                )
        );

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(geminiTestService).askGemini(captor.capture());

        String promptSent = captor.getValue();
        assertTrue(promptSent.contains("Recent Conversation Context:"));
        assertTrue(promptSent.contains("Student: What is ArrayList?"));
        assertTrue(promptSent.contains("Tutor: ArrayList is a resizable array implementation of the List interface."));
        assertTrue(promptSent.contains("Current Student Question:\nHow does its resizing work?"));
    }

    @Test
    void testChatWithAssistantQuizRequest() {
        when(geminiTestService.askGemini(anyString())).thenReturn("### Question 1: Binary Tree Properties\n\nWhat is the maximum number of nodes at depth $k$?");

        Map<String, Object> body = Map.of(
                "message", "Quiz me on Tree Fundamentals. Ask 3 multiple-choice questions.",
                "action", "quiz"
        );

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(geminiTestService).askGemini(captor.capture());

        String promptSent = captor.getValue();
        assertTrue(promptSent.contains("Requested Pedagogical Mode: quiz"));
        assertTrue(promptSent.contains("Quiz / Test Request: Start immediately with the quiz questions"));
    }
}
