package com.aistudyplanner.util;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Lightweight, deterministic response sanitizer for AI Study Tutor.
 * Strips conversational pleasantries, greetings, and preambles from the start
 * and unsolicited closing fluff from the end without touching legitimate technical content.
 */
public final class TutorResponseSanitizer {

    private TutorResponseSanitizer() {
        // utility class
    }

    // Sentence-bounded filler patterns (never match across sentence boundaries)
    private static final List<Pattern> FILLER_PATTERNS = List.of(
            // Greetings: "Hello!", "Hello there!", "Welcome to your quiz session.", "Hi!", "Good morning"
            Pattern.compile("^(hello|hi|hey|greetings|welcome|good\\s+(morning|afternoon|evening))([!.,\\s]|$)[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // AI Identity preambles: "As your AI Study Tutor...", "As an AI Study Tutor..."
            Pattern.compile("^(as\\s+your\\s+(ai\\s+)?(study\\s+)?tutor|as\\s+an?\\s+ai\\b)[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Flattery: "Great question!", "Fantastic question!", "I love this question!"
            Pattern.compile("^(great|fantastic|excellent|awesome|good|wonderful)\\s+question[!.]?", Pattern.CASE_INSENSITIVE),

            // Enthusiasm: "I am so excited to help you...", "I'd love to help you...", "I am thrilled..."
            Pattern.compile("^(i\\s+love|i'd\\s+love|i\\s+would\\s+love|i\\s+am\\s+(so\\s+)?(excited|thrilled|happy|glad|delighted|pleased|ready))\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Agenda setting / Today: "Today, we are tackling...", "Today we will explore...", "Today, let's break this down..."
            Pattern.compile("^today,?\\s+(we|let'?s|i)\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Let's break down / dive in: "Let's break this down...", "Let's break down...", "Let's dive in!"
            Pattern.compile("^(today,?\\s*)?let'?s\\s+(break|dive|get\\s+started|explore|take\\s+a\\s+look|tackle)\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Meta-announcements / Here is: "In this response, we will...", "Here is the difference...", "Here is an explanation..."
            Pattern.compile("^(here\\s+(is|are)|in\\s+this\\s+(response|guide|explanation|breakdown|session|overview|lesson))\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Quiz filler: "Grab a piece of paper...", "Get ready to learn!"
            Pattern.compile("^(grab\\s+a\\s+(piece\\s+of\\s+)?paper|get\\s+ready\\s+to\\s+learn|buckle\\s+up)\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE),

            // Polite filler openers: "Sure, I can help with that...", "Certainly! Here is..."
            Pattern.compile("^(sure|certainly|absolutely|of\\s+course)[!.,]?(\\s*(i\\s+can\\s+help|here\\s+(is|are)|let's\\b)[^.!?]*)?[.!?]?", Pattern.CASE_INSENSITIVE),

            // Forced curriculum connection opener: "It's a fantastic computer science concept to explore, especially..."
            Pattern.compile("^it'?s\\s+a\\s+(fantastic|great|wonderful|good|fascinating)\\s+([a-z\\s]+)?(concept|topic)\\b[^.!?]*[.!?]?", Pattern.CASE_INSENSITIVE)
    );

    // Closing conversational filler patterns (e.g. "Hope this helps!", "Let me know if you have questions")
    private static final Pattern CLOSING_FILLER_PATTERN = Pattern.compile(
            "^(hope\\s+this\\s+helps|let\\s+me\\s+know\\s+if|feel\\s+free\\s+to\\s+ask|how\\s+are\\s+you\\s+feeling\\s+about\\s+this|would\\s+you\\s+like\\s+to\\s+(dive|explore|learn)|do\\s+you\\s+have\\s+any\\s+(other\\s+)?questions|happy\\s+learning|happy\\s+coding)\\b.*",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Sanitizes raw Gemini model response by removing opening and closing conversational filler.
     *
     * @param rawResponse the raw response string from Gemini
     * @return cleaned, direct educational response
     */
    public static String sanitize(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return rawResponse;
        }

        String text = rawResponse.trim();

        // 1. Process opening paragraphs / lines
        text = stripOpeningFiller(text);

        // 2. Strip any trailing conversational closing filler paragraph
        text = stripClosingFiller(text);

        return text.trim();
    }

    private static String stripOpeningFiller(String text) {
        String[] paragraphs = text.split("\n\\s*\n");
        List<String> cleanedParagraphs = new ArrayList<>();
        boolean insideSubstance = false;

        for (String p : paragraphs) {
            String trimmedP = p.trim();
            if (trimmedP.isEmpty()) continue;

            // Once inside markdown structures (headings, code blocks, lists, tables), keep them
            if (trimmedP.startsWith("#") || trimmedP.startsWith("```") || trimmedP.startsWith("|") || trimmedP.startsWith("- ") || trimmedP.startsWith("* ")) {
                insideSubstance = true;
                cleanedParagraphs.add(trimmedP);
                continue;
            }

            // Divider lines before substance are ignored
            if (trimmedP.equals("---") || trimmedP.equals("***") || trimmedP.equals("___")) {
                if (insideSubstance) {
                    cleanedParagraphs.add(trimmedP);
                }
                continue;
            }

            // Strip inline filler sentences from paragraph
            String cleanedP = stripInlineFiller(trimmedP);
            if (!cleanedP.isEmpty()) {
                insideSubstance = true;
                cleanedParagraphs.add(cleanedP);
            }
        }

        String result = String.join("\n\n", cleanedParagraphs).trim();
        // Clean leading dividers if any left
        while (result.startsWith("---") || result.startsWith("***") || result.startsWith("___")) {
            result = result.substring(3).trim();
        }

        return result.isEmpty() ? text.trim() : result;
    }

    private static boolean isFillerSentence(String text) {
        String trimmed = text.trim();
        if (trimmed.isEmpty()) return true;

        // If sentence only contains emojis, symbols, and whitespace
        if (trimmed.replaceAll("[\\s\\p{So}\\p{Sk}\\p{Sm}\\p{Sc}\\p{P}]", "").isEmpty()) {
            return true;
        }

        for (Pattern p : FILLER_PATTERNS) {
            if (p.matcher(trimmed).matches()) {
                return true;
            }
        }
        return false;
    }

    private static String stripInlineFiller(String paragraph) {
        String current = paragraph.trim();
        boolean changed = true;
        int maxPasses = 8;

        while (changed && maxPasses-- > 0 && !current.isEmpty()) {
            changed = false;

            // First check if current itself is a single filler sentence
            if (isFillerSentence(current)) {
                return "";
            }

            // Find first sentence boundary
            int punctIdx = -1;
            for (int i = 0; i < current.length(); i++) {
                char c = current.charAt(i);
                if (c == '.' || c == '!' || c == '?') {
                    punctIdx = i;
                    break;
                }
            }

            if (punctIdx != -1) {
                String firstSentence = current.substring(0, punctIdx + 1).trim();
                String rest = current.substring(punctIdx + 1).trim();

                if (isFillerSentence(firstSentence)) {
                    current = rest;
                    changed = true;
                }
            }
        }

        return current.trim();
    }

    private static String stripClosingFiller(String text) {
        String current = text.trim();
        int lastNewline = current.lastIndexOf('\n');
        if (lastNewline != -1) {
            String lastParagraph = current.substring(lastNewline).trim();
            if (CLOSING_FILLER_PATTERN.matcher(lastParagraph).matches()) {
                current = current.substring(0, lastNewline).trim();
                if (current.endsWith("---") || current.endsWith("***")) {
                    current = current.substring(0, current.length() - 3).trim();
                }
            }
        }
        return current;
    }
}
