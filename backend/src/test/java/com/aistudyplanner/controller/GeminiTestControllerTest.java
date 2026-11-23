package com.aistudyplanner.controller;

import com.aistudyplanner.service.GeminiTestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
        when(geminiTestService.askGemini(anyString(), anyString()))
                .thenReturn("Hello! I am so excited to help you explore computer science!\n\n" +
                        "Compiler Design is the study of software translators that convert source code into executable code.");

        Map<String, Object> body = Map.of(
                "message", "what is compiler design",
                "topic", "Spring Boot and REST API Development"
        );

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        String reply = response.getBody().get("reply");
        assertTrue(reply.startsWith("Compiler Design is the study of software translators"),
                "Reply should start directly with definition, but was: " + reply);
        assertFalse(reply.contains("Hello!"));
        assertFalse(reply.contains("I am so excited"));

        ArgumentCaptor<String> sysCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> userCaptor = ArgumentCaptor.forClass(String.class);
        verify(geminiTestService).askGemini(sysCaptor.capture(), userCaptor.capture());

        String sysPrompt = sysCaptor.getValue();
        assertTrue(sysPrompt.contains("CRITICAL INSTRUCTION - ZERO CONVERSATIONAL FILLER"));
        assertTrue(sysPrompt.contains("NEVER start with greetings"));
        assertTrue(sysPrompt.contains("NEVER use flattery or emotional filler"));

        String userPrompt = userCaptor.getValue();
        assertTrue(userPrompt.contains("Student Question:\nwhat is compiler design"));
        assertTrue(userPrompt.contains("Reference Context: Spring Boot and REST API Development"));
    }

    @Test
    void testChatWithAssistantIncludesMultiTurnConversationHistory() {
        when(geminiTestService.askGemini(anyString(), anyString()))
                .thenReturn("ArrayList resizes by allocating a new array of 1.5x capacity and copying elements.");

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

        ArgumentCaptor<String> userCaptor = ArgumentCaptor.forClass(String.class);
        verify(geminiTestService).askGemini(anyString(), userCaptor.capture());

        String userPrompt = userCaptor.getValue();
        assertTrue(userPrompt.contains("Recent Conversation History:"));
        assertTrue(userPrompt.contains("Student: What is ArrayList?"));
        assertTrue(userPrompt.contains("Tutor: ArrayList is a resizable array implementation of the List interface."));
        assertTrue(userPrompt.contains("Student Question:\nHow does its resizing work?"));
    }

    @Test
    void testChatWithAssistantQuizRequest() {
        when(geminiTestService.askGemini(anyString(), anyString()))
                .thenReturn("Hello there! Welcome to your quiz session.\n\n" +
                        "### Question 1: Binary Tree Properties\n\nWhat is the maximum number of nodes at depth $k$?");

        Map<String, Object> body = Map.of(
                "message", "Quiz me on Tree Fundamentals. Ask 3 multiple-choice questions.",
                "action", "quiz"
        );

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, body);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        String reply = response.getBody().get("reply");
        assertTrue(reply.startsWith("### Question 1: Binary Tree Properties"));
        assertFalse(reply.contains("Hello there!"));
        assertFalse(reply.contains("Welcome to your quiz"));
    }

    /**
     * Parameterized test covering all 10 required questions from specification:
     * 1. What is Generative AI?
     * 2. What is Compiler Design?
     * 3. Explain DBMS.
     * 4. What is Java?
     * 5. Difference between Stack and Queue.
     * 6. Explain Binary Search.
     * 7. What is Machine Learning?
     * 8. Explain REST API.
     * 9. What is Normalization in DBMS?
     * 10. Explain Operating System.
     */
    @ParameterizedTest
    @CsvSource({
            "'What is Generative AI?', 'Generative AI is a branch of Artificial Intelligence that focuses on generating new content.'",
            "'What is Compiler Design?', 'Compiler Design encompasses the theoretical principles and implementation techniques used to translate programming code.'",
            "'Explain DBMS.', 'A Database Management System (DBMS) is software that facilitates the creation, retrieval, updating, and administration of structured databases.'",
            "'What is Java?', 'Java is a high-level, class-based, object-oriented programming language designed for platform independence.'",
            "'Difference between Stack and Queue.', 'The primary distinction between a Stack and a Queue is their access paradigm: Stack is LIFO, whereas Queue is FIFO.'",
            "'Explain Binary Search.', 'Binary Search is an efficient algorithm for searching an element in a sorted collection with O(log n) time complexity.'",
            "'What is Machine Learning?', 'Machine Learning is a domain of computer science that empowers software algorithms to identify patterns and make predictions from data.'",
            "'Explain REST API.', 'A REST (Representational State Transfer) API is an architectural interface that enables stateless communication using standard HTTP methods.'",
            "'What is Normalization in DBMS?', 'Normalization is the structural database design technique used to minimize data redundancy and prevent update anomalies.'",
            "'Explain Operating System.', 'An Operating System (OS) is core system software that manages computer hardware resources and offers common services for applications.'"
    })
    void testTenRequiredQuestionsAreDirectAndFluffFree(String question, String expectedCleanOpening) {
        // Simulate Gemini returning opening pleasantries + the direct answer
        String mockedRawResponse = "Hello there! Great question! Today, let's break this down into clear concepts so you can master it.\n\n" +
                expectedCleanOpening + "\n\n" +
                "Hope this helps! Let me know if you have any other questions! 🚀";

        when(geminiTestService.askGemini(anyString(), anyString())).thenReturn(mockedRawResponse);

        ResponseEntity<Map<String, String>> response = controller.chatWithAssistant(null, Map.of("message", question));

        assertNotNull(response);
        String reply = response.getBody().get("reply");

        // Verification 1: Starts directly with expected opening
        assertTrue(reply.startsWith(expectedCleanOpening),
                "Expected reply to start with: " + expectedCleanOpening + " but got: " + reply);

        // Verification 2: Zero opening pleasantries
        assertFalse(reply.contains("Hello there!"));
        assertFalse(reply.contains("Great question!"));
        assertFalse(reply.contains("let's break this down"));

        // Verification 3: Zero trailing unsolicited closing fluff
        assertFalse(reply.contains("Hope this helps!"));
        assertFalse(reply.contains("Let me know if you have any other questions!"));
    }
}
