package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.dto.RoadmapResponse.DailyTask;
import com.aistudyplanner.dto.RoadmapResponse.WeeklyPhase;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class RoadmapValidator {

    public static final double MIN_KEYWORD_MATCH_RATIO = 0.80; // At most 20% tasks may lack keywords
    public static final double DAILY_MINUTES_TOLERANCE_RATIO = 1.15; // 15% tolerance on daily minutes
    public static final double MAX_SINGLE_ACTIVITY_RATIO = 0.60; // No activityType > 60% of tasks for 14+ days

    // Allowed activity types: strictly aligned with prompt & UI badge handlers
    public static final Set<String> ALLOWED_ACTIVITY_TYPES = Set.of(
            "STUDY", "PRACTICE", "PROJECT", "REVIEW", "CODING_PRACTICE", "QUIZ", "ASSESSMENT"
    );

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
            "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were",
            "will", "with", "or", "i", "my", "your", "learning", "study", "master", "mastery"
    );

    public List<String> validate(RoadmapResponse response, RoadmapRequest request) {
        List<String> errors = new ArrayList<>();

        if (response == null) {
            errors.add("Roadmap response is null.");
            return errors;
        }

        List<WeeklyPhase> phases = response.getPhases();
        if (phases == null || phases.isEmpty()) {
            errors.add("Roadmap must contain at least one phase.");
            return errors;
        }

        int targetDays = request.getTargetDays();
        double maxAllowedMinutes = (request.getHoursPerDay() * 60) * DAILY_MINUTES_TOLERANCE_RATIO;

        int totalTasks = 0;
        int expectedNextDayNumber = 1;
        Set<String> seenTitles = new HashSet<>();
        Set<String> seenCanonicalIds = new HashSet<>();
        Map<String, Integer> activityTypeCounts = new HashMap<>();

        // Relevance keywords extracted from goal topic & description
        Set<String> keywords = extractKeywords(request.getTopic(), request.getDescription());
        int relevantTaskCount = 0;

        for (int pIdx = 0; pIdx < phases.size(); pIdx++) {
            WeeklyPhase phase = phases.get(pIdx);
            if (phase == null) {
                errors.add(String.format("Phase at index %d is null.", pIdx));
                continue;
            }

            if (phase.getPhaseTitle() == null || phase.getPhaseTitle().isBlank()) {
                errors.add(String.format("Phase %d title is blank.", pIdx + 1));
            }

            List<DailyTask> tasks = phase.getDailyTasks();
            if (tasks == null || tasks.isEmpty()) {
                errors.add(String.format("Phase %d contains no daily tasks.", pIdx + 1));
                continue;
            }

            Map<String, Integer> suffixCounts = new HashMap<>();

            for (int tIdx = 0; tIdx < tasks.size(); tIdx++) {
                DailyTask task = tasks.get(tIdx);
                totalTasks++;

                if (task == null) {
                    errors.add(String.format("Task at phase %d, index %d is null.", pIdx, tIdx));
                    continue;
                }

                // Sequential dayNumber check
                int dayNumber = task.getDayNumber();
                if (dayNumber <= 0) {
                    errors.add(String.format("Task '%s' has non-positive dayNumber %d.", task.getTitle(), dayNumber));
                } else if (dayNumber != expectedNextDayNumber) {
                    errors.add(String.format("Expected dayNumber %d but found %d in phase %d.",
                            expectedNextDayNumber, dayNumber, pIdx + 1));
                }
                expectedNextDayNumber++;

                // Title and description checks
                String title = task.getTitle();
                if (title == null || title.isBlank()) {
                    errors.add(String.format("Day %d task title is blank.", dayNumber));
                } else {
                    String normTitle = title.trim().toLowerCase();
                    if (!seenTitles.add(normTitle)) {
                        errors.add(String.format("Duplicate task title '%s' found.", title.trim()));
                    }
                }

                if (task.getDescription() == null || task.getDescription().isBlank()) {
                    errors.add(String.format("Day %d task description is blank.", dayNumber));
                }

                // Canonical task ID uniqueness
                String canonicalId = generateCanonicalTaskId(pIdx, dayNumber, null, tIdx, suffixCounts);
                if (!seenCanonicalIds.add(canonicalId)) {
                    errors.add(String.format("Duplicate canonical task ID '%s' generated.", canonicalId));
                }

                // Activity type check
                String actType = task.getActivityType();
                if (actType == null || actType.isBlank()) {
                    errors.add(String.format("Day %d is missing activityType.", dayNumber));
                } else {
                    String normAct = actType.trim().toUpperCase();
                    if (!ALLOWED_ACTIVITY_TYPES.contains(normAct)) {
                        errors.add(String.format("Invalid activityType '%s' on day %d. Allowed: %s",
                                actType, dayNumber, ALLOWED_ACTIVITY_TYPES));
                    } else {
                        activityTypeCounts.put(normAct, activityTypeCounts.getOrDefault(normAct, 0) + 1);
                    }
                }

                // Estimated minutes check
                if (task.getEstimatedMinutes() > maxAllowedMinutes) {
                    errors.add(String.format("Task '%s' estimated minutes (%d) exceeds daily target allowance (%.0f min).",
                            task.getTitle(), task.getEstimatedMinutes(), maxAllowedMinutes));
                }

                // Relevance check: check task title, description, phase title, and phase topics
                if (isTaskRelevant(task, phase, keywords)) {
                    relevantTaskCount++;
                }
            }
        }

        // Total day count matching
        if (totalTasks != targetDays) {
            errors.add(String.format("Total daily tasks (%d) does not match target days (%d).", totalTasks, targetDays));
        }

        // 14+ days requirements:
        if (targetDays >= 14) {
            // At least 3 distinct activity types
            if (activityTypeCounts.size() < 3) {
                errors.add(String.format("Roadmaps of 14+ days must include at least 3 distinct activity types (found %d: %s).",
                        activityTypeCounts.size(), activityTypeCounts.keySet()));
            }

            // No single activity type exceeds 60% of tasks
            for (Map.Entry<String, Integer> entry : activityTypeCounts.entrySet()) {
                double ratio = (double) entry.getValue() / totalTasks;
                if (ratio > MAX_SINGLE_ACTIVITY_RATIO) {
                    errors.add(String.format("Activity type '%s' makes up %.1f%% of tasks (maximum allowed is %.0f%%).",
                            entry.getKey(), ratio * 100.0, MAX_SINGLE_ACTIVITY_RATIO * 100.0));
                }
            }
        }

        // Coarse global sanity check: at least 80% tasks must contain keywords across task/phase fields
        if (totalTasks > 0 && !keywords.isEmpty()) {
            double relevanceRatio = (double) relevantTaskCount / totalTasks;
            if (relevanceRatio < MIN_KEYWORD_MATCH_RATIO) {
                errors.add(String.format("Roadmap off-topic: only %.1f%% of tasks match goal keywords (minimum %.0f%% required).",
                        relevanceRatio * 100.0, MIN_KEYWORD_MATCH_RATIO * 100.0));
            }
        }

        return errors;
    }

    public static String generateCanonicalTaskId(int pIdx, Integer dayNumber, String taskId, int tIdx, Map<String, Integer> suffixCounts) {
        if (taskId != null && !taskId.isBlank()) {
            return taskId;
        }
        String baseSuffix = String.valueOf(dayNumber != null ? dayNumber : tIdx);
        String baseKey = pIdx + "-task-" + baseSuffix;

        if (suffixCounts == null) {
            return baseKey;
        }

        int count = suffixCounts.getOrDefault(baseKey, 0);
        suffixCounts.put(baseKey, count + 1);

        if (count == 0) {
            return baseKey;
        } else {
            char suffixChar = (char) ('a' + count);
            return baseKey + "-" + suffixChar;
        }
    }

    private Set<String> extractKeywords(String topic, String description) {
        Set<String> keywords = new HashSet<>();
        if (topic != null) {
            tokenizeInto(topic, keywords);
        }
        if (description != null) {
            tokenizeInto(description, keywords);
        }
        return keywords;
    }

    private void tokenizeInto(String text, Set<String> keywords) {
        String[] tokens = text.toLowerCase().split("[^a-z0-9+#]+");
        for (String token : tokens) {
            token = token.trim();
            if (token.length() >= 3 && !STOP_WORDS.contains(token)) {
                keywords.add(token);
            }
        }
    }

    private boolean isTaskRelevant(DailyTask task, WeeklyPhase phase, Set<String> keywords) {
        if (keywords.isEmpty()) return true;

        StringBuilder sb = new StringBuilder();
        if (task.getTitle() != null) sb.append(task.getTitle()).append(" ");
        if (task.getDescription() != null) sb.append(task.getDescription()).append(" ");
        if (phase.getPhaseTitle() != null) sb.append(phase.getPhaseTitle()).append(" ");
        if (phase.getTopics() != null) {
            for (String t : phase.getTopics()) {
                sb.append(t).append(" ");
            }
        }

        String combined = sb.toString().toLowerCase();
        for (String kw : keywords) {
            if (combined.contains(kw)) {
                return true;
            }
        }
        return false;
    }
}
