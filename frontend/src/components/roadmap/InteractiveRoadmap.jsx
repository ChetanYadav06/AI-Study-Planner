import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Compass,
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
  const { toggleTaskCompletion } = useData();

  const [loading, setLoading] = useState(Boolean(savedRoadmapId));
  const [notFound, setNotFound] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(savedRoadmapId ? null : initialRoadmap);
  const [completedTasks, setCompletedTasks] = useState({});
  const [serverProgress, setServerProgress] = useState(0);
  const [syncError, setSyncError] = useState(null);

  const [regenerating, setRegenerating] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState(savedRoadmapId);

  // Drawer detail state
  const [selectedTaskItem, setSelectedTaskItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Expansions state for AI deep dives
  const [expansionsCache, setExpansionsCache] = useState({});
  const [loadingExpansion, setLoadingExpansion] = useState(null);

  // Fetch authoritative roadmap data from server on mount or when savedRoadmapId changes
  useEffect(() => {
    if (!savedRoadmapId) {
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

    getSavedRoadmapById(savedRoadmapId)
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
  }, [savedRoadmapId, initialRoadmap]);

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

  // Next recommended task (first uncompleted task in sequence)
  const nextRecommendedTask = useMemo(() => {
    return allSequentialTasks.find((t) => !completedTasks[t.taskId]) || allSequentialTasks[0] || null;
  }, [allSequentialTasks, completedTasks]);

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

  // Toggle task completion
  const handleToggleTask = async (taskId, newCompleted) => {
    setSyncError(null);
    const targetRoadmapId = currentSavedId || savedRoadmapId;

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
    const targetRoadmapId = currentSavedId || savedRoadmapId;
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
      navigate(`#/roadmaps/${currentSavedId || savedRoadmapId || 1}/day/${taskItem.dayNumber}`);
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
        <p className="text-sm text-muted font-medium">Loading interactive study journey...</p>
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

      {/* ── 2. "YOUR NEXT STEP" PROMINENT HERO ── */}
      {nextRecommendedTask && (
        <NextStepHero
          task={nextRecommendedTask.task}
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

      {/* ── 3. INTERACTIVE LEARNING PATH (MODULE BY MODULE) ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h2 className="text-xl font-bold text-ink tracking-tight">
              Curriculum Modules & Learning Sequence
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Connected topics structured in pedagogical order from foundation to advanced application.
            </p>
          </div>
          <span className="text-xs font-mono text-muted">
            {completedTopicsCount} / {totalTopicsCount} Done
          </span>
        </div>

        {modules.map(({ phase, phaseIndex, tasks }) => (
          <LearningPathModule
            key={phaseIndex}
            phase={phase}
            phaseIndex={phaseIndex}
            tasks={tasks}
            completedTasks={completedTasks}
            currentRecommendedTaskId={nextRecommendedTask?.taskId || null}
            onSelectTopic={handleSelectTopic}
            onToggleComplete={handleToggleTask}
          />
        ))}
      </div>

      {/* ── 4. RIGHT-SIDE TOPIC DETAIL DRAWER ── */}
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
        roadmapId={currentSavedId || savedRoadmapId}
        onExpandTopic={handleExpandTopic}
        expansions={expansionsCache}
        loadingExpansion={loadingExpansion}
      />
    </div>
  );
};

export default InteractiveRoadmap;
