import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Save,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import {
  updateRoadmapProgress,
  saveRoadmap,
  getDayPlan,
  expandTopic,
  suggestExtraTopics,
  deleteTopicExpansion,
  deleteExtraTopic,
  getDayTopicsAndExpansions
} from '../../services/api';
import { formatEnum } from '../../utils/formatters';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusText } from '../ui/StatusText';
import { ProgressBar } from '../ui/ProgressBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PhaseList } from './PhaseList';
import { DayDetail } from './DayDetail';

export const InteractiveRoadmap = ({
  roadmap,
  goal,
  savedRoadmapId = null,
  onSyncGoalProgress,
  onRegenerate,
  onBack,
  onProgressUpdate,
  isModal = false,
  // Optional 7C hooks
  onExpandTopic = null,
  topicExpansions = {},
  loadingExpansion = null
}) => {
  if (!roadmap) return null;

  const stableId = savedRoadmapId || roadmap.id || `${roadmap.topic}_${roadmap.targetDays}`;
  const storageKey = `ai_roadmap_progress_${stableId}`;
  const blocksStorageKey = `ai_roadmap_blocks_${stableId}`;

  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState(savedRoadmapId);
  const [cloudSynced, setCloudSynced] = useState(Boolean(savedRoadmapId));
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute canonical tasks and phases
  const { allTasks, totalTasksCount, tasksByPhase } = useMemo(() => {
    const tasks = [];
    const byPhase = {};

    roadmap.phases?.forEach((phase, pIdx) => {
      const suffixCounts = {};
      const phaseTasksList = [];

      phase.dailyTasks?.forEach((task, tIdx) => {
        const item = {
          id: getCanonicalTaskId(pIdx, task, tIdx, suffixCounts),
          phaseIdx: pIdx,
          phaseTitle: phase.phaseTitle || phase.phase,
          phaseDuration: phase.duration,
          task
        };
        tasks.push(item);
        phaseTasksList.push(item);
      });

      byPhase[pIdx] = phaseTasksList;
    });

    return {
      allTasks: tasks,
      totalTasksCount: tasks.length,
      tasksByPhase: byPhase
    };
  }, [roadmap]);

  // Initial load from roadmap object or localStorage
  const [completedTasks, setCompletedTasks] = useState(() => {
    if (roadmap.completedTasksJson) {
      try {
        const tasks = JSON.parse(roadmap.completedTasksJson);
        return Array.isArray(tasks)
          ? tasks.reduce((acc, id) => ({ ...acc, [id]: true }), {})
          : tasks;
      } catch (e) {
        console.warn('Error parsing roadmap json progress', e);
      }
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.completedTasks || parsed;
      }
    } catch (e) {
      console.warn('Error reading localStorage progress', e);
    }
    return {};
  });

  // Local state for completed timeline blocks
  const [completedBlocks, setCompletedBlocks] = useState(() => {
    try {
      const saved = localStorage.getItem(blocksStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Hash-based day selection (#day-N)
  const [selectedDayNumber, setSelectedDayNumber] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/^#day-(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 1 && parsed <= (roadmap.targetDays || 365)) {
          return parsed;
        }
      }
    }
    return 1;
  });

  // Keep URL hash in sync with selectedDayNumber
  const handleSelectDay = useCallback((dayNum) => {
    setSelectedDayNumber(dayNum);
    if (typeof window !== 'undefined') {
      window.location.hash = `day-${dayNum}`;
    }
  }, []);

  // Listen to hashchange events
  useEffect(() => {
    const handleHashChange = () => {
      const match = window.location.hash.match(/^#day-(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 1 && parsed <= (roadmap.targetDays || 365)) {
          setSelectedDayNumber(parsed);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [roadmap.targetDays]);

  // Keyboard navigation: ArrowUp/ArrowDown changes day
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedDayNumber > 1) {
          handleSelectDay(selectedDayNumber - 1);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedDayNumber < totalTasksCount) {
          handleSelectDay(selectedDayNumber + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDayNumber, totalTasksCount, handleSelectDay]);

  // Day plan fetch state
  const [dayPlanCache, setDayPlanCache] = useState({});
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    if (!currentSavedId) return;
    if (dayPlanCache[selectedDayNumber]) return;

    let isMounted = true;
    setLoadingPlan(true);

    getDayPlan(currentSavedId, selectedDayNumber)
      .then((plan) => {
        if (isMounted) {
          setDayPlanCache(prev => ({ ...prev, [selectedDayNumber]: plan }));
        }
      })
      .catch((err) => {
        console.warn(`Could not fetch day plan for day ${selectedDayNumber}:`, err);
      })
      .finally(() => {
        if (isMounted) setLoadingPlan(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSavedId, selectedDayNumber, dayPlanCache]);

  // Topic Expansions and Extra Topics state
  const [dayTopicsCache, setDayTopicsCache] = useState({});
  const [loadingExpansionState, setLoadingExpansionState] = useState(null);
  const [suggestingExtra, setSuggestingExtra] = useState(false);
  const [topicError, setTopicError] = useState(null);

  // Fetch expansions and extra topics when day or savedId changes
  useEffect(() => {
    if (!currentSavedId) return;
    if (dayTopicsCache[selectedDayNumber]) return;

    let isMounted = true;
    getDayTopicsAndExpansions(currentSavedId, selectedDayNumber)
      .then((data) => {
        if (isMounted && data) {
          setDayTopicsCache(prev => ({
            ...prev,
            [selectedDayNumber]: data
          }));
        }
      })
      .catch((err) => {
        console.warn(`Could not fetch topics and expansions for day ${selectedDayNumber}:`, err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSavedId, selectedDayNumber, dayTopicsCache]);

  const handleExpandTopic = async (topicTitle, level) => {
    if (!currentSavedId) return;
    const loadKey = `${topicTitle}_${level}`;
    setLoadingExpansionState(loadKey);
    setTopicError(null);

    try {
      const res = await expandTopic(currentSavedId, selectedDayNumber, { topicTitle, level });
      if (res && res.markdownContent) {
        setDayTopicsCache(prev => {
          const currentDayData = prev[selectedDayNumber] || {
            dayNumber: selectedDayNumber,
            baseTopics: [],
            extraTopics: [],
            expansions: {}
          };
          const currentExpansions = { ...currentDayData.expansions };
          const topicMap = { ...(currentExpansions[topicTitle] || {}) };
          topicMap[level] = res.markdownContent;
          currentExpansions[topicTitle] = topicMap;

          return {
            ...prev,
            [selectedDayNumber]: {
              ...currentDayData,
              expansions: currentExpansions
            }
          };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to expand topic.';
      setTopicError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoadingExpansionState(null);
    }
  };

  const handleDeleteExpansion = async (topicTitle, level) => {
    if (!currentSavedId) return;
    try {
      await deleteTopicExpansion(currentSavedId, selectedDayNumber, topicTitle, level);
      setDayTopicsCache(prev => {
        const currentDayData = prev[selectedDayNumber];
        if (!currentDayData) return prev;

        const currentExpansions = { ...currentDayData.expansions };
        const topicMap = { ...(currentExpansions[topicTitle] || {}) };
        if (level === 1) {
          delete currentExpansions[topicTitle];
        } else {
          delete topicMap[level];
          currentExpansions[topicTitle] = topicMap;
        }

        return {
          ...prev,
          [selectedDayNumber]: {
            ...currentDayData,
            expansions: currentExpansions
          }
        };
      });
    } catch (err) {
      console.warn('Failed to delete expansion:', err);
    }
  };

  const handleSuggestExtraTopics = async () => {
    if (!currentSavedId) return;
    setSuggestingExtra(true);
    setTopicError(null);
    try {
      const extras = await suggestExtraTopics(currentSavedId, selectedDayNumber);
      if (extras && extras.length > 0) {
        setDayTopicsCache(prev => {
          const currentDayData = prev[selectedDayNumber] || {
            dayNumber: selectedDayNumber,
            baseTopics: [],
            extraTopics: [],
            expansions: {}
          };
          const existingExtras = currentDayData.extraTopics || [];
          return {
            ...prev,
            [selectedDayNumber]: {
              ...currentDayData,
              extraTopics: [...existingExtras, ...extras]
            }
          };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to suggest extra topics.';
      setTopicError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSuggestingExtra(false);
    }
  };

  const handleDeleteExtraTopic = async (extraId) => {
    if (!currentSavedId) return;
    try {
      await deleteExtraTopic(currentSavedId, selectedDayNumber, extraId);
      setDayTopicsCache(prev => {
        const currentDayData = prev[selectedDayNumber];
        if (!currentDayData) return prev;
        return {
          ...prev,
          [selectedDayNumber]: {
            ...currentDayData,
            extraTopics: (currentDayData.extraTopics || []).filter(e => e.id !== extraId)
          }
        };
      });
    } catch (err) {
      console.warn('Failed to delete extra topic:', err);
    }
  };

  // Completed count and canonical progress percentage
  const completedTasksCount = useMemo(() => {
    return allTasks.filter(item => completedTasks[item.id]).length;
  }, [allTasks, completedTasks]);

  const progressPercent = useMemo(() => {
    if (totalTasksCount === 0) return 0;
    return Math.min(100, Math.round((completedTasksCount / totalTasksCount) * 100));
  }, [completedTasksCount, totalTasksCount]);

  // Next recommended action (first uncompleted day task)
  const nextRecommendedAction = useMemo(() => {
    for (const item of allTasks) {
      if (!completedTasks[item.id]) {
        return item;
      }
    }
    return null;
  }, [allTasks, completedTasks]);

  // Sync progress changes to MySQL & localStorage
  const syncProgress = async (newCompletedTasks) => {
    setCompletedTasks(newCompletedTasks);

    try {
      localStorage.setItem(storageKey, JSON.stringify({ completedTasks: newCompletedTasks }));
    } catch (e) {
      console.error('Failed to write progress to localStorage', e);
    }

    const tIds = Object.keys(newCompletedTasks).filter(k => newCompletedTasks[k]);
    const newPercent = totalTasksCount > 0 ? Math.min(100, Math.round((tIds.length / totalTasksCount) * 100)) : 0;

    if (currentSavedId) {
      try {
        await updateRoadmapProgress(currentSavedId, {
          completedTasksJson: JSON.stringify(tIds),
          completedMilestonesJson: '[]',
          progressPercentage: newPercent
        });
        setCloudSynced(true);
      } catch (err) {
        console.warn('Backend progress sync failed, falling back to local:', err);
      }
    }

    if (onProgressUpdate) {
      onProgressUpdate(newPercent);
    }
    if (onSyncGoalProgress && goal?.id) {
      onSyncGoalProgress(goal.id, newPercent);
    }
  };

  const handleToggleTask = (taskId) => {
    const nextVal = !completedTasks[taskId];
    const updated = {
      ...completedTasks,
      [taskId]: nextVal
    };
    syncProgress(updated);
  };

  const handleToggleBlock = (blockIdx) => {
    const key = `${selectedDayNumber}-${blockIdx}`;
    const nextVal = !completedBlocks[key];
    const updated = { ...completedBlocks, [key]: nextVal };
    setCompletedBlocks(updated);
    try {
      localStorage.setItem(blocksStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save block completion', e);
    }
  };

  // Cloud save
  const handleSaveToCloud = async () => {
    if (savingToCloud) return;
    setSavingToCloud(true);
    try {
      const tIds = Object.keys(completedTasks).filter(k => completedTasks[k]);
      const res = await saveRoadmap({
        goalId: goal?.id || null,
        title: roadmap.topic,
        topic: roadmap.topic,
        skillLevel: roadmap.skillLevel || 'INTERMEDIATE',
        targetDays: roadmap.targetDays,
        hoursPerDay: roadmap.hoursPerDay,
        roadmapJson: JSON.stringify(roadmap)
      });

      if (res && res.id) {
        setCurrentSavedId(res.id);
        setCloudSynced(true);

        await updateRoadmapProgress(res.id, {
          completedTasksJson: JSON.stringify(tIds),
          completedMilestonesJson: '[]',
          progressPercentage: progressPercent
        });
      }
    } catch (err) {
      console.error('Failed to save roadmap to backend:', err);
    } finally {
      setSavingToCloud(false);
    }
  };

  // Export Markdown
  const handleCopyMarkdown = () => {
    if (!roadmap) return;
    const text = `# ${roadmap.topic} Study Roadmap\nTarget: ${roadmap.targetDays} Days (${roadmap.hoursPerDay}h/day)\n\n${roadmap.overview || ''}\n\n` +
      (roadmap.phases || []).map(p => `## ${p.phaseTitle || p.phase}\n` + (p.dailyTasks || []).map(t => `- Day ${t.dayNumber}: ${t.title} (${t.activityType || 'Study'})`).join('\n')).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Find active task item and phase
  const selectedTaskItem = useMemo(() => {
    return allTasks.find(t => t.task.dayNumber === selectedDayNumber) || allTasks[0] || null;
  }, [allTasks, selectedDayNumber]);

  const selectedPhase = useMemo(() => {
    if (!selectedTaskItem || !roadmap.phases) return null;
    return roadmap.phases[selectedTaskItem.phaseIdx] || null;
  }, [roadmap.phases, selectedTaskItem]);

  // Active day's plan from cache or synthesized fallback
  const activeDayPlan = useMemo(() => {
    if (dayPlanCache[selectedDayNumber]) {
      return dayPlanCache[selectedDayNumber];
    }
    if (!selectedTaskItem) return null;

    const task = selectedTaskItem.task;
    const dailyMinutes = task.estimatedMinutes || Math.round((roadmap.hoursPerDay || 2) * 60);

    // Fallback block generation matching backend invariant
    const warmup = 15;
    const review = 15;
    const remaining = Math.max(0, dailyMinutes - (warmup + review));
    const learn = Math.floor(remaining / 2);
    const practice = remaining - learn;

    return {
      dayNumber: selectedDayNumber,
      dailyMinutes,
      activityType: task.activityType || 'LEARNING',
      topics: task.topics || (task.subtopics || []).map(st => ({
        title: typeof st === 'string' ? st : st.title,
        summary: typeof st === 'string' ? '' : st.summary
      })),
      blocks: [
        { kind: 'WARMUP', minutes: warmup, description: 'Review prerequisites and set learning goals.' },
        { kind: 'LEARN', minutes: learn, description: `Study concepts for ${task.title}.` },
        { kind: 'PRACTICE', minutes: practice, description: 'Hands-on coding exercises and implementation.' },
        { kind: 'REVIEW', minutes: review, description: 'Knowledge review and self-test verification.' }
      ]
    };
  }, [dayPlanCache, selectedDayNumber, selectedTaskItem, roadmap.hoursPerDay]);

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : 'max-w-7xl mx-auto pb-16'}`}>
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBack ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="gap-1.5 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Roadmaps</span>
          </Button>
        ) : <div />}

        <div className="flex items-center gap-2 self-end">
          {cloudSynced ? (
            <StatusText status="success">
              Saved to database
            </StatusText>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveToCloud}
              disabled={savingToCloud}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingToCloud ? 'Saving...' : 'Save to Cloud'}</span>
            </Button>
          )}

          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRegenModal(true)}
              disabled={regenerating}
              className="gap-1.5 text-danger hover:text-danger"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyMarkdown}
            className="gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Export MD'}</span>
          </Button>
        </div>
      </div>

      {/* ROADMAP OVERVIEW CARD */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span className="font-medium text-ink">
                {formatEnum(roadmap.skillLevel)}
              </span>
              <span>•</span>
              <span>{roadmap.targetDays} days</span>
              {goal && (
                <>
                  <span>•</span>
                  <span>Goal: {goal.title}</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              {roadmap.topic}
            </h1>
            {roadmap.overview && (
              <p className="text-sm text-muted max-w-3xl leading-relaxed">
                {roadmap.overview}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 text-sm">
            <div className="p-3 rounded-md bg-page border border-line text-center min-w-[90px]">
              <span className="text-[13px] text-muted block">Total hours</span>
              <span className="text-lg font-semibold text-ink">
                {roadmap.totalStudyHours || (roadmap.targetDays * (goal?.hoursPerDay || roadmap.hoursPerDay || 2))}h
              </span>
            </div>
            <div className="p-3 rounded-md bg-page border border-line text-center min-w-[90px]">
              <span className="text-[13px] text-muted block">Daily pace</span>
              <span className="text-lg font-semibold text-accent">
                {(goal?.hoursPerDay || roadmap.hoursPerDay || 2)}h/d
              </span>
            </div>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-ink">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span>Completion:</span>
            <span className="font-semibold text-accent">
              {progressPercent}% ({completedTasksCount}/{totalTasksCount} tasks)
            </span>
          </div>

          <div className="flex-1 max-w-md w-full">
            <ProgressBar
              value={progressPercent}
              ariaLabel="Curriculum progress"
            />
          </div>
        </div>

        {roadmap.feasibilityNote && (
          <div className="p-3 rounded-md bg-page border border-line text-[13px] text-muted flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
            <span>Pacing advice: {roadmap.feasibilityNote}</span>
          </div>
        )}
      </Card>

      {/* NEXT RECOMMENDED ACTION BANNER */}
      {nextRecommendedAction && (
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-accent block uppercase tracking-wider">
              Next recommended task
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-ink">
              Day {nextRecommendedAction.task.dayNumber}: {nextRecommendedAction.task.title}
            </h3>
            {nextRecommendedAction.task.description && (
              <p className="text-[13px] text-muted line-clamp-1">
                {nextRecommendedAction.task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleToggleTask(nextRecommendedAction.id)}
            >
              Mark Done
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSelectDay(nextRecommendedAction.task.dayNumber)}
              className="gap-1"
            >
              <span>Go to Day {nextRecommendedAction.task.dayNumber}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* Error alert if expansion or extra topic fails */}
      {topicError && (
        <div className="p-3.5 rounded-md border border-line bg-page text-danger text-[13px] flex items-center justify-between">
          <span>{topicError}</span>
          <button
            type="button"
            onClick={() => setTopicError(null)}
            className="text-muted hover:text-ink font-semibold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* MASTER-DETAIL VIEW: PhaseList (Master) + DayDetail (Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PhaseList (Master) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">
              Curriculum Schedule
            </h3>
            <span className="text-[13px] text-muted">
              {roadmap.phases?.length || 0} Phases • {totalTasksCount} Days
            </span>
          </div>

          <PhaseList
            phases={roadmap.phases || []}
            tasksByPhase={tasksByPhase}
            selectedDayNumber={selectedDayNumber}
            onSelectDay={handleSelectDay}
            completedTasks={completedTasks}
            onToggleTask={handleToggleTask}
          />
        </div>

        {/* Right Column: DayDetail (Detail) */}
        <div className="lg:col-span-8 xl:col-span-8">
          <DayDetail
            dayNumber={selectedDayNumber}
            totalDays={totalTasksCount}
            taskItem={selectedTaskItem}
            isCompleted={Boolean(selectedTaskItem && completedTasks[selectedTaskItem.id])}
            onToggleCompleted={() => selectedTaskItem && handleToggleTask(selectedTaskItem.id)}
            dayPlan={activeDayPlan}
            loadingPlan={loadingPlan}
            completedBlocks={completedBlocks}
            onToggleBlock={handleToggleBlock}
            onExpandTopic={onExpandTopic || handleExpandTopic}
            onDeleteExpansion={handleDeleteExpansion}
            onSuggestExtraTopics={handleSuggestExtraTopics}
            onDeleteExtraTopic={handleDeleteExtraTopic}
            topicExpansions={dayTopicsCache[selectedDayNumber]?.expansions || topicExpansions || {}}
            extraTopics={dayTopicsCache[selectedDayNumber]?.extraTopics || []}
            loadingExpansion={loadingExpansion || loadingExpansionState}
            suggestingExtra={suggestingExtra}
            canMutate={Boolean(currentSavedId)}
            phase={selectedPhase}
          />
        </div>
      </div>

      {/* Confirm Regeneration Dialog */}
      <ConfirmDialog
        isOpen={showRegenModal}
        title="Regenerate Roadmap?"
        message="Regenerating this roadmap will create a fresh set of curriculum phases and tasks. Your current completion checkboxes will be reset."
        confirmText="Regenerate"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowRegenModal(false);
          if (onRegenerate) {
            setRegenerating(true);
            try {
              await onRegenerate();
            } finally {
              setRegenerating(false);
            }
          }
        }}
        onCancel={() => setShowRegenModal(false)}
      />
    </div>
  );
};
