import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  BookOpen,
  Code,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  HelpCircle,
  Award,
  Zap
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { SafeMarkdown } from './SafeMarkdown';
import {
  getCachedDayContent,
  saveCachedDayContent,
  buildDayLearningContent
} from '../../services/dayContentService';

export const FullPageDayView = ({
  roadmap,
  roadmapId,
  dayNumber,
  allSequentialTasks = [],
  completedTasks = {},
  onToggleComplete,
  onBackToJourney
}) => {
  const { navigate } = useRouter();

  // Find the current day task item
  const currentTaskItem = useMemo(() => {
    return allSequentialTasks.find((t) => Number(t.dayNumber) === Number(dayNumber)) || null;
  }, [allSequentialTasks, dayNumber]);

  // Previous and next day items
  const currentIndex = currentTaskItem ? currentTaskItem.sequenceIndex : -1;
  const prevTaskItem = currentIndex > 0 ? allSequentialTasks[currentIndex - 1] : null;
  const nextTaskItem = currentIndex >= 0 && currentIndex < allSequentialTasks.length - 1 ? allSequentialTasks[currentIndex + 1] : null;

  // Day is completed if the overall day task is checked in completedTasks
  const isDayCompleted = Boolean(currentTaskItem && completedTasks[currentTaskItem.taskId]);

  // Subtopic local completion state for granular topic checklists
  const subtopicStorageKey = `pathwise_day_subtopics_${roadmapId}_${dayNumber}`;
  const [completedSubtopics, setCompletedSubtopics] = useState(() => {
    try {
      const raw = localStorage.getItem(subtopicStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Keep subtopic state synced with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(subtopicStorageKey, JSON.stringify(completedSubtopics));
    } catch (e) {
      console.warn('Could not save subtopic completion:', e);
    }
  }, [completedSubtopics, subtopicStorageKey]);

  // Load or generate structured point-wise day content using dayContentService
  const [dayTopics, setDayTopics] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    if (!currentTaskItem) {
      setLoadingContent(false);
      return;
    }

    setLoadingContent(true);
    // Check local cached content first
    const cached = getCachedDayContent(roadmapId, dayNumber);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setDayTopics(cached);
      setLoadingContent(false);
    } else {
      // Build structured content from dayTask data
      const generated = buildDayLearningContent(
        currentTaskItem.task,
        roadmap?.topic || roadmap?.title || 'Study Curriculum'
      );
      setDayTopics(generated);
      saveCachedDayContent(roadmapId, dayNumber, generated);
      setLoadingContent(false);
    }
  }, [roadmapId, dayNumber, currentTaskItem, roadmap]);

  // Track expanded accordion topics (default: open first topic)
  const [expandedTopics, setExpandedTopics] = useState({ 0: true });

  const toggleTopicAccordion = (index) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Toggle individual topic completion
  const handleToggleTopic = (topicId) => {
    setCompletedSubtopics((prev) => {
      const updated = { ...prev, [topicId]: !prev[topicId] };
      // Check if all topics are now completed
      const allDone = dayTopics.length > 0 && dayTopics.every((t) => updated[t.id]);
      if (allDone && !isDayCompleted && onToggleComplete && currentTaskItem) {
        onToggleComplete(currentTaskItem.taskId, true);
      }
      return updated;
    });
  };

  // Mark all topics of this day as complete
  const handleToggleDayComplete = () => {
    if (!currentTaskItem || !onToggleComplete) return;
    const targetState = !isDayCompleted;

    // Update day task on server/roadmap
    onToggleComplete(currentTaskItem.taskId, targetState);

    // Sync all subtopics
    const newSubtopics = {};
    dayTopics.forEach((t) => {
      newSubtopics[t.id] = targetState;
    });
    setCompletedSubtopics(newSubtopics);
  };

  // Calculate day completion progress
  const totalTopicsCount = dayTopics.length;
  const completedCount = useMemo(() => {
    if (isDayCompleted) return totalTopicsCount;
    return dayTopics.filter((t) => Boolean(completedSubtopics[t.id])).length;
  }, [dayTopics, completedSubtopics, isDayCompleted, totalTopicsCount]);

  const dayProgressPct = totalTopicsCount > 0
    ? Math.round((completedCount / totalTopicsCount) * 100)
    : (isDayCompleted ? 100 : 0);

  // Navigation handlers
  const handleBackToRoadmap = () => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      navigate(`#/roadmaps/${roadmapId}`);
    }
  };

  const handlePrevDay = () => {
    if (prevTaskItem) {
      navigate(`#/roadmaps/${roadmapId}/day/${prevTaskItem.dayNumber}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextDay = () => {
    if (nextTaskItem) {
      navigate(`#/roadmaps/${roadmapId}/day/${nextTaskItem.dayNumber}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAskAiAboutTopic = (topicTitle) => {
    const query = `I am studying Day ${dayNumber} (${currentTaskItem?.task?.title || ''}). Can you explain "${topicTitle}" with beginner-friendly concepts, key mechanisms, and practical examples?`;
    navigate(`#/ai-assistant?topic=${encodeURIComponent(topicTitle)}&prompt=${encodeURIComponent(query)}`);
  };

  const handleAskAiAboutDay = () => {
    const query = `I am studying Day ${dayNumber}: ${currentTaskItem?.task?.title || ''}. Give me a structured study summary and test my understanding with 3 practice questions.`;
    navigate(`#/ai-assistant?topic=${encodeURIComponent(currentTaskItem?.task?.title || `Day ${dayNumber}`)}&prompt=${encodeURIComponent(query)}`);
  };

  // Copy code snippet helper
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const handleCopyCode = (id, codeSnippet) => {
    navigator.clipboard?.writeText?.(codeSnippet);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (!currentTaskItem) {
    return (
      <div className="py-20 text-center space-y-4 max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-text">Day {dayNumber} Not Found</h3>
        <p className="text-sm text-text-muted">
          This study day does not exist in the active roadmap curriculum.
        </p>
        <Button variant="secondary" onClick={handleBackToRoadmap} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roadmap Journey</span>
        </Button>
      </div>
    );
  }

  const { task, phaseTitle, phaseIdx, estimatedMinutes } = currentTaskItem;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* ── BREADCRUMB NAVIGATION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border text-xs text-text-muted">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('#/roadmaps')}
            className="hover:text-text transition cursor-pointer"
          >
            My Roadmaps
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={handleBackToRoadmap}
            className="hover:text-text transition cursor-pointer truncate max-w-[200px]"
          >
            {roadmap?.topic || roadmap?.title || 'Roadmap'}
          </button>
          <span>/</span>
          <span className="text-text-muted truncate max-w-[200px]">
            Phase {phaseIdx + 1}: {phaseTitle}
          </span>
          <span>/</span>
          <span className="font-semibold text-accent font-mono">
            Day {dayNumber}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleBackToRoadmap}
            className="px-3 py-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 border border-border text-xs text-text flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Journey</span>
          </button>

          <button
            type="button"
            onClick={handlePrevDay}
            disabled={!prevTaskItem}
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
              prevTaskItem
                ? 'bg-surface-1 hover:bg-surface-2 border-border text-text'
                : 'bg-surface-1/40 border-border/40 text-text-muted/40 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Prev Day</span>
          </button>

          <button
            type="button"
            onClick={handleNextDay}
            disabled={!nextTaskItem}
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
              nextTaskItem
                ? 'bg-surface-1 hover:bg-surface-2 border-border text-text'
                : 'bg-surface-1/40 border-border/40 text-text-muted/40 cursor-not-allowed'
            }`}
          >
            <span>Next Day</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── DAY HERO HEADER ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-surface-1 border border-border shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-accent-solid text-white shadow-xs">
                Day {dayNumber}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
                Phase {phaseIdx + 1}: {phaseTitle}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 border border-border text-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {estimatedMinutes || 60} Minutes
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 border border-border text-text-muted">
                {task.activityType || 'Interactive Learning'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              {task.title}
            </h1>

            {/* Description */}
            {task.description && (
              <p className="text-sm text-text-muted leading-relaxed max-w-3xl">
                {task.description}
              </p>
            )}
          </div>

          {/* Day Progress & Complete Action Card */}
          <div className="lg:w-72 shrink-0 p-4 rounded-xl bg-surface-2 border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text-muted uppercase tracking-wider">Day Progress</span>
              <span className={`font-mono ${isDayCompleted ? 'text-done font-bold' : 'text-accent'}`}>
                {dayProgressPct}%
              </span>
            </div>

            <ProgressBar value={dayProgressPct} height="h-2" />

            <div className="text-[11px] text-text-muted flex justify-between font-mono">
              <span>{completedCount} of {totalTopicsCount} topics done</span>
              {isDayCompleted && <span className="text-done font-semibold">Day Complete!</span>}
            </div>

            <button
              type="button"
              onClick={handleToggleDayComplete}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                isDayCompleted
                  ? 'bg-done/15 text-done border border-done/30 hover:bg-done/25'
                  : 'bg-accent-solid text-white hover:opacity-90'
              }`}
            >
              {isDayCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Day Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Mark Day as Complete</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Objectives Pill Bar */}
        {task.learningObjectives && Array.isArray(task.learningObjectives) && task.learningObjectives.length > 0 && (
          <div className="pt-4 border-t border-border flex items-start gap-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0 mt-0.5">
              Objectives:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {task.learningObjectives.map((obj, oIdx) => (
                <span
                  key={oIdx}
                  className="px-2.5 py-1 rounded-lg text-xs bg-surface-2 border border-border text-text font-medium"
                >
                  ✓ {obj}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── TOPIC ACCORDION LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <span>Study Topics ({dayTopics.length})</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Work through each topic's point-wise core concepts, practical examples, and practice drills.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAskAiAboutDay}
            className="px-3.5 py-1.5 rounded-xl bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Tutor about Day {dayNumber}</span>
          </button>
        </div>

        {loadingContent ? (
          <div className="p-12 text-center rounded-2xl bg-surface-1 border border-border space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-text-muted">Loading structured lesson modules...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayTopics.map((topicItem, tIdx) => {
              const isTopicDone = isDayCompleted || Boolean(completedSubtopics[topicItem.id]);
              const isExpanded = Boolean(expandedTopics[tIdx]);

              // Conditional code check: only show if valid non-empty code exists
              const hasCode = Boolean(
                topicItem.codeExample &&
                topicItem.codeExample.code &&
                typeof topicItem.codeExample.code === 'string' &&
                topicItem.codeExample.code.trim().length > 0 &&
                !/^(N\/A|none|no code available)$/i.test(topicItem.codeExample.code.trim())
              );

              // Practice questions & exercises (supports both new array format and legacy fallback)
              const conceptualQuestions = Array.isArray(topicItem.practice?.conceptualQuestions)
                ? topicItem.practice.conceptualQuestions
                : topicItem.practice?.conceptualQuestion
                ? [topicItem.practice.conceptualQuestion]
                : [];

              const handsOnDrills = Array.isArray(topicItem.practice?.handsOnExercises)
                ? topicItem.practice.handsOnExercises
                : Array.isArray(topicItem.practice?.exercises)
                ? topicItem.practice.exercises
                : [];

              const takeaways = Array.isArray(topicItem.takeaways) ? topicItem.takeaways.slice(0, 5) : [];

              return (
                <div
                  key={topicItem.id || tIdx}
                  className={`rounded-2xl transition-all duration-200 border overflow-hidden ${
                    isTopicDone
                      ? 'bg-surface-1 border-done/30 shadow-xs'
                      : isExpanded
                      ? 'bg-surface-1 border-accent/50 shadow-md ring-1 ring-accent/20'
                      : 'bg-surface-1 border-border hover:border-border-strong'
                  }`}
                >
                  {/* Topic Accordion Header */}
                  <div
                    onClick={() => toggleTopicAccordion(tIdx)}
                    className="p-5 bg-surface-2/60 hover:bg-surface-2 transition flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Topic Completion Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTopic(topicItem.id);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer ${
                          isTopicDone
                            ? 'bg-done text-surface-1 shadow-xs'
                            : 'bg-surface-1 border border-border text-text-muted hover:border-accent hover:text-accent'
                        }`}
                        title={isTopicDone ? 'Mark topic as unread' : 'Mark topic as complete'}
                        aria-label={`Mark topic ${topicItem.title} complete`}
                      >
                        {isTopicDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-3.5 h-3.5" />}
                      </button>

                      {/* Topic Title & Meta */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-accent">
                            Topic {tIdx + 1}
                          </span>
                          <span className="text-xs text-text-muted">·</span>
                          <span className="text-xs text-text-muted flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {topicItem.estimatedMinutes || 25}m
                          </span>
                        </div>
                        <h3 className={`text-base font-bold truncate ${isTopicDone ? 'text-text-muted line-through' : 'text-text'}`}>
                          {topicItem.title}
                        </h3>
                      </div>
                    </div>

                    {/* Right side: Ask AI Tutor & Accordion Chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAiAboutTopic(topicItem.title);
                        }}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 border border-border text-xs font-semibold text-text hover:text-accent transition cursor-pointer"
                        title="Chat with AI Tutor about this topic"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-accent" />
                        <span>Ask AI Tutor</span>
                      </button>

                      <div className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-1 transition">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Topic Expanded Content: 4 Refined Point-wise Sections */}
                  {isExpanded && (
                    <div className="p-6 space-y-6 border-t border-border">
                      {/* 1. Concept Explanation (Intro, Core Concepts, Mechanisms) */}
                      <div className="space-y-3">
                        <h4 className="text-[15px] sm:text-[16px] font-bold text-text flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-accent" />
                          <span>Core Concepts</span>
                        </h4>
                        <div className="p-5 sm:p-6 rounded-xl bg-surface-2/60 border border-border text-[14px] sm:text-[15px] leading-relaxed text-text space-y-4">
                          <SafeMarkdown content={topicItem.explanation} />
                        </div>
                      </div>

                      {/* 2. Practical Example (Conditional: Completely hidden if no code) */}
                      {hasCode && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[15px] sm:text-[16px] font-bold text-text flex items-center gap-2">
                              <Code className="w-4 h-4 text-accent" />
                              <span>Practical Example</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(topicItem.id, topicItem.codeExample.code)}
                              className="px-2.5 py-1 rounded-md text-xs bg-surface-2 hover:bg-surface-1 border border-border text-text-muted hover:text-text flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedCodeId === topicItem.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-done" />
                                  <span className="text-done font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Code Description */}
                          {topicItem.codeExample.description && (
                            <p className="text-[14px] text-text-muted leading-relaxed">
                              {topicItem.codeExample.description}
                            </p>
                          )}

                          <div className="rounded-xl overflow-hidden border border-border bg-[#0B0B14] shadow-sm">
                            <div className="px-4 py-2 bg-[#12121C] border-b border-border flex items-center justify-between text-xs text-text-muted">
                              <span className="font-mono text-accent font-semibold uppercase">
                                {topicItem.codeExample.language || 'code'}
                              </span>
                              <span className="text-[11px] truncate max-w-sm">
                                {topicItem.codeExample.title || 'Implementation'}
                              </span>
                            </div>
                            <pre className="p-4 text-xs font-mono text-[#F1F1FA] overflow-x-auto leading-relaxed">
                              <code>{topicItem.codeExample.code}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* 3. Practice Tasks & Assessment */}
                      {(conceptualQuestions.length > 0 || handsOnDrills.length > 0) && (
                        <div className="space-y-3">
                          <h4 className="text-[15px] sm:text-[16px] font-bold text-text flex items-center gap-2">
                            <Zap className="w-4 h-4 text-accent" />
                            <span>Practice & Assessment</span>
                          </h4>
                          <div className="p-4 sm:p-5 rounded-xl bg-surface-2 border border-border space-y-3 text-[14px]">
                            {/* Conceptual Questions */}
                            {conceptualQuestions.length > 0 && (
                              <div className="p-3.5 rounded-lg bg-surface-1 border border-border space-y-2">
                                <span className="font-semibold text-text flex items-center gap-1.5 text-[14px]">
                                  <HelpCircle className="w-4 h-4 text-accent" />
                                  Conceptual Questions:
                                </span>
                                <ul className="space-y-1.5 pl-5 text-text-muted list-disc text-[14px]">
                                  {conceptualQuestions.map((q, qIdx) => (
                                    <li key={qIdx} className="leading-relaxed">
                                      {q}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Hands-on Practice */}
                            {handsOnDrills.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="font-semibold text-text block text-[14px]">Hands-on Practice:</span>
                                <ul className="space-y-1.5 text-text-muted pl-1 text-[14px]">
                                  {handsOnDrills.map((ex, exIdx) => (
                                    <li key={exIdx} className="flex items-start gap-2">
                                      <span className="text-accent font-bold">›</span>
                                      <span className="leading-relaxed">{ex}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Key Takeaways */}
                      {takeaways.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[15px] sm:text-[16px] font-bold text-text flex items-center gap-2">
                            <Award className="w-4 h-4 text-accent" />
                            <span>Key Takeaways</span>
                          </h4>
                          <div className="p-4 sm:p-5 rounded-xl bg-done/5 border border-done/20 space-y-2">
                            <ul className="space-y-2 text-[14px] sm:text-[15px] text-text">
                              {takeaways.map((takeaway, tkIdx) => (
                                <li key={tkIdx} className="flex items-start gap-2.5">
                                  <Check className="w-4 h-4 text-done shrink-0 mt-0.5" />
                                  <span className="leading-relaxed">
                                    <SafeMarkdown content={takeaway} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions: Test Me & Toggle Topic */}
                      <div className="pt-2 flex items-center justify-between border-t border-border">
                        <button
                          type="button"
                          onClick={() => handleAskAiAboutTopic(topicItem.title)}
                          className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-1 border border-border text-xs text-text flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span>Ask AI Tutor to Test Me</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleTopic(topicItem.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isTopicDone
                              ? 'bg-done/15 text-done border border-done/30 hover:bg-done/25'
                              : 'bg-accent-solid text-white hover:opacity-90'
                          }`}
                        >
                          {isTopicDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Topic Completed</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5" />
                              <span>Mark Topic as Done</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAVIGATION FOOTER ── */}
      <div className="p-6 rounded-2xl bg-surface-1 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-text">
            {dayProgressPct === 100 ? '🎉 Day Complete!' : 'Keep Learning'}
          </h4>
          <p className="text-xs text-text-muted mt-0.5">
            {dayProgressPct === 100
              ? 'Great work! Proceed to the next day when you are ready.'
              : 'Complete all topics or practice exercises to advance your mastery.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToRoadmap}
            className="gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Roadmap Journey</span>
          </Button>

          {nextTaskItem && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNextDay}
              className="gap-1.5"
            >
              <span>Next: Day {nextTaskItem.dayNumber}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullPageDayView;
