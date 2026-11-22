/**
 * dayContentService.js
 * Generates and caches structured, point-wise learning content for each topic on a day.
 * 
 * Provides:
 * 1. Concept Explanation (Topic Introduction, Core Concepts with subheadings & bullet points, Important Points & Mechanisms)
 * 2. Practical Example (Conditional: only for technical/coding topics with working code & explanation; null for theoretical topics)
 * 3. Practice & Assessment (Conceptual Questions + Hands-on Exercises)
 * 4. Key Takeaways (3-5 concise bullet points with bold terminology)
 * 
 * Caches content in localStorage so students load instantly without redundant recalculation.
 */

const STORAGE_PREFIX = 'pathwise_day_content_v2_';

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
 * Checks if a topic is genuinely technical/code-oriented or theoretical.
 */
export const isProgrammingTopic = (topicTitle = '', roadmapTitle = '') => {
  const combined = `${topicTitle} ${roadmapTitle}`.toLowerCase();

  // Theoretical / non-coding topics that should NOT have code
  const theoreticalPatterns = [
    /\b(agile|scrum|kanban|waterfall|sdlc|lifecycle)\b/i,
    /\b(project management|sprint|standup|retrospective)\b/i,
    /\b(ethics|governance|compliance|gdpr|legal)\b/i,
    /\b(system overview|architecture overview|conceptual model|design philosophy)\b/i,
    /\b(product management|requirements gathering|user stories|stakeholder)\b/i,
    /\b(soft skills|communication|interview mindset|career)\b/i,
    /\b(testing methodology|qa concepts|manual testing principles)\b/i
  ];

  // If matches theoretical patterns and doesn't explicitly mention programming elements
  for (const pattern of theoreticalPatterns) {
    if (pattern.test(combined)) {
      // Unless it explicitly contains coding keywords
      if (!/\b(code|implementation|syntax|query|api|controller|repository|function|class)\b/i.test(topicTitle)) {
        return false;
      }
    }
  }

  // Positive programming indicators
  const programmingPatterns = [
    /\b(java|spring|boot|hibernate|jpa|maven|gradle)\b/i,
    /\b(python|django|flask|fastapi|pandas|numpy|pytorch|tensorflow)\b/i,
    /\b(javascript|typescript|react|vue|angular|node|express|next\.?js)\b/i,
    /\b(sql|postgres|mysql|mongodb|database query|crud|indexing)\b/i,
    /\b(c\+\+|c#|\.net|rust|golang|php|ruby)\b/i,
    /\b(html|css|tailwind|dom|rest|graphql|endpoint|json)\b/i,
    /\b(array|string|linked list|tree|binary search|graph|recursion|stack|queue|hashmap|trie)\b/i,
    /\b(sorting|dynamic programming|sliding window|two pointers|greedy|dfs|bfs)\b/i,
    /\b(git command|dockerfile|docker compose|bash|shell|terminal|linux command)\b/i,
    /\b(concurrency|multithreading|async|await|promises|event loop)\b/i,
    /\b(unit test|junit|pytest|jest|mocking|integration test)\b/i,
    /\b(design pattern|factory|singleton|observer|decorator|strategy)\b/i
  ];

  return programmingPatterns.some((pattern) => pattern.test(combined));
};

/**
 * Builds clean, structured point-wise topic learning content.
 */
export const buildDayLearningContent = (dayTask, roadmapTitle = 'Study Curriculum') => {
  if (!dayTask) return [];

  const rawTopics = dayTask.topics || [];
  const baseTitle = dayTask.title || `Day ${dayTask.dayNumber}`;
  const objectives = dayTask.learningObjectives || [];
  const subtopics = dayTask.subtopics || [];
  const conceptExplanation = dayTask.conceptExplanation || dayTask.description || '';
  const practiceTasks = dayTask.practiceTasks || [];
  const quizQuestion = dayTask.quizQuestion || '';

  // Multiple topics on this day
  if (Array.isArray(rawTopics) && rawTopics.length > 0) {
    return rawTopics.map((topic, idx) => {
      const topicTitle = typeof topic === 'string' ? topic : (topic.title || `Topic ${idx + 1}`);
      const topicSummary = typeof topic === 'object' && topic.summary ? topic.summary : '';

      // Partition subtopics or objectives relevant to this topic
      const relevantSubtopics = subtopics.length > 0
        ? subtopics.filter((_, sIdx) => sIdx % rawTopics.length === idx)
        : [`Core principles of ${topicTitle}`, `Key technical patterns`, `Common pitfalls & best practices`];

      const relevantObjectives = objectives.length > 0
        ? objectives.filter((_, oIdx) => oIdx % rawTopics.length === idx)
        : [`Master the fundamental principles of ${topicTitle}`, `Apply ${topicTitle} in realistic scenarios`];

      const relevantPractice = practiceTasks.length > 0
        ? practiceTasks.filter((_, pIdx) => pIdx % rawTopics.length === idx)
        : [];

      const isTechnical = isProgrammingTopic(topicTitle, roadmapTitle);

      return {
        id: `topic-${dayTask.dayNumber}-${idx}`,
        topicIndex: idx + 1,
        title: topicTitle,
        estimatedMinutes: topic.minutes || Math.round((dayTask.estimatedMinutes || 60) / rawTopics.length),
        explanation: buildStructuredExplanation(topicTitle, topicSummary, relevantSubtopics, conceptExplanation, roadmapTitle),
        codeExample: isTechnical ? buildConditionalCodeExample(topicTitle, roadmapTitle) : null,
        practice: {
          conceptualQuestions: [
            idx === 0 && quizQuestion
              ? quizQuestion
              : `What are the core technical trade-offs and behavioral characteristics of **${topicTitle}**?`,
            `How does **${topicTitle}** compare to alternative approaches in terms of efficiency and maintainability?`
          ],
          handsOnExercises: relevantPractice.length > 0
            ? relevantPractice
            : isTechnical
            ? [
                `Implement a standalone module demonstrating ${topicTitle} adhering to production conventions.`,
                `Test edge cases (e.g. null inputs, boundary values, exception handling) for ${topicTitle}.`
              ]
            : [
                `Analyze a realistic case study where ${topicTitle} was improperly applied and propose corrections.`,
                `Draft a team guidelines checklist for adopting ${topicTitle} effectively.`
              ]
        },
        takeaways: [
          `**${topicTitle}** serves as a foundational component in **${roadmapTitle}**, ensuring architectural consistency.`,
          `Prioritize **defensive handling** and boundary-case validation to prevent runtime failure modes.`,
          `Evaluate **performance and scalability trade-offs** before committing to a specific design choice.`
        ]
      };
    });
  }

  // Single overarching topic on this day
  const isTechnical = isProgrammingTopic(baseTitle, roadmapTitle);

  return [
    {
      id: `topic-${dayTask.dayNumber}-0`,
      topicIndex: 1,
      title: baseTitle,
      estimatedMinutes: dayTask.estimatedMinutes || 60,
      explanation: buildStructuredExplanation(baseTitle, conceptExplanation, subtopics, '', roadmapTitle),
      codeExample: isTechnical ? buildConditionalCodeExample(baseTitle, roadmapTitle) : null,
      practice: {
        conceptualQuestions: [
          quizQuestion || `What are the primary performance and design trade-offs associated with **${baseTitle}**?`,
          `Under what system constraints would you avoid or re-evaluate using **${baseTitle}**?`
        ],
        handsOnExercises: practiceTasks.length > 0
          ? practiceTasks
          : isTechnical
          ? [
              `Implement a clean, documented component showcasing ${baseTitle}.`,
              `Write unit tests validating normal workflows and boundary conditions for ${baseTitle}.`
            ]
          : [
              `Review an organizational scenario to evaluate how ${baseTitle} influences project delivery.`,
              `Create a summary decision matrix comparing ${baseTitle} to related alternatives.`
            ]
      },
      takeaways: [
        `**${baseTitle}** provides structured, predictable execution patterns within **${roadmapTitle}**.`,
        `Always consider **runtime efficiency, memory footprint, and maintainability** when designing with **${baseTitle}**.`,
        `Follow standardized industry conventions and unit test coverage to ensure long-term stability.`
      ]
    }
  ];
};

/**
 * Builds a structured, point-wise explanation (Topic Intro, Core Concepts, Important Points & Mechanisms).
 */
function buildStructuredExplanation(title, summary, subtopics = [], fallbackConcept = '', roadmapTitle = '') {
  let md = '';

  // 1. Topic Introduction (2-3 concise sentences)
  md += `### Topic Introduction\n`;
  if (summary && summary.trim().length > 25) {
    md += `${summary.trim()}\n\n`;
  } else if (fallbackConcept && fallbackConcept.trim().length > 25) {
    md += `${fallbackConcept.trim()}\n\n`;
  } else {
    md += `**${title}** is a core technical concept in **${roadmapTitle}** that establishes critical foundational patterns. It defines how data structures, operational logic, and interfaces interact reliably in modern software architectures. Mastering it ensures that you can design systems that are both scalable and resilient.\n\n`;
  }

  // 2. Core Concepts (Point-wise with subheadings and bold terms)
  md += `### Core Concepts\n`;
  const concepts = subtopics && subtopics.length > 0
    ? subtopics
    : [`Fundamentals of ${title}`, `Architectural Responsibilities`, `Operational Patterns`];

  concepts.slice(0, 3).forEach((concept, cIdx) => {
    md += `#### ${cIdx + 1}. ${concept}\n`;
    md += `- **Definition & Purpose**: Focuses on structuring **${title}** to maintain modularity, high cohesion, and low coupling.\n`;
    md += `- **Working Model**: Evaluates incoming parameters against strict invariants, guaranteeing predictable state transitions.\n`;
    md += `- **Practical Implication**: Reduces technical debt by isolating business logic from external side effects.\n\n`;
  });

  // 3. Important Points & Mechanisms (Numbered steps & key distinctions)
  md += `### Important Points & Mechanisms\n`;
  md += `1. **Execution Workflow**: The process begins with initialization and dependency configuration, moves into execution while maintaining immutability, and finalizes with clean resource deallocation.\n`;
  md += `2. **State & Memory Management**: Mindful allocation avoids runtime overhead and memory leaks, especially under high concurrent load.\n`;
  md += `3. **Key Comparison & Trade-offs**: Compared to naive or ad-hoc alternatives, **${title}** offers formal verification, improved testability, and standardized maintainability.\n`;

  return md;
}

/**
 * Builds a clean, working practical code example with clear explanation.
 * Returns null if the topic should not contain code.
 */
function buildConditionalCodeExample(title, roadmapTitle) {
  const combined = `${title} ${roadmapTitle}`.toLowerCase();

  const isJava = /java|spring|boot|backend|hibernate|jpa|maven/i.test(combined);
  const isPython = /python|machine learning|data science|django|fastapi|pandas|numpy/i.test(combined);
  const isFrontend = /react|javascript|typescript|vue|frontend|css|html|next/i.test(combined);
  const isSql = /sql|database|query|postgres|mysql|table/i.test(combined);

  if (isJava) {
    return {
      language: 'java',
      title: `Practical Java Implementation: ${title}`,
      description: `Demonstrates how to structure **${title}** using modern Java idioms, clean object encapsulation, and input validation.`,
      code: `// Practical Java Example: ${title}
package com.study.example;

import java.util.*;

public class ${sanitizeClassName(title)} {
    private final String identifier;
    private final List<String> records = new ArrayList<>();

    public ${sanitizeClassName(title)}(String identifier) {
        this.identifier = Objects.requireNonNull(identifier, "Identifier cannot be null");
    }

    /**
     * Executes core processing logic with fail-fast validation.
     */
    public void processData(String item) {
        if (item == null || item.isBlank()) {
            throw new IllegalArgumentException("Item must contain valid characters");
        }
        records.add(item.trim());
        System.out.printf("[%s] Processed item: %s (Total: %d)%n", identifier, item, records.size());
    }

    public List<String> getRecords() {
        return Collections.unmodifiableList(records);
    }
}`
    };
  }

  if (isPython) {
    return {
      language: 'python',
      title: `Practical Python Implementation: ${title}`,
      description: `Showcases a clean, typed Python implementation for **${title}** adhering to PEP 8 standards and defensive validation.`,
      code: `# Practical Python Implementation: ${title}
from typing import List, Optional

class ${sanitizeClassName(title)}:
    """Demonstrates modular processing for ${title}."""
    
    def __init__(self, name: str) -> None:
        if not name or not name.strip():
            raise ValueError("Processor name must not be empty.")
        self.name: str = name.strip()
        self._entries: List[str] = []

    def process(self, payload: str) -> bool:
        """Processes payload following best practices for ${title}."""
        cleaned = payload.strip() if payload else ""
        if not cleaned:
            return False
        self._entries.append(cleaned)
        print(f"[{self.name}] Processed entry: '{cleaned}' (Total: {len(self._entries)})")
        return True

    @property
    def history(self) -> List[str]:
        return list(self._entries)`
    };
  }

  if (isFrontend) {
    return {
      language: 'javascript',
      title: `Practical React Component: ${title}`,
      description: `Illustrates how to implement **${title}** in a reusable React component with hooks, state management, and accessibility.`,
      code: `// Practical React Implementation: ${title}
import React, { useState, useCallback } from 'react';

export const ${sanitizeClassName(title)}View = ({ title = "${title}" }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAddItem = useCallback(async (entryText) => {
    if (!entryText.trim()) return;
    setLoading(true);
    try {
      // Simulate asynchronous state transition
      await new Promise((res) => setTimeout(res, 200));
      setItems((prev) => [...prev, entryText.trim()]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1">
      <h3 className="font-bold text-text">{title}</h3>
      <p className="text-xs text-text-muted mt-1">Total Items: {items.length}</p>
      {loading && <span className="text-xs text-accent">Updating...</span>}
    </div>
  );
};`
    };
  }

  if (isSql) {
    return {
      language: 'sql',
      title: `Practical SQL Query: ${title}`,
      description: `Structured SQL queries illustrating indexing, aggregation, and clean filtering for **${title}**.`,
      code: `-- Practical SQL Example: ${title}
SELECT 
    id,
    name,
    status,
    created_at
FROM study_records
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20;`
    };
  }

  // Generic clean programming example
  return {
    language: 'javascript',
    title: `Practical Code Example: ${title}`,
    description: `A standard implementation demonstrating the algorithmic logic and execution flow for **${title}**.`,
    code: `// Implementation: ${title}
function executeProcess(inputData) {
    if (!inputData) {
        throw new Error("Invalid input data provided");
    }
    console.log("Executing ${title} routine:", inputData);
    return { success: true, timestamp: Date.now() };
}`
  };
}

function sanitizeClassName(str = '') {
  const cleaned = str.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned || /^[0-9]/.test(cleaned)) {
    return 'StudyModule';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
