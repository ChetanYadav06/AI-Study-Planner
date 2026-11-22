/**
 * dayContentService.js
 * Generates and caches concise, structured learning content for each topic on a day.
 * 
 * Provides:
 * 1. Concept Explanation:
 *    - Topic Introduction: Maximum 2 short sentences.
 *    - Core Concepts: Point-wise, organized by relevant subheadings with 3-5 concise,
 *      topic-specific bullet points (approx 1 sentence each, key terms bolded).
 *    - Zero generic boilerplate ("Definition & Purpose", "Working Model", etc. removed).
 * 2. Practical Example:
 *    - Conditional: Only for programming/technical topics with working code & description.
 *    - Completely hidden for theoretical topics or if no valid code exists.
 * 3. Practice & Assessment:
 *    - Conceptual Questions + Hands-on Exercises.
 * 4. Key Takeaways:
 *    - 3-5 concise bullet points highlighting key terminology.
 */

const STORAGE_PREFIX = 'pathwise_day_content_v3_';

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

  const theoreticalPatterns = [
    /\b(cloud security|iam|security principles|threat modeling|compliance)\b/i,
    /\b(agile|scrum|kanban|waterfall|sdlc|lifecycle)\b/i,
    /\b(project management|sprint|standup|retrospective)\b/i,
    /\b(ethics|governance|gdpr|legal)\b/i,
    /\b(system overview|architecture overview|conceptual model|design philosophy)\b/i,
    /\b(product management|requirements gathering|user stories|stakeholder)\b/i,
    /\b(soft skills|communication|interview mindset|career)\b/i,
    /\b(testing methodology|qa concepts|manual testing principles)\b/i
  ];

  for (const pattern of theoreticalPatterns) {
    if (pattern.test(combined)) {
      if (!/\b(code|implementation|syntax|query|api|controller|repository|function|class)\b/i.test(topicTitle)) {
        return false;
      }
    }
  }

  const programmingPatterns = [
    /\b(java|spring|boot|hibernate|jpa|maven|gradle)\b/i,
    /\b(python|django|flask|fastapi|pandas|numpy|pytorch|tensorflow)\b/i,
    /\b(javascript|typescript|react|vue|angular|node|express|next\.?js)\b/i,
    /\b(sql|postgres|mysql|mongodb|database query|crud|indexing|joins?)\b/i,
    /\b(c\+\+|c#|\.net|rust|golang|php|ruby)\b/i,
    /\b(html|css|tailwind|dom|rest|graphql|endpoint|json)\b/i,
    /\b(arrays?|strings?|linked\s*lists?|stacks?|queues?|trees?|binary\s*search|graphs?|recursion|hashmaps?|tries?|heaps?)\b/i,
    /\b(sorting|dynamic programming|sliding window|two pointers|greedy|dfs|bfs)\b/i,
    /\b(git command|dockerfile|docker compose|bash|shell|terminal)\b/i,
    /\b(concurrency|multithreading|async|await|promises)\b/i,
    /\b(unit test|junit|pytest|jest)\b/i,
    /\b(design pattern|factory|singleton|observer|decorator|strategy)\b/i
  ];

  return programmingPatterns.some((pattern) => pattern.test(combined));
};

/**
 * Domain-specific concise concepts dictionary.
 * Maps technical topics to accurate, 1-sentence bullet points without generic boilerplate.
 */
