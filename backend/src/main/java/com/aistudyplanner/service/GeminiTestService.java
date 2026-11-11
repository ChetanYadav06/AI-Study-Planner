package com.aistudyplanner.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class GeminiTestService {

    private static final Logger log = LoggerFactory.getLogger(GeminiTestService.class);

    private static final long BASE_DELAY_MS = 1000L;

    private final RestClient restClient;
    private final String apiKey;
    private final List<String> configuredModels;

    public GeminiTestService(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.models:${gemini.api.model:gemini-3.5-flash-lite,gemini-flash-lite-latest}}") String modelsConfig) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(35));

        this.restClient      = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
        this.apiKey          = apiKey;
        this.configuredModels = Arrays.stream(modelsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public String askGemini(String prompt) {
        return executeGeminiCall(prompt, false);
    }

    public String askGeminiJson(String prompt) {
        return executeGeminiCall(prompt, true);
    }

    private String executeGeminiCall(String prompt, boolean jsonMode) {
        Map<String, Object> requestBody;
        if (jsonMode) {
            requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                    "responseMimeType", "application/json",
                    "temperature", 0.3
                )
            );
        } else {
            requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(Map.of("text", prompt)))
                )
            );
        }

        // Build model queue: at most 3 models from configured models list
        List<String> queue = new ArrayList<>();
        for (String m : configuredModels) {
            if (queue.size() >= 3) break;
            if (!queue.contains(m)) queue.add(m);
        }

        Exception lastException = null;

        for (String currentModel : queue) {
            log.info("Attempting Gemini request with model: {} (jsonMode: {})", currentModel, jsonMode);

            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    JsonNode response = restClient.post()
                        .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                                + currentModel + ":generateContent")
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(JsonNode.class);

                    if (response == null) {
                        throw new IllegalStateException("Gemini returned an empty response body.");
                    }

                    JsonNode parts = response.at("/candidates/0/content/parts");
                    StringBuilder sb = new StringBuilder();
                    if (parts.isArray()) {
                        for (JsonNode part : parts) {
                            if (part.has("text") && !part.get("text").isNull()) {
                                sb.append(part.get("text").asText());
                            }
                        }
                    }

                    String text = sb.toString().trim();
                    if (text.isEmpty()) {
                        throw new IllegalStateException("Gemini returned response without text parts.");
                    }

                    log.info("Gemini generation completed successfully with model: {}", currentModel);
                    return text;

                } catch (HttpClientErrorException.TooManyRequests e) {
                    lastException = e;
                    log.warn("Gemini model {} rate-limited (HTTP 429, attempt {}/2).", currentModel, attempt);
                    if (attempt < 2) {
                        applyBackoff(attempt);
                    }
                } catch (HttpClientErrorException e) {
                    lastException = e;
                    log.warn("Gemini model {} returned client status {} — switching to next model.", currentModel, e.getStatusCode());
                    break;
                } catch (HttpServerErrorException e) {
                    lastException = e;
                    log.warn("Gemini model {} returned server error {} (attempt {}/2).", currentModel, e.getStatusCode(), attempt);
                    if (attempt < 2) {
                        applyBackoff(attempt);
                    }
                } catch (ResourceAccessException e) {
                    lastException = e;
                    log.warn("Gemini network timeout / access error with model {} (attempt {}/2).", currentModel, attempt);
                    if (attempt < 2) {
                        applyBackoff(attempt);
                    }
                }
            }
        }

        String errorSummary = (lastException != null) ? lastException.getClass().getSimpleName() + ": " + lastException.getMessage() : "Unknown";
        log.error("All Gemini model attempts exhausted without success. Last error: {}", errorSummary);
        throw new IllegalStateException("All Gemini models failed. Last error: " + errorSummary);
    }

    private void applyBackoff(int attempt) {
        try {
            long delay = BASE_DELAY_MS * (long) Math.pow(2, attempt - 1);
            Thread.sleep(delay);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted during retry backoff.", ie);
        }
    }
}
