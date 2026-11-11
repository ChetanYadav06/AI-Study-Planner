package com.aistudyplanner.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiTestServiceTest {

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        objectMapper = new ObjectMapper();
    }

    private String createSuccessResponse(String text) {
        try {
            return objectMapper.writeValueAsString(
                java.util.Map.of("candidates", java.util.List.of(
                    java.util.Map.of("content", java.util.Map.of(
                        "parts", java.util.List.of(java.util.Map.of("text", text))
                    ))
                ))
            );
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testConfiguredModelsParsingAndDeduplication() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite, gemini-2.5-flash, gemini-flash-lite-latest, gemini-3.5-flash-lite",
                restClientBuilder.build()
        );

        List<String> models = service.getConfiguredModels();
        assertEquals(4, models.size());
        assertEquals("gemini-3.5-flash-lite", models.get(0));
        assertEquals("gemini-2.5-flash", models.get(1));
        assertEquals("gemini-flash-lite-latest", models.get(2));
        assertEquals("gemini-3.5-flash-lite", models.get(3));
    }

    @Test
    void testPrimaryModelSucceedsOnFirstAttempt() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite,gemini-2.5-flash,gemini-flash-lite-latest",
                restClientBuilder.build()
        );

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "test-api-key"))
                .andRespond(withSuccess(createSuccessResponse("Primary answer"), MediaType.APPLICATION_JSON));

        String answer = service.askGemini("Hello");
        assertEquals("Primary answer", answer);
        mockServer.verify();
    }

    @Test
    void testFallbackToSecondModelWhenPrimaryFailsWithClientError() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite,gemini-2.5-flash,gemini-flash-lite-latest",
                restClientBuilder.build()
        );

        // Model 1 returns 404 (Not Found) -> falls back to model 2
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        // Model 2 succeeds
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(createSuccessResponse("Second model answer"), MediaType.APPLICATION_JSON));

        String answer = service.askGemini("Explain recursion");
        assertEquals("Second model answer", answer);
        mockServer.verify();
    }

    @Test
    void testFallbackToThirdModelWhenFirstTwoFail() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite,gemini-2.5-flash,gemini-flash-lite-latest",
                restClientBuilder.build()
        );

        // Model 1: 400 Bad Request
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        // Model 2: 404 Not Found
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        // Model 3: 200 OK
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(createSuccessResponse("Third model answer"), MediaType.APPLICATION_JSON));

        String answer = service.askGemini("Generate study guide");
        assertEquals("Third model answer", answer);
        mockServer.verify();
    }

    @Test
    void testExhaustionThrowsExceptionWhenAllModelsFail() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite,gemini-2.5-flash,gemini-flash-lite-latest",
                restClientBuilder.build()
        );

        // Model 1: 400
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        // Model 2: 404
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        // Model 3: 500 (attempts twice)
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> service.askGemini("Test fail"));
        assertTrue(ex.getMessage().contains("All Gemini models failed"));
        mockServer.verify();
    }

    @Test
    void testJsonModeSendsGenerationConfig() {
        GeminiTestService service = new GeminiTestService(
                "test-api-key",
                "gemini-3.5-flash-lite",
                restClientBuilder.build()
        );

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("application/json")))
                .andRespond(withSuccess(createSuccessResponse("{\"topic\":\"Spring Boot\"}"), MediaType.APPLICATION_JSON));

        String json = service.askGeminiJson("Give me json");
        assertEquals("{\"topic\":\"Spring Boot\"}", json);
        mockServer.verify();
    }
}