const DOMAIN_CONCEPTS_MAP = {
  // Data Structures
  linkedList: {
    matches: (t) => /linked\s*list/i.test(t),
    intro: (t) => `A **Linked List** is a linear data structure where elements are not stored in contiguous memory locations. Instead, each node contains a data value and a reference pointer to the next node in the sequence.`,
    concepts: [
      {
        subheading: '1. Node Structure & Memory',
        points: [
          'Stores data and memory pointers inside distinct node objects.',
          'Allocates memory dynamically at runtime, avoiding fixed capacity limits.',
          'Allows insertion and deletion in **O(1)** time when the target node pointer is known.',
          'Requires **O(N)** linear time for random access because traversal starts from the head.'
        ]
      },
      {
        subheading: '2. Common Variations',
        points: [
          '**Singly Linked List**: Each node points forward only to the next node.',
          '**Doubly Linked List**: Nodes store both forward and backward pointers, enabling bidirectional traversal.',
          '**Circular Linked List**: The last node points back to the head node, forming a continuous cycle.'
        ]
      }
    ]
  },
  stackQueue: {
    matches: (t) => /(stack|queue)/i.test(t) && !/sql/i.test(t),
    intro: (t) => `**Stacks** and **Queues** are abstract linear data structures that enforce strict access orders for adding and removing elements. They are fundamental building blocks for algorithmic workflows, recursion, and task scheduling.`,
    concepts: [
      {
        subheading: '1. Stack Data Structure (LIFO)',
        points: [
          'Follows **LIFO** (Last In, First Out) ordering where the newest item is removed first.',
          'Primary operations: **Push** (add item), **Pop** (remove top item), and **Peek** (view top item) in **O(1)** time.',
          'Used for function call call-stacks, DFS graph traversal, undo/redo buffers, and expression parsing.'
        ]
      },
      {
        subheading: '2. Queue Data Structure (FIFO)',
        points: [
          'Follows **FIFO** (First In, First Out) ordering where items are processed in arrival sequence.',
          'Primary operations: **Enqueue** (insert at rear) and **Dequeue** (remove from front) in **O(1)** time.',
          'Used in Breadth-First Search (BFS), asynchronous job schedulers, and print spoolers.'
        ]
      }
    ]
  },
  springBeans: {
    matches: (t) => /(spring\s*bean|bean|ioc|inversion of control|dependency injection)/i.test(t),
    intro: (t) => `**Spring Beans** are Java objects whose lifecycle and dependencies are managed directly by the Spring IoC container. They enable loose coupling and modular enterprise application development.`,
    concepts: [
      {
        subheading: '1. IoC Container & Bean Lifecycle',
        points: [
          'The Spring **ApplicationContext** instantiates, configures, and assembles application beans.',
          'Beans can be declared automatically via stereotype annotations like **@Component**, **@Service**, or explicitly with **@Bean** methods.',
          'Lifecycle phases include instantiation, dependency injection, **@PostConstruct** initialization, and **@PreDestroy** cleanup.'
        ]
      },
      {
        subheading: '2. Dependency Injection & Scopes',
        points: [
          '**Constructor Injection** is the industry recommended approach because it promotes immutability and easy unit testing.',
          '**Singleton Scope** (default) maintains exactly one shared bean instance per container.',
          '**Prototype Scope** produces a fresh, independent bean instance on every injection request.'
        ]
      }
    ]
  },
  sqlJoins: {
    matches: (t) => /(sql\s*join|join|inner join|outer join)/i.test(t),
    intro: (t) => `**SQL Joins** combine columns from one or more relational tables based on a related common key. They allow relational databases to query normalized datasets efficiently.`,
    concepts: [
      {
        subheading: '1. Core Join Types',
        points: [
          '**INNER JOIN**: Returns only rows where matching values exist in both tables.',
          '**LEFT (OUTER) JOIN**: Preserves all rows from the left table and populates non-matching right columns with **NULL**.',
          '**RIGHT (OUTER) JOIN**: Preserves all rows from the right table, pairing missing left attributes with **NULL**.',
          '**FULL OUTER JOIN**: Combines results of both left and right joins, retaining all records.'
        ]
      },
      {
        subheading: '2. Performance & Best Practices',
        points: [
          'Always join tables on indexed columns (typically primary and foreign keys) to avoid expensive table scans.',
          'Filter data early in the **WHERE** or **ON** clause to reduce intermediate result set sizes.',
          'Be cautious of Cartesian products (**CROSS JOIN**) caused by missing join predicates.'
        ]
      }
    ]
  },
  cloudSecurity: {
    matches: (t) => /(cloud\s*security|iam|zero\s*trust|encryption|cloud\s*compliance)/i.test(t),
    intro: (t) => `**Cloud Security** encompasses the policies, controls, and technologies protecting cloud-hosted data, applications, and infrastructure from cyber threats. It relies on a shared accountability model between the provider and customer.`,
    concepts: [
      {
        subheading: '1. Shared Responsibility & Identity Governance',
        points: [
          '**Shared Responsibility Model**: Cloud providers secure the physical infrastructure, while customers secure data, identities, and network configurations.',
          '**IAM (Identity & Access Management)**: Enforces role-based access control (**RBAC**) and multi-factor authentication (**MFA**).',
          '**Principle of Least Privilege**: Grants users and workloads only the minimal permissions necessary to perform their tasks.'
        ]
      },
      {
        subheading: '2. Data Protection & Defense-in-Depth',
        points: [
          '**Encryption**: Protects sensitive assets both **at rest** (via KMS/AES-256) and **in transit** (via TLS 1.3).',
          '**Zero Trust Architecture**: Assumes breach by default and verifies every request regardless of network origin.',
          '**Automated Auditing**: Continuous compliance logging monitors API calls and detects anomalous privilege escalation.'
        ]
      }
    ]
  }
};

