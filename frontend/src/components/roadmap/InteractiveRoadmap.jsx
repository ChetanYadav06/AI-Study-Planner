import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import {
  getSavedRoadmapById,
  expandTopic
} from '../../services/api';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { NotFoundView } from '../common/NotFoundView';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { RoadmapOverview } from './RoadmapOverview';
import { NextStepHero } from './NextStepHero';
import { LearningPathModule } from './LearningPathModule';
import { TopicDetailDrawer } from './TopicDetailDrawer';

export const InteractiveRoadmap = ({
  roadmap: initialRoadmap = null,
  goal = null,
  savedRoadmapId = null,
  onSyncGoalProgress,
  onRegenerate,
  onBack,
  onProgressUpdate,
  isModal = false
}) => {
  const { params, navigate } = useRouter();
  const { toggleTaskCompletion, activeRoadmapId, setActiveRoadmapId } = useData();

  const effectiveId = savedRoadmapId || activeRoadmapId;
  const [loading, setLoading] = useState(Boolean(effectiveId));
  const [notFound, setNotFound] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(effectiveId ? null : initialRoadmap);
  const [completedTasks, setCompletedTasks] = useState({});
  const [serverProgress, setServerProgress] = useState(0);
  const [syncError, setSyncError] = useState(null);

  const [regenerating, setRegenerating] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState(effectiveId);

  // Choice mode: 'path' (Follow the path) | 'quick-win' (Quick win) | 'interview' (Interview prep)
  const [choiceMode, setChoiceMode] = useState('path');

  // Drawer detail state
  const [selectedTaskItem, setSelectedTaskItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Expansions state for AI deep dives
  const [expansionsCache, setExpansionsCache] = useState({});
  const [loadingExpansion, setLoadingExpansion] = useState(null);

  // Auto-scroll ref flag
  const hasAutoScrolled = useRef(false);

  // Keep single source of truth: synchronize active roadmap ID in data context
  useEffect(() => {
    if (effectiveId && setActiveRoadmapId) {
      setActiveRoadmapId(effectiveId);
    }
  }, [effectiveId, setActiveRoadmapId]);

  // Fetch authoritative roadmap data from server on mount or when effectiveId changes
  useEffect(() => {
    if (!effectiveId) {
      if (initialRoadmap) {
        setActiveRoadmap(initialRoadmap);
        let ids = [];
        try {
          if (initialRoadmap.completedTasksJson) {
            ids = JSON.parse(initialRoadmap.completedTasksJson);
          }
        } catch {
          ids = [];
        }
        const map = (Array.isArray(ids) ? ids : []).reduce((acc, id) => ({ ...acc, [id]: true }), {});
        setCompletedTasks(map);
        setServerProgress(initialRoadmap.progressPercentage || 0);
      }
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    getSavedRoadmapById(effectiveId)
      .then((data) => {
        if (!isMounted) return;
        try {
          const parsed = JSON.parse(data.roadmapJson);
          parsed.id = data.id;
          parsed.goalId = data.goalId;
          setActiveRoadmap(parsed);
          setCurrentSavedId(data.id);

          let ids = [];
          if (data.completedTasksJson) {
            try {
              ids = JSON.parse(data.completedTasksJson);
            } catch {
              ids = [];
            }
          }
          const map = (Array.isArray(ids) ? ids : []).reduce((acc, id) => ({ ...acc, [id]: true }), {});
          setCompletedTasks(map);
          setServerProgress(data.progressPercentage || 0);
        } catch (e) {
          console.error('Failed to parse roadmap JSON from server:', e);
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch roadmap by ID:', err);
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveId, initialRoadmap]);

  const roadmap = activeRoadmap || initialRoadmap;

  // Flatten all daily tasks into a sequential learning journey
  const { modules, allSequentialTasks } = useMemo(() => {
    if (!roadmap || !roadmap.phases) {
      return { modules: [], allSequentialTasks: [] };
    }

    const phases = roadmap.phases || [];
    const flatList = [];

    const builtModules = phases.map((phase, pIdx) => {
      const dailyTasks = phase.dailyTasks || [];
      const suffixCounts = {};

      const moduleTasks = dailyTasks.map((task, tIdx) => {
        const taskId = getCanonicalTaskId(pIdx, task, tIdx, suffixCounts);
        const dayNumber = Number(task.dayNumber) || (flatList.length + 1);

        const item = {
          taskId,
          dayNumber,
          phaseIdx: pIdx,
          phaseTitle: phase.phaseTitle || phase.phase || `Phase ${pIdx + 1}`,
          task,
          estimatedMinutes: task.estimatedMinutes || 30,
          sequenceIndex: flatList.length
        };
        flatList.push(item);
        return item;
      });

      return {
        phase,
        phaseIndex: pIdx,
        tasks: moduleTasks
      };
    });

    return { modules: builtModules, allSequentialTasks: flatList };
  }, [roadmap]);

  // Total topics & completed counts
  const totalTopicsCount = allSequentialTasks.length;
  const completedTopicsCount = useMemo(() => {
    return allSequentialTasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
  }, [allSequentialTasks, completedTasks]);

  // Overall calculated progress %
  const progressPercent = useMemo(() => {
    if (totalTopicsCount === 0) return serverProgress;
    return Math.min(100, Math.round((completedTopicsCount / totalTopicsCount) * 100));
  }, [completedTopicsCount, totalTopicsCount, serverProgress]);

  // Choice Modes (B4): Determine the "Up next" / Recommended Topic based on active mode
  const nextRecommendedTask = useMemo(() => {
    if (allSequentialTasks.length === 0) return null;

    // A topic is unlocked (ready) if it is index 0 OR the prerequisite (index - 1) is completed
    const unlockedUncompleted = allSequentialTasks.filter((t, idx) => {
      if (completedTasks[t.taskId]) return false;
      if (idx === 0) return true;
      const prevTask = allSequentialTasks[idx - 1];
      return Boolean(completedTasks[prevTask.taskId]);
    });

    if (unlockedUncompleted.length === 0) {
      // All unlocked are completed or roadmap is 100% complete
      return allSequentialTasks.find((t) => !completedTasks[t.taskId]) || allSequentialTasks[0];
    }

    // Mode 2: Quick Win (shortest uncompleted topic among all unlocked topics)
    if (choiceMode === 'quick-win') {
      const sortedByDuration = [...unlockedUncompleted].sort(
        (a, b) => (a.estimatedMinutes || 30) - (b.estimatedMinutes || 30)
      );
      return sortedByDuration[0];
    }

    // Mode 3: Interview Prep (prioritize interview or core fundamentals topics)
    if (choiceMode === 'interview') {
      const INTERVIEW_REGEX = /(interview|algorithm|system design|data structure|complexity|pattern|concurrency|sql|leetcode|tree|graph|dynamic programming|database|cache|index|oop|solid|network|http|security)/i;
      const match = unlockedUncompleted.find((t) => {
        const titleMatch = INTERVIEW_REGEX.test(t.task?.title || '');
        const descMatch = INTERVIEW_REGEX.test(t.task?.description || '');
        const actMatch = (t.task?.activityType || '').toUpperCase().includes('ASSESSMENT') ||
                         (t.task?.activityType || '').toUpperCase().includes('QUIZ');
        return titleMatch || descMatch || actMatch;
      });
      if (match) return match;
    }

    // Mode 1: Follow the Path (standard linear progression)
    return unlockedUncompleted[0];
  }, [allSequentialTasks, completedTasks, choiceMode]);

  // Upcoming topics in sequence (next 1-2 topics after the recommended topic)
  const upcomingInSequence = useMemo(() => {
    if (!nextRecommendedTask) return [];
    const currentIdx = nextRecommendedTask.sequenceIndex;
    return allSequentialTasks.slice(currentIdx + 1, currentIdx + 3);
  }, [nextRecommendedTask, allSequentialTasks]);

  // Auto-scroll to module containing the "Up next" topic on page load (B3)
  useEffect(() => {
    if (!loading && nextRecommendedTask && !hasAutoScrolled.current) {
      const targetElement = document.getElementById(`module-section-${nextRecommendedTask.phaseIdx}`);
      if (targetElement) {
        hasAutoScrolled.current = true;
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [loading, nextRecommendedTask]);

  // If URL has day parameter (e.g. #/roadmaps/123/day/4), open drawer for that task
  useEffect(() => {
    if (params.day && allSequentialTasks.length > 0) {
      const targetDay = Number(params.day);
      const match = allSequentialTasks.find((t) => t.dayNumber === targetDay);
      if (match) {
        setSelectedTaskItem(match);
        setIsDrawerOpen(true);
      }
    }
  }, [params.day, allSequentialTasks]);

  // Toggle task completion with instant prerequisite unlocking (B3)
  const handleToggleTask = async (taskId, newCompleted) => {
    setSyncError(null);
    const targetRoadmapId = currentSavedId || effectiveId;

    if (!targetRoadmapId) {
      // In-memory fallback
      setCompletedTasks((prev) => {
        const next = { ...prev };
        if (newCompleted) next[taskId] = true;
        else delete next[taskId];
        return next;
      });
      return;
    }

    try {
      const response = await toggleTaskCompletion(targetRoadmapId, taskId, newCompleted);
      const updatedMap = (response.completedTaskIds || []).reduce(
        (acc, id) => ({ ...acc, [id]: true }),
        {}
      );
      setCompletedTasks(updatedMap);
      setServerProgress(response.progressPercentage);
      if (onProgressUpdate) onProgressUpdate(response.progressPercentage);
    } catch (err) {
      console.error('Failed toggling task completion:', err);
      setSyncError(err.message || 'Could not update task completion on server.');
    }
  };

  // Expand topic via AI Deep Dive
  const handleExpandTopic = async (topicTitle, level = 1) => {
    const targetRoadmapId = currentSavedId || effectiveId;
    if (!targetRoadmapId) return;

    const cacheKey = `${topicTitle}_${level}`;
    setLoadingExpansion(cacheKey);

    try {
      const dayNum = selectedTaskItem ? selectedTaskItem.dayNumber : 1;
      const res = await expandTopic(targetRoadmapId, dayNum, {
        topicTitle,
        level,
        roadmapContext: roadmap?.topic || roadmap?.title || ''
      });

      setExpansionsCache((prev) => ({
        ...prev,
        [topicTitle]: {
          ...(prev[topicTitle] || {}),
          [level]: res.markdownContent || res.content || ''
        }
      }));
    } catch (e) {
      console.error('Failed to expand topic:', e);
    } finally {
      setLoadingExpansion(null);
    }
  };

  // Open drawer for a specific topic
  const handleSelectTopic = (taskItem) => {
    setSelectedTaskItem(taskItem);
    setIsDrawerOpen(true);
    if (taskItem?.dayNumber) {
      navigate(`#/roadmaps/${currentSavedId || effectiveId || 1}/day/${taskItem.dayNumber}`);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = () => {
    if (!roadmap) return;
    let md = `# ${roadmap.topic || roadmap.title}\n\n`;
    if (roadmap.description) md += `${roadmap.description}\n\n`;

    modules.forEach(({ phase, phaseIndex, tasks }) => {
      md += `## Phase ${phaseIndex + 1}: ${phase.phaseTitle || phase.phase}\n\n`;
      tasks.forEach((t) => {
        const isDone = Boolean(completedTasks[t.taskId]);
        md += `- [${isDone ? 'x' : ' '}] Day ${t.dayNumber}: ${t.task.title} (${t.estimatedMinutes}m)\n`;
        if (t.task.description) md += `  ${t.task.description}\n`;
      });
      md += '\n';
    });

    navigator.clipboard?.writeText?.(md);
  };

  if (notFound) {
    return <NotFoundView message="The roadmap you are looking for does not exist or has been removed." />;
  }

  if (loading && !roadmap) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-text-muted font-medium">Loading interactive study journey...</p>
      </div>
    );
  }

  if (!roadmap) {
    return null;
  }

  // Prev / Next item for drawer
  const currentIdx = selectedTaskItem ? selectedTaskItem.sequenceIndex : -1;
  const prevTaskItem = currentIdx > 0 ? allSequentialTasks[currentIdx - 1] : null;
  const nextTaskItem = currentIdx >= 0 && currentIdx < allSequentialTasks.length - 1 ? allSequentialTasks[currentIdx + 1] : null;

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : 'max-w-6xl mx-auto pb-20'}`}>
      {/* Authoritative Sync Error Banner */}
      {syncError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-danger text-[13px] rounded-xl flex items-center gap-2" aria-live="polite">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* ── 1. ROADMAP OVERVIEW HEADER ── */}
      <RoadmapOverview
        roadmap={roadmap}
        totalModules={modules.length}
        totalTopics={totalTopicsCount}
        completedTopicsCount={completedTopicsCount}
        progressPercentage={progressPercent}
        onBack={onBack}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        onCopyMarkdown={handleCopyMarkdown}
      />

      {/* ── 2. CHOICE MODES CONTROLS (B4) ── */}
      <div className="p-4 rounded-xl bg-surface-1 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            Adaptive Learning Mode
          </span>
          <p className="text-xs text-text-muted">
            {choiceMode === 'path' && 'Following linear prerequisites from foundational principles to advanced application.'}
            {choiceMode === 'quick-win' && 'Highlighting the fastest uncompleted topics among all unlocked concepts.'}
            {choiceMode === 'interview' && 'Prioritizing algorithms, system design, and core interview fundamentals.'}
          </p>
        </div>

        {/* 3 Mode Toggle Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-2 border border-border shrink-0">
          <button
            type="button"
            onClick={() => setChoiceMode('path')}
            className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              choiceMode === 'path'
                ? 'bg-accent-solid text-white font-semibold shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
            title="Linear sequential progression through prerequisites"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Follow the path</span>
          </button>

          <button
            type="button"
            onClick={() => setChoiceMode('quick-win')}
            className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              choiceMode === 'quick-win'
                ? 'bg-accent-solid text-white font-semibold shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
            title="Fastest available topics to maintain momentum"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick win</span>
          </button>

          <button
            type="button"
            onClick={() => setChoiceMode('interview')}
            className={`px-3 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
              choiceMode === 'interview'
                ? 'bg-accent-solid text-white font-semibold shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
            title="Prioritizes core technical interview and assessment topics"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Interview prep</span>
          </button>
        </div>
      </div>

      {/* ── 3. "DO THIS NEXT" PROMINENT HERO (B2 & B5) ── */}
      {nextRecommendedTask && (
        <NextStepHero
          task={nextRecommendedTask.task}
          taskItem={nextRecommendedTask}
          phaseTitle={nextRecommendedTask.phaseTitle}
          phaseIndex={nextRecommendedTask.phaseIdx}
          isCompleted={Boolean(completedTasks[nextRecommendedTask.taskId])}
          prerequisiteTask={
            nextRecommendedTask.sequenceIndex > 0
              ? allSequentialTasks[nextRecommendedTask.sequenceIndex - 1]?.task
              : null
          }
          isPrerequisiteMet={
            nextRecommendedTask.sequenceIndex === 0 ||
            Boolean(
              completedTasks[
                allSequentialTasks[nextRecommendedTask.sequenceIndex - 1]?.taskId
              ]
            )
          }
          dailyPaceHours={roadmap.hoursPerDay || 2}
          upcomingTasks={upcomingInSequence}
          isZeroProgress={completedTopicsCount === 0}
          onStartLearning={() => handleSelectTopic(nextRecommendedTask)}
          onToggleCompleted={() =>
            handleToggleTask(
              nextRecommendedTask.taskId,
              !completedTasks[nextRecommendedTask.taskId]
            )
          }
          onAskAi={() =>
            navigate(
              `#/ai-assistant?topic=${encodeURIComponent(
                nextRecommendedTask.task.title
              )}`
            )
          }
        />
      )}

      {/* ── 4. INTERACTIVE LEARNING PATH (MODULE BY MODULE) (B3) ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-xl font-bold text-text tracking-tight">
              Curriculum Modules & Learning Sequence
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Completed modules collapse automatically. Exactly 4 visible topic states: Done, Up next, Ready, and Locked.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted font-medium">
            {completedTopicsCount} / {totalTopicsCount} Done
          </span>
        </div>

        {modules.map(({ phase, phaseIndex, tasks }) => (
          <LearningPathModule
            key={phaseIndex}
            id={`module-section-${phaseIndex}`}
            phase={phase}
            phaseIndex={phaseIndex}
            tasks={tasks}
            completedTasks={completedTasks}
            currentRecommendedTaskId={nextRecommendedTask?.taskId || null}
            allSequentialTasks={allSequentialTasks}
            onSelectTopic={handleSelectTopic}
            onToggleComplete={handleToggleTask}
          />
        ))}
      </div>

      {/* ── 5. RIGHT-SIDE TOPIC DETAIL DRAWER ── */}
      <TopicDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTaskItem(null);
        }}
        taskItem={selectedTaskItem}
        isCompleted={Boolean(selectedTaskItem && completedTasks[selectedTaskItem.taskId])}
        prerequisiteItem={prevTaskItem}
        prevItem={prevTaskItem}
        nextItem={nextTaskItem}
        onToggleComplete={handleToggleTask}
        onSelectTopic={handleSelectTopic}
        roadmapId={currentSavedId || effectiveId}
        onExpandTopic={handleExpandTopic}
        expansions={expansionsCache}
        loadingExpansion={loadingExpansion}
      />
    </div>
  );
};

export default InteractiveRoadmap;
