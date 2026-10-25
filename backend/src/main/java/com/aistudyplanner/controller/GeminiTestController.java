
package com.aistudyplanner.controller;

import com.aistudyplanner.service.GeminiTestService;
import org.springframework.web.bind.annotation.GetMapping;
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
}
