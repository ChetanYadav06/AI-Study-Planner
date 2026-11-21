import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  getDayPlan,
  expandTopic,
  suggestExtraTopics,
  deleteTopicExpansion,
  deleteExtraTopic,
  getDayTopicsAndExpansions,
  getSavedRoadmapById,
  submitTaskFeedback
} from '../../services/api';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { NotFoundView } from '../common/NotFoundView';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import {
  stripPhasePrefix,
  getNextUnfinishedDay,
  computePhaseSummaries
} from '../../utils/dayPlanHelpers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

import { RoadmapHeader } from './RoadmapHeader';
import { PhaseDayStrip } from './PhaseDayStrip';
import { PhaseDayList } from './PhaseDayList';
import { DayHeader } from './DayHeader';
import { DayObjectives } from './DayObjectives';
import { DayTimeline } from './DayTimeline';
import { PhaseExtrasAccordion } from './PhaseExtrasAccordion';
import { DayFooter } from './DayFooter';
import { MobileDaysDrawer } from './MobileDaysDrawer';

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

  // Day plan fetch state & error handling
  const [dayPlanCache, setDayPlanCache] = useState({});
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Topic Expansions and Extra Topics state
  const [dayTopicsCache, setDayTopicsCache] = useState({});
  const [loadingExpansionState, setLoadingExpansionState] = useState(null);
  const [suggestingExtra, setSuggestingExtra] = useState(false);
  const [topicError, setTopicError] = useState(null);

  // Topic ticks (Sub-step 9C)
  const [topicTicks, setTopicTicks] = useState({});

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const allDaysButtonRef = useRef(null);

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

  const roadmap = activeRoadmap;

  // Compute canonical tasks and phases
  const { allTasks, totalTasksCount, tasksByPhase } = useMemo(() => {
    if (!roadmap) return { allTasks: [], totalTasksCount: 0, tasksByPhase: {} };
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

  // Compute canonical progress percent
  const completedTasksCount = useMemo(() => {
    return allTasks.filter(item => completedTasks[item.id]).length;
  }, [allTasks, completedTasks]);

  const progressPercent = useMemo(() => {
    if (totalTasksCount === 0) return 0;
    return Math.min(100, Math.round((completedTasksCount / totalTasksCount) * 100));
  }, [completedTasksCount, totalTasksCount]);

  // Next recommended unfinished day number
  const nextUnfinishedDayNumber = useMemo(() => {
    return getNextUnfinishedDay(allTasks, completedTasks);
  }, [allTasks, completedTasks]);

  const isEntireRoadmapCompleted = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  // Day selection state: initialize from URL params or default to 1
  const [selectedDayNumber, setSelectedDayNumber] = useState(() => {
    if (params.day) {
      const parsed = Number(params.day);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  });

  // Sync day selection when URL params change
  useEffect(() => {
    if (params.day) {
      const parsed = Number(params.day);
      if (!isNaN(parsed)) {
        setSelectedDayNumber(parsed);
      }
    }
  }, [params.day]);

  // When no day is in URL, select the first incomplete day
  useEffect(() => {
    if (!params.day && allTasks.length > 0) {
      if (nextUnfinishedDayNumber) {
        setSelectedDayNumber(nextUnfinishedDayNumber);
      } else {
        setSelectedDayNumber(1);
      }
    }
  }, [params.day, allTasks, nextUnfinishedDayNumber]);

  // Navigate to selected day
  const handleSelectDay = useCallback((dayNum) => {
    setSelectedDayNumber(dayNum);
    if (currentSavedId) {
      navigate(`#/roadmaps/${currentSavedId}/day/${dayNum}`);
    }
  }, [currentSavedId, navigate]);

  // Find active task item and phase
  const selectedTaskItem = useMemo(() => {
    return allTasks.find(t => t.task.dayNumber === selectedDayNumber) || null;
  }, [allTasks, selectedDayNumber]);

  const selectedPhaseIndex = selectedTaskItem ? selectedTaskItem.phaseIdx : 0;
  const selectedPhase = useMemo(() => {
    if (!roadmap?.phases) return null;
    return roadmap.phases[selectedPhaseIndex] || null;
  }, [roadmap?.phases, selectedPhaseIndex]);

  // Enriched phase summaries
  const phaseSummaries = useMemo(() => {
    return computePhaseSummaries(roadmap?.phases || [], tasksByPhase, completedTasks);
  }, [roadmap?.phases, tasksByPhase, completedTasks]);

  const handleSelectPhase = useCallback((phaseIdx, targetDay) => {
    if (targetDay) {
      handleSelectDay(targetDay);
    } else {
      const phase = phaseSummaries[phaseIdx];
      if (phase?.tasks[0]) {
        handleSelectDay(phase.tasks[0].task.dayNumber);
      }
    }
  }, [handleSelectDay, phaseSummaries]);

  // Day plan fetch
  const fetchDayPlan = useCallback((dayNum) => {
    if (!currentSavedId) return;
    setLoadingPlan(true);
    setPlanError(null);

    getDayPlan(currentSavedId, dayNum)
      .then((plan) => {
        setDayPlanCache(prev => ({ ...prev, [dayNum]: plan }));
      })
      .catch((err) => {
        console.warn(`Could not fetch day plan for day ${dayNum}:`, err);
        setPlanError('Could not load plan schedule. Click retry.');
      })
      .finally(() => {
        setLoadingPlan(false);
      });
  }, [currentSavedId]);

  useEffect(() => {
    if (currentSavedId && selectedDayNumber && !dayPlanCache[selectedDayNumber]) {
      fetchDayPlan(selectedDayNumber);
    }
  }, [currentSavedId, selectedDayNumber, dayPlanCache, fetchDayPlan]);

  // Fetch expansions and extra topics
  useEffect(() => {
    if (!currentSavedId) return;
    if (dayTopicsCache[selectedDayNumber]) return;

    getDayTopicsAndExpansions(currentSavedId, selectedDayNumber)
      .then((data) => {
        if (data) {
          setDayTopicsCache(prev => ({
            ...prev,
            [selectedDayNumber]: data
          }));
        }
      })
      .catch((err) => {
        console.warn(`Could not fetch topics and expansions for day ${selectedDayNumber}:`, err);
      });
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

  // Task completion toggle
  const handleToggleTask = async (taskId) => {
    const currentVal = Boolean(completedTasks[taskId]);
    const nextVal = !currentVal;

    // Optimistic local update
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: nextVal
    }));

    if (!currentSavedId) return;

    try {
      const response = await toggleTaskCompletion(currentSavedId, taskId, nextVal);
      const updatedMap = (response.completedTaskIds || []).reduce((acc, id) => ({ ...acc, [id]: true }), {});
      setCompletedTasks(updatedMap);
      setServerProgress(response.progressPercentage);

      if (onProgressUpdate) {
        onProgressUpdate(response.progressPercentage);
      }
      if (onSyncGoalProgress && (goal?.id || response.goalId)) {
        onSyncGoalProgress(goal?.id || response.goalId, response.goalProgressPercentage);
      }
    } catch (err) {
      setCompletedTasks(prev => ({
        ...prev,
        [taskId]: currentVal
      }));
      setSyncError(err.message || 'Failed to update task completion.');
      setTimeout(() => setSyncError(null), 4000);
    }
  };

  // Submit Phase 5 rating for a day
  const handleRateDayTask = async (rating) => {
    if (!currentSavedId || !selectedTaskItem) return;
    try {
      await submitTaskFeedback(currentSavedId, selectedTaskItem.id, rating);
    } catch (err) {
      console.warn('Failed to submit task feedback:', err);
    }
  };

  // Export Markdown
  const handleCopyMarkdown = () => {
    if (!roadmap) return;
    const text = `# ${roadmap.topic} Study Roadmap\nTarget: ${roadmap.targetDays} Days (${roadmap.hoursPerDay}h/day)\n\n${roadmap.overview || ''}\n\n` +
      (roadmap.phases || []).map(p => `## ${p.phaseTitle || p.phase}\n` + (p.dailyTasks || []).map(t => `- Day ${t.dayNumber}: ${t.title} (${t.activityType || 'Study'})`).join('\n')).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  // Active day's plan from cache or synthesized fallback
  const activeDayPlan = useMemo(() => {
    if (dayPlanCache[selectedDayNumber]) {
      return dayPlanCache[selectedDayNumber];
    }
    if (!selectedTaskItem || !roadmap) return null;

    const task = selectedTaskItem.task;
    const dailyMinutes = task.estimatedMinutes || Math.round((roadmap.hoursPerDay || 2) * 60);

    const learn = Math.round(dailyMinutes * 0.40);
    const practice = Math.round(dailyMinutes * 0.40);
    const review = dailyMinutes - (learn + practice);

    return {
      dayNumber: selectedDayNumber,
      estimatedMinutes: dailyMinutes,
      activityType: task.activityType || 'STUDY',
      topics: task.topics || (task.subtopics || []).map(st => ({
        title: typeof st === 'string' ? st : st.title,
        summary: typeof st === 'string' ? '' : st.summary
      })),
      blocks: [
        { kind: 'STUDY', minutes: learn, title: 'Concept study' },
        { kind: 'PRACTICE', minutes: practice, title: 'Hands-on practice' },
        { kind: 'QUIZ', minutes: review, title: 'Check yourself' }
      ]
    };
  }, [dayPlanCache, selectedDayNumber, selectedTaskItem, roadmap]);

  // Next task item for footer
  const nextTaskItem = useMemo(() => {
    if (!selectedTaskItem) return null;
    return allTasks.find(t => t.task.dayNumber === selectedDayNumber + 1) || null;
  }, [allTasks, selectedDayNumber]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="space-y-5 max-w-[1180px] mx-auto pb-16 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-md w-44"></div>
        <div className="h-40 bg-slate-200 rounded-lg w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 h-96 bg-slate-200 rounded-lg"></div>
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return <NotFoundView message="The requested roadmap could not be found or has been deleted." />;
  }

  if (!roadmap) {
    return null;
  }

  // Unknown day state (e.g. #/roadmaps/1/day/999)
  const isUnknownDay = selectedDayNumber < 1 || selectedDayNumber > totalTasksCount;
  if (isUnknownDay) {
    return (
      <div className="max-w-[1180px] mx-auto py-12 px-4 space-y-4 text-center">
        <div className="p-8 rounded-lg border border-line bg-surface space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-danger mx-auto" />
          <h2 className="text-lg font-semibold text-ink">This day does not exist</h2>
          <p className="text-[13px] text-muted">
            Day {selectedDayNumber} is outside the range for this {totalTasksCount}-day roadmap.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSelectDay(nextUnfinishedDayNumber || 1)}
            className="min-h-[40px] px-4 text-[13px] rounded-md mx-auto"
          >
            Go to first unfinished day (Day {nextUnfinishedDayNumber || 1})
          </Button>
        </div>
      </div>
    );
  }

  const isCurrentDayDone = Boolean(selectedTaskItem && completedTasks[selectedTaskItem.id]);
  const dayTopics = activeDayPlan?.topics || selectedTaskItem?.task?.topics || [];
  const extraTopics = dayTopicsCache[selectedDayNumber]?.extraTopics || [];
  const expansions = dayTopicsCache[selectedDayNumber]?.expansions || {};
  const estimatedMins = activeDayPlan?.estimatedMinutes || selectedTaskItem?.task?.estimatedMinutes || 30;

  return (
    <div className={`space-y-5 ${isModal ? 'p-1' : 'max-w-[1180px] mx-auto pb-16'}`}>
      {syncError && (
        <div className="p-3 bg-red-50 border border-red-200 text-danger text-[13px] rounded-md flex items-center gap-2" aria-live="polite">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Top Header */}
      <RoadmapHeader
        roadmap={roadmap}
        progressPercent={progressPercent}
        completedCount={completedTasksCount}
        totalCount={totalTasksCount}
        onBack={onBack}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        onCopyMarkdown={handleCopyMarkdown}
      />

      {/* Phase Day Strip */}
      <PhaseDayStrip
        phases={phaseSummaries}
        selectedPhaseIndex={selectedPhaseIndex}
        selectedDayNumber={selectedDayNumber}
        onSelectPhase={handleSelectPhase}
        onSelectDay={handleSelectDay}
        completedTasks={completedTasks}
        progressPercent={progressPercent}
        completedCount={completedTasksCount}
        totalCount={totalTasksCount}
      />

      {/* Mobile "All days" button (opens drawer) */}
      <div className="flex items-center justify-between lg:hidden pt-1">
        <Button
          ref={allDaysButtonRef}
          variant="secondary"
          size="sm"
          onClick={() => setMobileDrawerOpen(true)}
          className="gap-2 min-h-[40px] px-3.5 text-[13px] rounded-md w-full justify-center"
          aria-label="Open all days panel"
        >
          <Calendar className="w-4 h-4 text-accent" />
          <span>All days ({completedTasksCount} of {totalTasksCount} done)</span>
        </Button>
      </div>

      {/* Two-Column Grid: Left Day List, Right Day Detail (20px gaps) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Desktop sticky, hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-4">
          <PhaseDayList
            phases={phaseSummaries}
            selectedPhaseIndex={selectedPhaseIndex}
            selectedDayNumber={selectedDayNumber}
            onSelectPhase={handleSelectPhase}
            onSelectDay={handleSelectDay}
            completedTasks={completedTasks}
            nextUnfinishedDayNumber={nextUnfinishedDayNumber}
          />
        </div>

        {/* Right Column: Day Detail */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-5">
          <Card className="p-5 sm:p-6 space-y-5">
            {/* Day Header */}
            <DayHeader
              dayNumber={selectedDayNumber}
              totalDays={totalTasksCount}
              task={selectedTaskItem?.task}
              estimatedMinutes={estimatedMins}
              isCompleted={isCurrentDayDone}
              onToggleCompleted={() => selectedTaskItem && handleToggleTask(selectedTaskItem.id)}
              onRateTask={handleRateDayTask}
            />

            {/* Day Objectives */}
            <DayObjectives
              objectives={selectedTaskItem?.task?.learningObjectives || []}
            />

            {/* Plan Loading / Error States */}
            {planError && (
              <div
                className="p-3 bg-red-50 border border-red-200 text-danger text-[13px] rounded-md flex items-center justify-between gap-2"
                aria-live="polite"
              >
                <span>{planError}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchDayPlan(selectedDayNumber)}
                  className="text-[13px] min-h-[40px] px-3 rounded-md"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Day Timeline */}
            <DayTimeline
              blocks={activeDayPlan?.blocks || []}
              totalMinutes={estimatedMins}
              topics={dayTopics}
              extraTopics={extraTopics}
              practiceTasks={selectedTaskItem?.task?.practiceTasks || []}
              quizQuestion={selectedTaskItem?.task?.quizQuestion || null}
              expansions={expansions}
              loadingExpansion={loadingExpansionState}
              suggestingExtra={suggestingExtra}
              onExpandTopic={handleExpandTopic}
              onDeleteExpansion={handleDeleteExpansion}
              onSuggestExtraTopics={handleSuggestExtraTopics}
              onDeleteExtraTopic={handleDeleteExtraTopic}
              topicTicks={topicTicks}
              onToggleTopicTick={(topicKey) => {
                setTopicTicks(prev => ({
                  ...prev,
                  [topicKey]: !prev[topicKey]
                }));
              }}
              onMarkDayDone={() => selectedTaskItem && handleToggleTask(selectedTaskItem.id)}
              isDayDone={isCurrentDayDone}
              canMutate={Boolean(currentSavedId)}
              topicError={topicError}
            />

            {/* Collapsed "More for this phase" accordion */}
            <PhaseExtrasAccordion phase={selectedPhase} />

            {/* Day Footer */}
            <DayFooter
              isCurrentDayDone={isCurrentDayDone}
              nextTaskItem={nextTaskItem}
              isEntireRoadmapCompleted={isEntireRoadmapCompleted}
              onMarkDayDone={() => selectedTaskItem && handleToggleTask(selectedTaskItem.id)}
              onGoToNextDay={() => nextTaskItem && handleSelectDay(nextTaskItem.task.dayNumber)}
            />
          </Card>

          {/* Mobile Previous / Next Day Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 lg:hidden pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedDayNumber <= 1}
              onClick={() => handleSelectDay(selectedDayNumber - 1)}
              className="min-h-[40px] px-3.5 text-[13px] rounded-md gap-1.5 flex-1 justify-center"
              aria-label="Previous day"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous day</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={selectedDayNumber >= totalTasksCount}
              onClick={() => handleSelectDay(selectedDayNumber + 1)}
              className="min-h-[40px] px-3.5 text-[13px] rounded-md gap-1.5 flex-1 justify-center"
              aria-label="Next day"
            >
              <span>Next day</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile "All days" drawer */}
      <MobileDaysDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => {
          setMobileDrawerOpen(false);
          allDaysButtonRef.current?.focus();
        }}
        phases={phaseSummaries}
        selectedPhaseIndex={selectedPhaseIndex}
        selectedDayNumber={selectedDayNumber}
        onSelectPhase={handleSelectPhase}
        onSelectDay={handleSelectDay}
        completedTasks={completedTasks}
        nextUnfinishedDayNumber={nextUnfinishedDayNumber}
      />
    </div>
  );
};

export default InteractiveRoadmap;
