/**
 * dayContentService.js
 * Generates and caches structured learning content for each topic on a day.
 * Ensures every topic has:
 * - What You Need to Study (subtopics & conceptual scope)
 * - Detailed Explanation (beginner-friendly structured markdown)
 * - Practical Examples (working code snippets)
 * - Practice (coding exercises, conceptual drills)
 * - Key Takeaways (executive summary bullets)
 *
 * Caches content in localStorage so students load instantly without redundant API calls.
 */

const STORAGE_PREFIX = 'pathwise_day_content_';

export const getCachedDayContent = (roadmapId, dayNumber) => {
  if (!roadmapId || !dayNumber) return null;
  try {
    const key = `${STORAGE_PREFIX}${roadmapId}_day_${dayNumber}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCachedDayContent = (roadmapId, dayNumber, content) => {
  if (!roadmapId || !dayNumber || !content) return;
  try {
    const key = `${STORAGE_PREFIX}${roadmapId}_day_${dayNumber}`;
    localStorage.setItem(key, JSON.stringify(content));
  } catch (e) {
    console.warn('Could not cache day content:', e);
  }
};

/**
 * Builds rich, structured topic sections from the roadmap day's actual data.
 */
export const buildDayLearningContent = (dayTask, roadmapTitle = 'Computer Science') => {
  if (!dayTask) return [];

  const rawTopics = dayTask.topics || [];
  const baseTitle = dayTask.title || `Day ${dayTask.dayNumber}`;
  const objectives = dayTask.learningObjectives || [];
  const subtopics = dayTask.subtopics || [];
  const conceptExplanation = dayTask.conceptExplanation || dayTask.description || '';
  const practiceTasks = dayTask.practiceTasks || [];
  const quizQuestion = dayTask.quizQuestion || '';

  // If dailyTopics array exists and has items, build a section for each topic
  if (Array.isArray(rawTopics) && rawTopics.length > 0) {
    return rawTopics.map((topic, idx) => {
      const topicTitle = typeof topic === 'string' ? topic : (topic.title || `Topic ${idx + 1}`);
      const topicSummary = typeof topic === 'object' && topic.summary ? topic.summary : '';

      // Partition subtopics or objectives between topics if multiple
      const relevantSubtopics = subtopics.length > 0
        ? subtopics.filter((_, sIdx) => sIdx % rawTopics.length === idx)
        : [`Core principles of ${topicTitle}`, `Architectural patterns and trade-offs`, `Common implementation pitfalls`, `Performance optimization strategies`];

      const topicObjectives = objectives.length > 0
        ? objectives.filter((_, oIdx) => oIdx % rawTopics.length === idx)
        : [`Understand the syntax and mental model of ${topicTitle}`, `Apply ${topicTitle} in realistic software scenarios`];

      const relevantPractice = practiceTasks.length > 0
        ? practiceTasks.filter((_, pIdx) => pIdx % rawTopics.length === idx)
        : [`Write a focused implementation demonstrating ${topicTitle}`, `Test edge cases and verify runtime complexity`];

      return {
        id: `topic-${dayTask.dayNumber}-${idx}`,
        topicIndex: idx + 1,
        title: topicTitle,
        estimatedMinutes: topic.minutes || Math.round((dayTask.estimatedMinutes || 60) / rawTopics.length),
        objectives: topicObjectives.length > 0 ? topicObjectives : [`Master ${topicTitle} foundations`],
        subtopics: relevantSubtopics.length > 0 ? relevantSubtopics : [`Syntax & definition`, `Lifecycle & behavior`, `Best practices`],
        explanation: buildTopicExplanation(topicTitle, topicSummary, conceptExplanation, roadmapTitle),
        codeExample: buildTopicCodeExample(topicTitle, roadmapTitle),
        practice: {
          exercises: relevantPractice,
          conceptualQuestion: idx === 0 && quizQuestion ? quizQuestion : `How does ${topicTitle} handle concurrency or state transitions under load?`,
          implementationTask: `Build a clean, documented module showcasing ${topicTitle} integration.`
        },
        takeaways: [
          `${topicTitle} provides predictable, maintainable structure for ${roadmapTitle}.`,
          `Always account for boundary conditions and memory overhead when deploying ${topicTitle}.`,
          `Follow industry idioms and framework conventions when configuring ${topicTitle}.`
        ]
      };
    });
  }

  // Fallback: If only 1 overarching task with subtopics
  return [
    {
      id: `topic-${dayTask.dayNumber}-0`,
      topicIndex: 1,
      title: baseTitle,
      estimatedMinutes: dayTask.estimatedMinutes || 60,
      objectives: objectives.length > 0 ? objectives : [`Understand key principles of ${baseTitle}`],
      subtopics: subtopics.length > 0 ? subtopics : [`Core architectural concepts`, `Configuration and setup`, `Hands-on usage`],
      explanation: conceptExplanation || `Comprehensive learning module covering ${baseTitle} within the context of ${roadmapTitle}. Follow the guided progression below to understand theory, implementation, and verification.`,
      codeExample: buildTopicCodeExample(baseTitle, roadmapTitle),
      practice: {
        exercises: practiceTasks.length > 0 ? practiceTasks : [`Implement the core logic for ${baseTitle}`, `Add unit tests checking validation and edge cases`],
        conceptualQuestion: quizQuestion || `What are the primary performance and design trade-offs associated with ${baseTitle}?`,
        implementationTask: `Build a functional, modular component implementing ${baseTitle}.`
      },
      takeaways: [
        `${baseTitle} is an essential milestone in the ${roadmapTitle} curriculum.`,
        `Consistent practice and test verification ensure solid conceptual retention.`,
        `Apply design patterns to keep the implementation modular and extensible.`
      ]
    }
  ];
};

function buildTopicExplanation(title, summary, fallbackConcept, roadmapTitle) {
  let exp = '';
  if (summary && summary.trim().length > 20) {
    exp += summary.trim() + '\n\n';
  } else if (fallbackConcept && fallbackConcept.trim().length > 20) {
    exp += fallbackConcept.trim() + '\n\n';
  }

  exp += `### Conceptual Foundations\n`;
  exp += `When developing with **${roadmapTitle}**, understanding **${title}** is critical for building resilient, performant systems. Rather than treating it as isolated syntax, view it through the lens of architectural responsibility and data flow.\n\n`;
  exp += `### Key Mechanisms & Flow\n`;
  exp += `1. **Initialization & Setup**: The runtime registers the necessary structures, establishing lifecycle hooks and binding dependencies.\n`;
  exp += `2. **Execution & State Management**: During processing, inputs are evaluated against invariants, preserving immutability and predictability.\n`;
  exp += `3. **Teardown & Optimization**: Resources are released cleanly, preventing memory leaks and contention.\n\n`;
  exp += `### Industry Best Practices\n`;
  exp += `- **Separation of Concerns**: Keep business logic decoupled from transport and persistence layers.\n`;
  exp += `- **Defensive Programming**: Validate inputs early (fail-fast) to maintain predictable error handling.\n`;
  exp += `- **Testing**: Write comprehensive unit tests for standard execution paths and boundary conditions.`;

  return exp;
}

function buildTopicCodeExample(title, roadmapTitle) {
  const isJava = /java|spring|boot|backend|hibernate/i.test(roadmapTitle + ' ' + title);
  const isPython = /python|machine learning|data science|django|fastapi|pandas/i.test(roadmapTitle + ' ' + title);
  const isFrontend = /react|javascript|typescript|vue|frontend|css|html/i.test(roadmapTitle + ' ' + title);

  if (isJava) {
    return `// Practical Java Example: ${title}
package com.study.example;

import java.util.*;

public class ${title.replace(/[^a-zA-Z0-9]/g, '') || 'TopicExample'} {
    private final String identifier;
    private final List<String> records = new ArrayList<>();

    public ${title.replace(/[^a-zA-Z0-9]/g, '') || 'TopicExample'}(String identifier) {
        this.identifier = Objects.requireNonNull(identifier, "Identifier cannot be null");
    }

    public void processData(String item) {
        if (item == null || item.isBlank()) {
            throw new IllegalArgumentException("Item must contain valid characters");
        }
        records.add(item.trim());
        System.out.printf("[%s] Processed: %s (Total: %d)%n", identifier, item, records.size());
    }

    public List<String> getRecords() {
        return Collections.unmodifiableList(records);
    }
}`;
  }

  if (isPython) {
    return `# Practical Python Implementation: ${title}
from typing import List, Optional

class ${title.replace(/[^a-zA-Z0-9]/g, '') || 'TopicProcessor'}:
    def __init__(self, name: str) -> None:
        if not name:
            raise ValueError("Processor name must not be empty.")
        self.name: str = name
        self._entries: List[str] = []

    def execute(self, payload: str) -> bool:
        """Processes payload following best practices for ${title}."""
        cleaned = payload.strip()
        if not cleaned:
            return False
        self._entries.append(cleaned)
        print(f"[{self.name}] Ingested entry: '{cleaned}' (Count: {len(self._entries)})")
        return True

    @property
    def history(self) -> List[str]:
        return list(self._entries)`;
  }

  if (isFrontend) {
    return `// Practical React / Modern Frontend Example: ${title}
import React, { useState, useCallback } from 'react';

export const ${title.replace(/[^a-zA-Z0-9]/g, '') || 'TopicComponent'} = ({ initialLabel = "Ready" }) => {
  const [items, setItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = useCallback(async (newEntry) => {
    setIsProcessing(true);
    try {
      // Simulate asynchronous state transition
      await new Promise((resolve) => setTimeout(resolve, 300));
      setItems((prev) => [...prev, newEntry]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1">
      <h4 className="font-semibold text-text">${title}</h4>
      <p className="text-xs text-text-muted mt-1">Status: {initialLabel}</p>
      <div className="mt-3 text-xs">Total Items: {items.length}</div>
    </div>
  );
};`;
  }

  return `// Implementation: ${title}
function executeProcess(inputData) {
    if (!inputData) throw new Error("Invalid input data");
    console.log("Executing ${title} routine:", inputData);
    return { success: true, processedAt: new Date().toISOString() };
}`;
}
