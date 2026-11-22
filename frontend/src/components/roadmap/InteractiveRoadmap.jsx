import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Zap,
  Target,
  AlertCircle,
  Route,
  ListTree
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
import { RoadmapJourneyCanvas } from './RoadmapJourneyCanvas';
import { CurriculumTreeView } from './CurriculumTreeView';
import { FullPageDayView } from './FullPageDayView';

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

  // View mode: 'visual' (Node-based Subway Canvas) | 'tree' (Curriculum Tree)
  const [viewMode, setViewMode] = useState('visual');

  // Expansions state for AI deep dives
  const [expansionsCache, setExpansionsCache] = useState({});
  const [loadingExpansion, setLoadingExpansion] = useState(null);

  // Synchronize active roadmap ID in data context
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
          estimatedMinutes: task.estimatedMinutes || 60,
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

  // Choice Modes: Determine the "Up next" / Recommended Topic based on active mode
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
        (a, b) => (a.estimatedMinutes || 60) - (b.estimatedMinutes || 60)
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

  // Current learning phase title
  const currentPhaseTitle = useMemo(() => {
    if (nextRecommendedTask) {
      return nextRecommendedTask.phaseTitle;
    }
    return modules[0]?.phase?.phaseTitle || 'Phase 1';
  }, [nextRecommendedTask, modules]);

  // Toggle task completion with instant prerequisite unlocking
  const handleToggleTask = async (taskId, newCompleted) => {
    setSyncError(null);
    const targetRoadmapId = currentSavedId || effectiveId;

    if (!targetRoadmapId) {
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

  // Navigate to dedicated day view
  const handleSelectDay = (taskItem) => {
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

  // ── PART 2: DEDICATED FULL-PAGE DAY LEARNING VIEW ──
  // If URL has day parameter (e.g. #/roadmaps/123/day/4), render FullPageDayView directly!
  if (params.day) {
    return (
      <FullPageDayView
        roadmap={roadmap}
        roadmapId={currentSavedId || effectiveId || 1}
        dayNumber={Number(params.day)}
        allSequentialTasks={allSequentialTasks}
        completedTasks={completedTasks}
        onToggleComplete={handleToggleTask}
        onBackToJourney={() => navigate(`#/roadmaps/${currentSavedId || effectiveId || 1}`)}
      />
    );
  }

  // ── PART 1: VISUAL ROADMAP OVERVIEW ──
  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : 'max-w-6xl mx-auto pb-20'}`}>
      {/* Authoritative Sync Error Banner */}
      {syncError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-danger text-[13px] rounded-xl flex items-center gap-2" aria-live="polite">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* ── 1. MAIN ROADMAP INTERFACE HEADER ── */}
      <RoadmapOverview
        roadmap={roadmap}
        totalModules={modules.length}
        totalTopics={totalTopicsCount}
        completedTopicsCount={completedTopicsCount}
        progressPercentage={progressPercent}
        currentPhaseTitle={currentPhaseTitle}
        onBack={onBack}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        onCopyMarkdown={handleCopyMarkdown}
      />

      {/* ── 2. CONTROLS: ADAPTIVE LEARNING MODE & DUAL VIEW TOGGLE ── */}
      <div className="p-4 rounded-xl bg-surface-1 border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Adaptive Learning Mode */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Adaptive Learning Mode
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setChoiceMode('path')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                choiceMode === 'path'
                  ? 'bg-accent-solid text-white font-semibold shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text border border-border'
              }`}
              title="Linear sequential progression through prerequisites"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Follow the path</span>
            </button>

            <button
              type="button"
              onClick={() => setChoiceMode('quick-win')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                choiceMode === 'quick-win'
                  ? 'bg-accent-solid text-white font-semibold shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text border border-border'
              }`}
              title="Fastest available topics to maintain momentum"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick win</span>
            </button>

            <button
              type="button"
              onClick={() => setChoiceMode('interview')}
              className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                choiceMode === 'interview'
                  ? 'bg-accent-solid text-white font-semibold shadow-xs'
                  : 'bg-surface-2 text-text-muted hover:text-text border border-border'
              }`}
              title="Prioritizes core technical interview and assessment topics"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Interview prep</span>
            </button>
          </div>
        </div>

        {/* Dual View Toggle: Visual Journey vs Curriculum Tree */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-4">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
            View Style:
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[32px] ${
                viewMode === 'visual'
                  ? 'bg-accent-solid text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Visual Journey</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[32px] ${
                viewMode === 'tree'
                  ? 'bg-accent-solid text-white shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Curriculum Tree</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. "DO THIS NEXT" PROMINENT HERO ── */}
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
          onStartLearning={() => handleSelectDay(nextRecommendedTask)}
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

      {/* ── 4. ROADMAP DISPLAY: VISUAL JOURNEY CANVAS OR CURRICULUM TREE ── */}
      {viewMode === 'visual' ? (
        <RoadmapJourneyCanvas
          modules={modules}
          allSequentialTasks={allSequentialTasks}
          completedTasks={completedTasks}
          currentRecommendedTaskId={nextRecommendedTask?.taskId || null}
          roadmapId={currentSavedId || effectiveId || 1}
          roadmapTitle={roadmap.topic || roadmap.title}
          onSelectDay={handleSelectDay}
        />
      ) : (
        <CurriculumTreeView
          modules={modules}
          allSequentialTasks={allSequentialTasks}
          completedTasks={completedTasks}
          currentRecommendedTaskId={nextRecommendedTask?.taskId || null}
          roadmapId={currentSavedId || effectiveId || 1}
          onToggleComplete={handleToggleTask}
        />
      )}
    </div>
  );
};

export default InteractiveRoadmap;
