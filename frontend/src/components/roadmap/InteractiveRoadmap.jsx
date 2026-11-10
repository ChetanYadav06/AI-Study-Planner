import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Save,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Compass,
  Code,
  HelpCircle
} from 'lucide-react';
import { updateRoadmapProgress, saveRoadmap } from '../../services/api';
import { formatEnum } from '../../utils/formatters';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusText } from '../ui/StatusText';
import { ProgressBar } from '../ui/ProgressBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const InteractiveRoadmap = ({
  roadmap,
  goal,
  savedRoadmapId = null,
  onSyncGoalProgress,
  onRegenerate,
  onSaveAsGoal,
  onBack,
  onProgressUpdate,
  isModal = false
}) => {
  if (!roadmap) return null;

  const stableId = savedRoadmapId || roadmap.id || `${roadmap.topic}_${roadmap.targetDays}`;
  const storageKey = `ai_roadmap_progress_${stableId}`;
  const subtopicsStorageKey = `ai_roadmap_subtopics_${stableId}`;
  const taskRefs = useRef({});

  // View state: 'map' (Visual Learning Map) vs 'plan' (Structured Daily Learning Plan)
  const [activeView, setActiveView] = useState('map');
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Initial load from roadmap object or localStorage
  const [progressData, setProgressData] = useState(() => {
    if (roadmap.completedTasksJson) {
      try {
        const tasks = JSON.parse(roadmap.completedTasksJson);
        const milestones = roadmap.completedMilestonesJson ? JSON.parse(roadmap.completedMilestonesJson) : {};
        const taskMap = Array.isArray(tasks)
          ? tasks.reduce((acc, id) => ({ ...acc, [id]: true }), {})
          : tasks;
        const milestoneMap = Array.isArray(milestones)
          ? milestones.reduce((acc, id) => ({ ...acc, [id]: true }), {})
          : milestones;
        return { completedMilestones: milestoneMap, completedTasks: taskMap };
      } catch (e) {
        console.warn('Error parsing roadmap json progress', e);
      }
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading localStorage progress', e);
    }
    return { completedMilestones: {}, completedTasks: {} };
  });

  // Track subtopics completion separately
  const [completedSubtopics, setCompletedSubtopics] = useState(() => {
    try {
      const saved = localStorage.getItem(subtopicsStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const completedMilestones = progressData.completedMilestones || {};
  const completedTasks = progressData.completedTasks || {};

  // Backend sync state
  const [currentSavedId, setCurrentSavedId] = useState(savedRoadmapId);
  const [cloudSynced, setCloudSynced] = useState(Boolean(savedRoadmapId));
  const [savingToCloud, setSavingToCloud] = useState(false);
  const [copied, setCopied] = useState(false);

  // Selected topic node for the Visual Map detail panel
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Expand state for daily plan phases
  const [expandedPhases, setExpandedPhases] = useState(() => {
    const initial = {};
    roadmap.phases?.forEach((_, idx) => {
      initial[idx] = idx === 0;
    });
    return initial;
  });

  // Expand state for daily subtopics in the daily plan
  const [expandedTaskSubtopics, setExpandedTaskSubtopics] = useState({});

  // Compute structured tasks and milestones count
  const { allTasks, allMilestones, totalTasksCount, totalMilestonesCount, tasksByPhase } = useMemo(() => {
    const tasks = [];
    const milestones = [];
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

      phase.milestones?.forEach((m, mIdx) => {
        milestones.push({
          id: `${pIdx}-${mIdx}`,
          phaseIdx: pIdx,
          text: m
        });
      });
    });

    return {
      allTasks: tasks,
      allMilestones: milestones,
      totalTasksCount: tasks.length,
      totalMilestonesCount: milestones.length,
      tasksByPhase: byPhase
    };
  }, [roadmap]);

  // Set default selected node once tasks load
  useEffect(() => {
    if (!selectedNodeId && allTasks.length > 0) {
      const firstUncompleted = allTasks.find(t => !completedTasks[t.id]);
      setSelectedNodeId(firstUncompleted ? firstUncompleted.id : allTasks[0].id);
    }
  }, [allTasks, completedTasks, selectedNodeId]);

  // Total items (tasks + milestones)
  const totalItemsCount = totalTasksCount + totalMilestonesCount;
  const completedTasksCount = useMemo(() => Object.values(completedTasks).filter(Boolean).length, [completedTasks]);
  const completedMilestonesCount = useMemo(() => Object.values(completedMilestones).filter(Boolean).length, [completedMilestones]);
  const totalCompletedCount = completedTasksCount + completedMilestonesCount;

  // Overall percentage
  const progressPercent = useMemo(() => {
    if (totalItemsCount === 0) return 0;
    return Math.min(100, Math.round((totalCompletedCount / totalItemsCount) * 100));
  }, [totalCompletedCount, totalItemsCount]);

  // Next Recommended Action (first uncompleted task)
  const nextRecommendedAction = useMemo(() => {
    for (const item of allTasks) {
      if (!completedTasks[item.id]) {
        return item;
      }
    }
    return null;
  }, [allTasks, completedTasks]);

  // Calculate phase status: LOCKED, COMPLETED, IN_PROGRESS, READY_TO_LEARN
  const getPhaseStatus = (pIdx) => {
    if (pIdx === 0) {
      const p0Counts = {};
      const currentTasks = roadmap.phases[0]?.dailyTasks?.map((t, idx) => getCanonicalTaskId(0, t, idx, p0Counts)) || [];
      const currentMilestones = roadmap.phases[0]?.milestones?.map((_, mIdx) => `0-${mIdx}`) || [];
      const allDone = [...currentTasks, ...currentMilestones].every(id => completedTasks[id] || completedMilestones[id]);
      if (allDone && (currentTasks.length > 0 || currentMilestones.length > 0)) return 'COMPLETED';
      const anyDone = currentTasks.some(id => completedTasks[id]) || currentMilestones.some(id => completedMilestones[id]);
      return anyDone ? 'IN_PROGRESS' : 'READY_TO_LEARN';
    }

    const prevPhase = roadmap.phases?.[pIdx - 1];
    if (!prevPhase) return 'READY_TO_LEARN';

    const prevCounts = {};
    const prevTasks = prevPhase.dailyTasks?.map((t, idx) => getCanonicalTaskId(pIdx - 1, t, idx, prevCounts)) || [];
    const prevMilestones = prevPhase.milestones?.map((_, mIdx) => `${pIdx - 1}-${mIdx}`) || [];
    const prevCompleted = prevTasks.some(id => completedTasks[id]) || prevMilestones.some(id => completedMilestones[id]);

    if (!prevCompleted && (prevTasks.length > 0 || prevMilestones.length > 0)) {
      return 'LOCKED';
    }

    const currCounts = {};
    const currentTasks = roadmap.phases[pIdx].dailyTasks?.map((t, idx) => getCanonicalTaskId(pIdx, t, idx, currCounts)) || [];
    const currentMilestones = roadmap.phases[pIdx].milestones?.map((_, mIdx) => `${pIdx}-${mIdx}`) || [];
    const allDone = [...currentTasks, ...currentMilestones].every(id => completedTasks[id] || completedMilestones[id]);

    if (allDone && (currentTasks.length > 0 || currentMilestones.length > 0)) {
      return 'COMPLETED';
    }

    const anyDone = currentTasks.some(id => completedTasks[id]) || currentMilestones.some(id => completedMilestones[id]);
    return anyDone ? 'IN_PROGRESS' : 'READY_TO_LEARN';
  };

  const getTaskContent = (taskItem) => {
    const task = taskItem.task;
    let subtopics = task.subtopics && task.subtopics.length > 0 ? task.subtopics : null;
    let learningObjectives = task.learningObjectives && task.learningObjectives.length > 0 ? task.learningObjectives : null;
    let practiceTasks = task.practiceTasks && task.practiceTasks.length > 0 ? task.practiceTasks : null;
    let quizQuestion = task.quizQuestion || null;
    let conceptExplanation = task.conceptExplanation || task.description || '';

    if (!subtopics || subtopics.length === 0) {
      const cleanTitle = task.title.replace(/^Day\s*\d+\s*[:—–-]\s*/i, '').trim();
      subtopics = [
        `${cleanTitle}: Core Principles & Mental Model`,
        `Syntax & Architectural Patterns`,
        `Step-by-Step Implementation Workflow`,
        `Edge Cases, Boundary Conditions & Debugging`,
        `Practical Verification & Mastery Exercise`
      ];
    }

    if (!learningObjectives || learningObjectives.length === 0) {
      learningObjectives = [
        `Understand key concepts and principles of ${task.title}`,
        `Write and execute working code implementations solving practical requirements`,
        `Analyze trade-offs, complexity, and best practices`
      ];
    }

    if (!practiceTasks || practiceTasks.length === 0) {
      practiceTasks = [
        `Implement a hands-on exercise demonstrating ${task.title}`,
        `Test boundary cases and refactor for performance`
      ];
    }

    if (!quizQuestion) {
      quizQuestion = `How does ${task.title} contribute to scalable application architecture?`;
    }

    return {
      subtopics,
      learningObjectives,
      practiceTasks,
      quizQuestion,
      conceptExplanation
    };
  };

  // Persist progress to MySQL and localStorage
  const syncProgress = async (newCompletedTasks, newCompletedMilestones, newCompletedSubtopics = completedSubtopics) => {
    const dataToSave = {
      completedMilestones: newCompletedMilestones,
      completedTasks: newCompletedTasks
    };
    setProgressData(dataToSave);
    setCompletedSubtopics(newCompletedSubtopics);

    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      localStorage.setItem(subtopicsStorageKey, JSON.stringify(newCompletedSubtopics));
    } catch (e) {
      console.error('Failed to write progress to localStorage', e);
    }

    const tIds = Object.keys(newCompletedTasks).filter(k => newCompletedTasks[k]);
    const mIds = Object.keys(newCompletedMilestones).filter(k => newCompletedMilestones[k]);
    const newPercent = totalItemsCount > 0 ? Math.min(100, Math.round(((tIds.length + mIds.length) / totalItemsCount) * 100)) : 0;

    if (currentSavedId) {
      try {
        await updateRoadmapProgress(currentSavedId, {
          completedTasksJson: JSON.stringify(tIds),
          completedMilestonesJson: JSON.stringify(mIds),
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

  // Toggle daily task
  const handleToggleTask = (taskId) => {
    const nextVal = !completedTasks[taskId];
    const updatedTasks = {
      ...completedTasks,
      [taskId]: nextVal
    };

    const taskItem = allTasks.find(t => t.id === taskId);
    let updatedSubtopics = { ...completedSubtopics };

    if (taskItem) {
      const content = getTaskContent(taskItem);
      content.subtopics.forEach((_, sIdx) => {
        updatedSubtopics[`${taskId}-sub-${sIdx}`] = nextVal;
      });
    }

    syncProgress(updatedTasks, completedMilestones, updatedSubtopics);
  };

  // Toggle individual subtopic
  const handleToggleSubtopic = (taskId, subIdx, totalSubtopicsCount) => {
    const subKey = `${taskId}-sub-${subIdx}`;
    const nextVal = !completedSubtopics[subKey];
    const updatedSubtopics = {
      ...completedSubtopics,
      [subKey]: nextVal
    };

    let allSubsDone = true;
    for (let i = 0; i < totalSubtopicsCount; i++) {
      const key = `${taskId}-sub-${i}`;
      if (!updatedSubtopics[key]) {
        allSubsDone = false;
        break;
      }
    }

    const updatedTasks = {
      ...completedTasks,
      [taskId]: allSubsDone
    };

    syncProgress(updatedTasks, completedMilestones, updatedSubtopics);
  };

  // Save roadmap to cloud if not already saved
  const handleSaveToCloud = async () => {
    if (savingToCloud) return;
    setSavingToCloud(true);
    try {
      const tIds = Object.keys(completedTasks).filter(k => completedTasks[k]);
      const mIds = Object.keys(completedMilestones).filter(k => completedMilestones[k]);

      const res = await saveRoadmap({
        goalId: goal?.id || null,
        title: `${roadmap.topic} (${roadmap.targetDays} Days)`,
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
          completedMilestonesJson: JSON.stringify(mIds),
          progressPercentage: progressPercent
        });
      }
    } catch (err) {
      console.error('Failed to save roadmap to backend:', err);
    } finally {
      setSavingToCloud(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!roadmap) return;
    const text = `# ${roadmap.topic} Study Roadmap\nTarget: ${roadmap.targetDays} Days (${roadmap.hoursPerDay}h/day)\n\n${roadmap.overview}\n\n` +
      roadmap.phases?.map(p => `## ${p.phaseTitle || p.phase}\n` + p.dailyTasks?.map(t => `- Day ${t.dayNumber}: ${t.title} (${t.activityType || 'Study'})`).join('\n')).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const selectedTaskItem = useMemo(() => {
    if (!selectedNodeId) return null;
    return allTasks.find(t => t.id === selectedNodeId) || allTasks[0] || null;
  }, [selectedNodeId, allTasks]);

  const selectedTaskContent = useMemo(() => {
    if (!selectedTaskItem) return null;
    return getTaskContent(selectedTaskItem);
  }, [selectedTaskItem]);

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : 'max-w-6xl mx-auto pb-16'}`}>
      {/* Top Navigation & Actions Bar */}
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
              className="gap-1.5 text-[#b91c1c] hover:text-[#b91c1c]"
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
            {copied ? <Check className="w-3.5 h-3.5 text-[#0f766e]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Export MD'}</span>
          </Button>
        </div>
      </div>

      {/* ROADMAP HEADER */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4b5563]">
              <span className="font-medium text-[#111827]">
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

            <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight">
              {roadmap.topic}
            </h1>
            {roadmap.overview && (
              <p className="text-sm text-[#4b5563] max-w-3xl leading-relaxed">
                {roadmap.overview}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 text-sm">
            <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-center min-w-[90px]">
              <span className="text-xs text-[#4b5563] block">Total hours</span>
              <span className="text-lg font-semibold text-[#111827]">
                {roadmap.totalStudyHours || (roadmap.targetDays * (goal?.hoursPerDay || roadmap.hoursPerDay))}h
              </span>
            </div>
            <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-center min-w-[90px]">
              <span className="text-xs text-[#4b5563] block">Daily pace</span>
              <span className="text-lg font-semibold text-[#0f766e]">
                {(goal?.hoursPerDay || roadmap.hoursPerDay)}h/d
              </span>
            </div>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-[#111827]">
            <TrendingUp className="w-4 h-4 text-[#0f766e]" />
            <span>Completion:</span>
            <span className="font-semibold text-[#0f766e]">
              {progressPercent}% ({totalCompletedCount}/{totalItemsCount} activities)
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
          <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-xs text-[#4b5563] flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Pacing advice: {roadmap.feasibilityNote}</span>
          </div>
        )}
      </Card>

      {/* NEXT RECOMMENDED ACTION BANNER */}
      {nextRecommendedAction && (
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#0f766e] block uppercase">
              Next recommended task
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-[#111827]">
              Day {nextRecommendedAction.task.dayNumber}: {nextRecommendedAction.task.title}
            </h3>
            {nextRecommendedAction.task.description && (
              <p className="text-xs text-[#4b5563] line-clamp-1">
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
              onClick={() => {
                setSelectedNodeId(nextRecommendedAction.id);
                setActiveView('map');
              }}
              className="gap-1"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* VIEW SWITCHER TABS */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('map')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
              activeView === 'map'
                ? 'border-[#0f766e] text-[#0f766e]'
                : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Visual Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('plan')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-150 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
              activeView === 'plan'
                ? 'border-[#0f766e] text-[#0f766e]'
                : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Plan</span>
          </button>
        </div>

        <span className="text-xs text-[#4b5563] hidden sm:inline">
          {roadmap.phases?.length || 0} phases • {allTasks.length} days
        </span>
      </div>

      {/* ── VIEW MODE: VISUAL MAP ── */}
      {activeView === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Pathway / Nodes (7 cols) */}
          <Card className="lg:col-span-7 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb]">
              <h2 className="text-sm font-semibold text-[#111827]">Study Pathway</h2>
              <span className="text-xs text-[#4b5563]">Select any topic to view details</span>
            </div>

            <div className="space-y-4">
              {roadmap.phases?.map((phase, pIdx) => {
                const phaseStatus = getPhaseStatus(pIdx);
                const isLocked = phaseStatus === 'LOCKED';

                return (
                  <div
                    key={pIdx}
                    className={`p-4 rounded-md border ${
                      isLocked
                        ? 'bg-[#f8fafc] border-[#e5e7eb] opacity-60'
                        : 'bg-white border-[#e5e7eb]'
                    }`}
                  >
                    {/* Phase Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-semibold text-[#111827] uppercase">
                          Phase {pIdx + 1}: {phase.phaseTitle || phase.phase}
                        </h3>
                        <p className="text-xs text-[#4b5563]">
                          {phase.duration} • {phase.dailyTasks?.length || 0} tasks
                        </p>
                      </div>

                      {phaseStatus === 'COMPLETED' ? (
                        <StatusText status="success">Completed</StatusText>
                      ) : phaseStatus === 'IN_PROGRESS' ? (
                        <StatusText status="accent">In progress</StatusText>
                      ) : (
                        <StatusText status="neutral">{isLocked ? 'Locked' : 'Ready'}</StatusText>
                      )}
                    </div>

                    {/* Nodes grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(tasksByPhase[pIdx] || []).map((taskItem) => {
                        const taskId = taskItem.id;
                        const task = taskItem.task;
                        const isDone = Boolean(completedTasks[taskId]);
                        const isSelected = selectedNodeId === taskId;

                        return (
                          <div
                            key={taskId}
                            onClick={() => setSelectedNodeId(taskId)}
                            className={`p-3 rounded-md border transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#f0fdfa] border-[#0f766e]'
                                : isDone
                                ? 'bg-white border-[#e5e7eb]'
                                : 'bg-white border-[#e5e7eb] hover:border-[#cbd5e1]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs text-[#4b5563] mb-1">
                                <span className="font-medium text-[#111827]">
                                  Day {task.dayNumber || 1}
                                </span>
                                {isDone ? (
                                  <span className="text-[#15803d] font-medium flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Done</span>
                                  </span>
                                ) : (
                                  <span>{task.estimatedMinutes || 60}m</span>
                                )}
                              </div>

                              <h4 className={`text-xs font-semibold leading-snug line-clamp-2 ${
                                isDone ? 'text-[#4b5563] line-through' : 'text-[#111827]'
                              }`}>
                                {task.title}
                              </h4>
                            </div>

                            <div className="mt-2 pt-2 border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#4b5563]">
                              <span>{formatEnum(task.activityType || 'Study')}</span>
                              <span className="text-[#0f766e] font-medium">
                                {isSelected ? 'Inspecting' : 'Details'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Node Detail Panel (5 cols) */}
          <Card className="lg:col-span-5 p-5 sm:p-6 sticky top-6 space-y-4">
            {selectedTaskItem && selectedTaskContent ? (
              <>
                <div className="pb-3 border-b border-[#e5e7eb] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4b5563]">
                      Day {selectedTaskItem.task.dayNumber} • {selectedTaskItem.phaseTitle}
                    </span>

                    <Button
                      variant={completedTasks[selectedTaskItem.id] ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleTask(selectedTaskItem.id)}
                      className="gap-1 min-h-[32px]"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{completedTasks[selectedTaskItem.id] ? 'Completed' : 'Mark Done'}</span>
                    </Button>
                  </div>

                  <h3 className="text-base font-semibold text-[#111827] leading-snug">
                    {selectedTaskItem.task.title}
                  </h3>

                  <p className="text-xs text-[#4b5563] flex items-center gap-2">
                    <span>{selectedTaskItem.task.estimatedMinutes || 90} minutes</span>
                    <span>•</span>
                    <span>{formatEnum(selectedTaskItem.task.activityType || 'Study')}</span>
                  </p>
                </div>

                {/* Concept Notes */}
                {selectedTaskContent.conceptExplanation && (
                  <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-xs text-[#4b5563] space-y-1">
                    <span className="font-semibold text-[#111827] block">
                      Core Concept
                    </span>
                    <p className="leading-relaxed">{selectedTaskContent.conceptExplanation}</p>
                  </div>
                )}

                {/* Learning Objectives */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#111827] block">
                    Learning Objectives
                  </span>
                  <ul className="space-y-1 text-xs text-[#4b5563]">
                    {selectedTaskContent.learningObjectives.map((obj, oIdx) => (
                      <li key={oIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] mt-1.5 shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Structured Subtopics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#111827]">
                      Subtopics
                    </span>
                    <span className="text-[#4b5563]">
                      {selectedTaskContent.subtopics.filter((_, idx) => completedSubtopics[`${selectedTaskItem.id}-sub-${idx}`]).length}/
                      {selectedTaskContent.subtopics.length} done
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedTaskContent.subtopics.map((sub, sIdx) => {
                      const subKey = `${selectedTaskItem.id}-sub-${sIdx}`;
                      const isSubDone = Boolean(completedSubtopics[subKey]);

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleToggleSubtopic(selectedTaskItem.id, sIdx, selectedTaskContent.subtopics.length)}
                          className="w-full p-2.5 rounded-md border border-[#e5e7eb] text-xs text-left transition-colors duration-150 cursor-pointer flex items-center gap-2 hover:bg-[#f8fafc]"
                        >
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                            isSubDone ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-[#e5e7eb] bg-white'
                          }`}>
                            {isSubDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={isSubDone ? 'line-through text-[#4b5563]' : 'text-[#111827]'}>
                            {sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Practice Tasks */}
                {selectedTaskContent.practiceTasks && (
                  <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                      <Code className="w-4 h-4 text-[#0f766e]" />
                      <span>Practice Exercises</span>
                    </div>
                    <ul className="list-disc pl-4 text-[#4b5563] space-y-0.5">
                      {selectedTaskContent.practiceTasks.map((prac, pIdx) => (
                        <li key={pIdx}>{prac}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quiz Question */}
                {selectedTaskContent.quizQuestion && (
                  <div className="p-3 rounded-md bg-[#f8fafc] border border-[#e5e7eb] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                      <HelpCircle className="w-4 h-4 text-[#0f766e]" />
                      <span>Knowledge Check</span>
                    </div>
                    <p className="text-[#4b5563] italic">"{selectedTaskContent.quizQuestion}"</p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 text-center text-xs text-[#4b5563]">
                Select a topic node on the left to inspect subtopics and exercises.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── VIEW MODE: DAILY PLAN ACCORDION ── */}
      {activeView === 'plan' && (
        <div className="space-y-3">
          {roadmap.phases?.map((phase, pIdx) => {
            const isExpanded = Boolean(expandedPhases[pIdx]);
            const status = getPhaseStatus(pIdx);
            const isLocked = status === 'LOCKED';

            return (
              <Card
                key={pIdx}
                className={`overflow-hidden ${isLocked ? 'opacity-60' : ''}`}
              >
                {/* Phase Accordion Trigger */}
                <div
                  onClick={() => setExpandedPhases(prev => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#f8fafc] transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-[#f8fafc] border border-[#e5e7eb] flex items-center justify-center font-semibold text-xs text-[#111827]">
                      {pIdx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#111827] uppercase">
                          Phase {phase.phaseNumber || pIdx + 1}: {phase.phaseTitle || phase.phase}
                        </span>
                        <span className="text-xs text-[#4b5563]">• {phase.duration}</span>
                        {status === 'COMPLETED' ? (
                          <StatusText status="success">Completed</StatusText>
                        ) : status === 'IN_PROGRESS' ? (
                          <StatusText status="accent">In progress</StatusText>
                        ) : (
                          <StatusText status="neutral">{isLocked ? 'Locked' : 'Ready'}</StatusText>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[#4b5563]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Phase Content */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[#e5e7eb] space-y-3">
                    {(tasksByPhase[pIdx] || []).map((taskItem) => {
                      const taskId = taskItem.id;
                      const task = taskItem.task;
                      const isDone = Boolean(completedTasks[taskId]);
                      const isSubtopicsExpanded = Boolean(expandedTaskSubtopics[taskId]);
                      const taskContent = getTaskContent({ task });

                      return (
                        <div
                          key={taskId}
                          ref={el => (taskRefs.current[taskId] = el)}
                          className="p-3.5 rounded-md border border-[#e5e7eb] bg-white space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(taskId)}
                                className={`mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 ${
                                  isDone
                                    ? 'bg-[#0f766e] border-[#0f766e] text-white'
                                    : 'border-[#e5e7eb] bg-white hover:border-[#0f766e]'
                                }`}
                                aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>

                              <div>
                                <p className="text-xs text-[#4b5563] flex items-center gap-2">
                                  <span>Day {task.dayNumber}</span>
                                  <span>•</span>
                                  <span>{formatEnum(task.activityType || 'Study')}</span>
                                  {task.estimatedMinutes != null && (
                                    <>
                                      <span>•</span>
                                      <span>{task.estimatedMinutes}m</span>
                                    </>
                                  )}
                                </p>

                                <h4 className={`text-sm font-semibold mt-0.5 ${isDone ? 'line-through text-[#4b5563]' : 'text-[#111827]'}`}>
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-[#4b5563] mt-0.5 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedTaskSubtopics(prev => ({ ...prev, [taskId]: !prev[taskId] }))}
                              className="text-xs text-[#0f766e] hover:underline cursor-pointer shrink-0 py-1 px-1.5 focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 rounded-sm"
                            >
                              {isSubtopicsExpanded ? 'Hide' : `Subtopics (${taskContent.subtopics.length})`}
                            </button>
                          </div>

                          {/* Subtopics accordion */}
                          {isSubtopicsExpanded && (
                            <div className="mt-3 pt-2.5 border-t border-[#e5e7eb] space-y-2">
                              <span className="text-xs font-semibold text-[#111827] block">
                                Subtopic Checklist
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {taskContent.subtopics.map((sub, sIdx) => {
                                  const subKey = `${taskId}-sub-${sIdx}`;
                                  const isSubDone = Boolean(completedSubtopics[subKey]);

                                  return (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => handleToggleSubtopic(taskId, sIdx, taskContent.subtopics.length)}
                                      className="p-2 rounded-md border border-[#e5e7eb] text-xs text-left transition-colors duration-150 cursor-pointer flex items-center gap-2 hover:bg-[#f8fafc]"
                                    >
                                      <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                        isSubDone ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-[#e5e7eb] bg-white'
                                      }`}>
                                        {isSubDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                      <span className={isSubDone ? 'line-through text-[#4b5563]' : 'text-[#111827]'}>
                                        {sub}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CURATED LEARNING RESOURCES */}
      {roadmap.learningResources && roadmap.learningResources.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[#e5e7eb]">
            <h2 className="text-base font-semibold text-[#111827]">
              Learning Resources
            </h2>
            <p className="text-xs text-[#4b5563] mt-0.5">
              Documentation and references saved for this roadmap
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roadmap.learningResources.map((res, rIdx) => {
              const hasUrl = Boolean(res.url && res.url.trim());
              const cardContent = (
                <div className="p-4 rounded-md border border-[#e5e7eb] bg-white hover:border-[#cbd5e1] transition-colors duration-150 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#4b5563]">
                      <span className="font-medium uppercase">
                        {res.type || 'DOCUMENTATION'}
                      </span>
                      {hasUrl && (
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-[#111827]">
                      {res.title}
                    </h3>

                    {res.relevance && (
                      <p className="text-xs text-[#4b5563] line-clamp-2 leading-relaxed">
                        {res.relevance}
                      </p>
                    )}
                  </div>

                  {hasUrl && (
                    <span className="text-xs font-medium text-[#0f766e] pt-2 border-t border-[#e5e7eb]">
                      Open resource ↗
                    </span>
                  )}
                </div>
              );

              return hasUrl ? (
                <a
                  key={rIdx}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block focus-visible:outline-2 focus-visible:outline-[#0f766e] focus-visible:outline-offset-2 rounded-md"
                >
                  {cardContent}
                </a>
              ) : (
                <div key={rIdx}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Regeneration Confirmation Dialog (Reusable UI Primitive) */}
      <ConfirmDialog
        isOpen={showRegenModal}
        title="Confirm Roadmap Regeneration"
        description={`Regenerating replaces this roadmap and resets your ${Object.keys(completedTasks).filter(k => completedTasks[k]).length} completed tasks. This cannot be undone.`}
        confirmLabel={regenerating ? 'Regenerating...' : 'Regenerate'}
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={async () => {
          setRegenerating(true);
          try {
            await onRegenerate();
            setShowRegenModal(false);
          } catch (err) {
            console.error('Regeneration error:', err);
          } finally {
            setRegenerating(false);
          }
        }}
        onCancel={() => setShowRegenModal(false)}
      />
    </div>
  );
};

export default InteractiveRoadmap;