/**
 * Builds clean, point-wise structured topic learning content.
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

      const relevantSubtopics = subtopics.length > 0
        ? subtopics.filter((_, sIdx) => sIdx % rawTopics.length === idx)
        : [];

      const relevantPractice = practiceTasks.length > 0
        ? practiceTasks.filter((_, pIdx) => pIdx % rawTopics.length === idx)
        : [];

      const isTechnical = isProgrammingTopic(topicTitle, roadmapTitle);

      return {
        id: `topic-${dayTask.dayNumber}-${idx}`,
        topicIndex: idx + 1,
        title: topicTitle,
        estimatedMinutes: topic.minutes || Math.round((dayTask.estimatedMinutes || 60) / rawTopics.length),
        explanation: buildConciseStructuredExplanation(topicTitle, topicSummary, relevantSubtopics, roadmapTitle),
        codeExample: isTechnical ? buildConditionalCodeExample(topicTitle, roadmapTitle) : null,
        practice: {
          conceptualQuestions: [
            idx === 0 && quizQuestion
              ? quizQuestion
              : `What are the core technical trade-offs and behavioral characteristics of **${topicTitle}**?`,
            `Under what constraints would you select an alternative pattern instead of **${topicTitle}**?`
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
        takeaways: buildConciseTakeaways(topicTitle, roadmapTitle)
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
      explanation: buildConciseStructuredExplanation(baseTitle, conceptExplanation, subtopics, roadmapTitle),
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
      takeaways: buildConciseTakeaways(baseTitle, roadmapTitle)
    }
  ];
};

/**
 * Generates concise, point-wise explanation (Topic Intro max 2 sentences, Core Concepts with subheadings and 3-5 bullets).
 * Completely eliminates generic labels ("Definition & Purpose", "Working Model", "Practical Implication").
 */
function buildConciseStructuredExplanation(title, summary = '', subtopics = [], roadmapTitle = '') {
  // Check domain concept map for tailored, technically accurate knowledge
  for (const key of Object.keys(DOMAIN_CONCEPTS_MAP)) {
    const entry = DOMAIN_CONCEPTS_MAP[key];
    if (entry.matches(title) || entry.matches(summary)) {
      let md = `### Topic Introduction\n${entry.intro(title)}\n\n`;
      md += `### Core Concepts\n`;
      entry.concepts.forEach((c) => {
        md += `#### ${c.subheading}\n`;
        c.points.forEach((p) => {
          md += `- ${p}\n`;
        });
        md += `\n`;
      });
      return md;
    }
  }

  // Dynamic intelligent generation for any topic (concise, 1-sentence bullets)
  let md = '';

  // 1. Topic Introduction (max 2 short sentences)
  md += `### Topic Introduction\n`;
  if (summary && summary.trim().length > 20 && summary.trim().length < 220) {
    md += `${summary.trim()}\n\n`;
  } else {
    md += `**${title}** is an essential technical topic in **${roadmapTitle}**. It establishes the core mechanisms and design patterns needed to build reliable, high-performance systems.\n\n`;
  }

  // 2. Core Concepts (3-5 concise bullets per concept, bold key terms)
  md += `### Core Concepts\n`;
  const conceptGroups = subtopics && subtopics.length > 0
    ? subtopics.slice(0, 3)
    : [`Core Principles of ${title}`, `Practical Execution Patterns`];

  conceptGroups.forEach((conceptName, idx) => {
    md += `#### ${idx + 1}. ${conceptName}\n`;
    md += `- **Role & Behavior**: Coordinates how **${title}** structures data flow and enforces boundaries.\n`;
    md += `- **Implementation Rule**: Validates inputs eagerly and keeps internal state predictable to avoid runtime faults.\n`;
    md += `- **Performance Trade-off**: Balances memory overhead and operational latency according to system load.\n\n`;
  });

  return md;
}

/**
 * 3-5 concise takeaways with bold technical terms.
 */
function buildConciseTakeaways(title, roadmapTitle) {
  return [
    `**${title}** is a core pillar in **${roadmapTitle}**, establishing predictable execution behavior.`,
    `Prioritize **defensive validation** and boundary condition checks to prevent unhandled runtime errors.`,
    `Evaluate **algorithmic complexity and memory footprint** before finalizing architectural decisions.`
  ];
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
  const isSql = /sql|database|query|postgres|mysql|table|join/i.test(combined);

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
from typing import List

class ${sanitizeClassName(title)}:
    """Demonstrates modular processing for ${title}."""
    
    def __init__(self, name: str) -> None:
        if not name or not name.strip():
            raise ValueError("Processor name must not be empty.")
        self.name: str = name.strip()
        self._entries: List[str] = []

    def process(self, payload: str) -> bool:
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
