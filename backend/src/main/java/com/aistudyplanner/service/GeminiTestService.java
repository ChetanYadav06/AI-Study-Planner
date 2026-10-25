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
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GeminiTestService {

    private static final Logger log = LoggerFactory.getLogger(GeminiTestService.class);

    // Retry delays for 503 (same model): 1s, 2s
    private static final long BASE_DELAY_MS = 1000L;

    // Confirmed-available active models
    private static final List<String> FALLBACK_MODELS = List.of(
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.8-flash"
    );

    private final RestClient restClient;
    private final String apiKey;
    private final String preferredModel;

    public GeminiTestService(
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.model}") String model) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(35));

        this.restClient      = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
        this.apiKey          = apiKey;
        this.preferredModel  = model;
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
                    "temperature", 0.4
                )
            );
        } else {
            requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(Map.of("text", prompt)))
                )
            );
        }

        // Build model queue: preferred first, then fallbacks (skip duplicates)
        List<String> queue = new ArrayList<>();
        if (preferredModel != null && !preferredModel.isBlank()) {
            queue.add(preferredModel);
        }
        for (String m : FALLBACK_MODELS) {
            if (!queue.contains(m)) queue.add(m);
        }

        Exception lastException = null;

        for (String currentModel : queue) {
            log.info("Trying Gemini model: {} (jsonMode: {})", currentModel, jsonMode);

            // Each model gets up to 2 retries on 503
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
                        throw new IllegalStateException("Gemini returned an empty response");
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
                        throw new IllegalStateException("Gemini returned no text parts");
                    }

                    log.info("Gemini call succeeded with model: {}", currentModel);
                    return text;

                } catch (HttpClientErrorException e) {
                    // 404 = model not found, 400 = invalid argument (e.g. if jsonMode isn't supported on old model)
                    log.warn("Model {} returned {} — trying next model", currentModel, e.getStatusCode());
                    lastException = e;
                    break;

                } catch (HttpServerErrorException e) {
                    // 503 = overloaded — retry same model once with delay, then move on
                    lastException = e;
                    log.warn("Model {} returned {} (attempt {}/2)", currentModel, e.getStatusCode(), attempt);
                    if (attempt < 2) {
                        try { Thread.sleep(BASE_DELAY_MS); }
                        catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException("Interrupted during Gemini retry", ie);
                        }
                    }
                }
            }
        }

        throw new IllegalStateException(
            "All Gemini models failed. Last error: " +
            (lastException != null ? lastException.getMessage() : "unknown")
        );
    }
}
