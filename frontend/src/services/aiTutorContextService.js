/**
 * aiTutorContextService.js
 * Centralized manager for passing rich roadmap, phase, day, and topic study context
 * to the AI Study Tutor without polluting URLs or requiring duplicate API calls.
 */

const CONTEXT_STORAGE_KEY = 'ai_study_planner_tutor_context';

export const setTutorLearningContext = (context) => {
  if (!context) {
    clearTutorLearningContext();
    return;
  }
  try {
    sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify({
      ...context,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Could not store AI Tutor context in sessionStorage:', e);
  }
};

export const getTutorLearningContext = () => {
  try {
    const raw = sessionStorage.getItem(CONTEXT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearTutorLearningContext = () => {
  try {
    sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear AI Tutor context from sessionStorage:', e);
  }
};

/**
 * Builds the standard quiz prompt requested in the specification.
 */
export const buildQuizPrompt = ({ topicTitle, dayNumber, roadmapTitle, skillLevel = 'INTERMEDIATE' }) => {
  return `I'm studying ${topicTitle || 'this topic'} from Day ${dayNumber || 1} of my ${roadmapTitle || 'Curriculum'}.

Please test my understanding of this topic.

Create a quiz based on the actual learning material, covering its important concepts.

Start with 5 questions:
- Include a mix of conceptual and application-based questions.
- Use multiple-choice questions where appropriate.
- Ask one question at a time.
- Wait for my answer before revealing the correct answer.
- Explain why my answer is correct or incorrect.
- Give me a short explanation after each answer.
- Track my score.
- At the end, provide my final score and identify the concepts I need to revise.

Keep the difficulty appropriate to my selected skill level (${skillLevel}).`;
};

/**
 * Formats structured study context for Gemini without overloading token limits.
 */
export const formatContextForAssistant = (context, studentMessage) => {
  if (!context) return studentMessage;

  const parts = [];
  parts.push('[STUDENT STUDY CONTEXT - ACTIVE DAY/TOPIC LEARNING MATERIAL]');
  if (context.roadmapTitle) parts.push(`Roadmap: ${context.roadmapTitle}`);
  if (context.goal) parts.push(`Overall Goal: ${context.goal}`);
  if (context.phaseTitle) parts.push(`Phase: ${context.phaseTitle} (Phase ${context.phaseNumber || 1})`);
  if (context.dayNumber && context.dayTitle) parts.push(`Day ${context.dayNumber}: ${context.dayTitle}`);
  if (context.dayDescription) parts.push(`Day Description: ${context.dayDescription}`);
  if (context.skillLevel) parts.push(`Student Skill Level: ${context.skillLevel}`);
  if (context.completionStatus) parts.push(`Day Progress: ${context.completionStatus}`);

  if (context.objectives && Array.isArray(context.objectives) && context.objectives.length > 0) {
    parts.push(`Learning Objectives: ${context.objectives.join('; ')}`);
  }

  // Active topic or day topics
  if (context.activeTopic) {
    parts.push(`\n[FOCUSED TOPIC MATERIAL: ${context.activeTopic.title}]`);
    if (context.activeTopic.explanation) {
      parts.push(`Explanation & Core Concepts:\n${context.activeTopic.explanation}`);
    }
    if (context.activeTopic.codeExample?.code) {
      parts.push(`Code Example (${context.activeTopic.codeExample.language || 'code'}):\n${context.activeTopic.codeExample.code}`);
    }
    if (context.activeTopic.takeaways && Array.isArray(context.activeTopic.takeaways)) {
      parts.push(`Key Takeaways: ${context.activeTopic.takeaways.join('; ')}`);
    }
  } else if (context.topics && Array.isArray(context.topics) && context.topics.length > 0) {
    parts.push(`\n[DAY TOPICS & STUDY MATERIAL]`);
    context.topics.forEach((top, idx) => {
      parts.push(`Topic ${idx + 1}: ${top.title}`);
      if (top.explanation) {
        parts.push(`Summary & Concepts: ${top.explanation.slice(0, 500)}...`);
      }
      if (top.takeaways && Array.isArray(top.takeaways)) {
        parts.push(`Takeaways: ${top.takeaways.join('; ')}`);
      }
    });
  }

  parts.push('[/END STUDY CONTEXT]\n');
  parts.push('STUDENT QUESTION / REQUEST:');
  parts.push(studentMessage);

  return parts.join('\n');
};
