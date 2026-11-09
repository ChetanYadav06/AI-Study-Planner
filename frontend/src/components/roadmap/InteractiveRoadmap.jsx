import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Map,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Save,
  Zap,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Lock,
  PlayCircle,
  Code,
  Layers,
  Sparkles,
  HelpCircle,
  ListTodo,
  CheckSquare,
  Square,
  Compass,
  FileText,
  Target,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { updateRoadmapProgress, saveRoadmap } from '../../services/api';
import { formatEnum } from '../../utils/formatters';
import { getCanonicalTaskId } from '../../utils/studyQueue';

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

  // View state: 'map' (Interactive Visual Learning Map) vs 'plan' (Structured Daily Learning Plan)
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
      // Pick first uncompleted task, or first task
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

  // Helper to ensure every task has rich, structured subtopics, learning objectives, and practice
  const getTaskContent = (taskItem) => {
    const task = taskItem.task;
    let subtopics = task.subtopics && task.subtopics.length > 0 ? task.subtopics : null;
    let learningObjectives = task.learningObjectives && task.learningObjectives.length > 0 ? task.learningObjectives : null;
    let practiceTasks = task.practiceTasks && task.practiceTasks.length > 0 ? task.practiceTasks : null;
    let quizQuestion = task.quizQuestion || null;
    let conceptExplanation = task.conceptExplanation || task.description || '';

    // If subtopics are missing, synthesize them intelligently from title & description
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
        `Understand the key concepts and theoretical background of ${task.title}`,
        `Write and execute working code implementations solving practical requirements`,
        `Analyze trade-offs, complexity, and production best practices`
      ];
    }

    if (!practiceTasks || practiceTasks.length === 0) {
      practiceTasks = [
        `Implement a hands-on exercise demonstrating ${task.title}`,
        `Test boundary cases and refactor for performance`
      ];
    }

    if (!quizQuestion) {
      quizQuestion = `How does ${task.title} contribute to scalable application architecture and maintainable code?`;
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

    // Backend sync
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
  };

  // Toggle daily task
  const handleToggleTask = (taskId) => {
    const willBeDone = !completedTasks[taskId];
    const taskItem = allTasks.find(t => t.id === taskId);
    const updatedSubtopics = { ...completedSubtopics };

    if (taskItem) {
      const content = getTaskContent(taskItem);
      content.subtopics.forEach((_, sIdx) => {
        const subKey = `${taskId}-sub-${sIdx}`;
        updatedSubtopics[subKey] = willBeDone;
      });
    }

    const updatedTasks = {
      ...completedTasks,
      [taskId]: willBeDone
    };
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

    // Check if all subtopics for this task are now checked
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

  // Selected node object for Visual Map detail panel
  const selectedTaskItem = useMemo(() => {
    if (!selectedNodeId) return null;
    return allTasks.find(t => t.id === selectedNodeId) || allTasks[0] || null;
  }, [selectedNodeId, allTasks]);

  const selectedTaskContent = useMemo(() => {
    if (!selectedTaskItem) return null;
    return getTaskContent(selectedTaskItem);
  }, [selectedTaskItem]);

  return (
    <div className={`space-y-6 animate-fade-slide ${isModal ? 'p-1' : 'max-w-6xl mx-auto pb-16'}`}>
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-teal-700 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Roadmaps</span>
          </button>
        ) : <div />}

        <div className="flex items-center space-x-2.5 self-end">
          {cloudSynced ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200/60">
              <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" />
              <span>Saved to Database</span>
            </span>
          ) : (
            <button
              onClick={handleSaveToCloud}
              disabled={savingToCloud}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingToCloud ? 'Saving...' : 'Save to Cloud'}</span>
            </button>
          )}

          {onRegenerate && (
            <button
              onClick={() => setShowRegenModal(true)}
              disabled={regenerating}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 shadow-2xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
          )}

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Export MD'}</span>
          </button>
        </div>
      </div>

      {/* COMPACT ROADMAP HEADER (Phase 1 Refinement: Clean, generous spacing, not bloated) */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-teal-50 text-teal-800 border border-teal-200/60">
                {roadmap.skillLevel || 'CUSTOM'} CURRICULUM
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                {roadmap.targetDays} DAYS SPRINT
              </span>
              {goal && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                  Goal: {goal.title}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {roadmap.topic}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              {roadmap.overview}
            </p>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Total Hours</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {roadmap.totalStudyHours || (roadmap.targetDays * (goal?.hoursPerDay || roadmap.hoursPerDay))}h
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Daily Pace</span>
              <div className="text-xl font-black text-teal-600 mt-0.5">
                {(goal?.hoursPerDay || roadmap.hoursPerDay)}h/d
              </div>
            </div>
          </div>
        </div>

        {/* Compact Progress Tracker Bar */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-800">Overall Curriculum Completion:</span>
            <span className="text-xs font-mono font-black text-teal-700">
              {progressPercent}% ({totalCompletedCount}/{totalItemsCount} Activities)
            </span>
          </div>

          <div className="flex-1 max-w-md w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {roadmap.feasibilityNote && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start space-x-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed"><strong>Pacing Advice:</strong> {roadmap.feasibilityNote}</span>
          </div>
        )}
      </div>

      {/* NEXT RECOMMENDED ACTION BANNER */}
      {nextRecommendedAction && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/10 border border-teal-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
              <Zap className="w-5 h-5 text-cyan-300" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                  NEXT RECOMMENDED ACTION
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {nextRecommendedAction.phaseTitle}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                Day {nextRecommendedAction.task.dayNumber}: {nextRecommendedAction.task.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                {nextRecommendedAction.task.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => handleToggleTask(nextRecommendedAction.id)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Mark Done</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedNodeId(nextRecommendedAction.id);
                setActiveView('map');
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Inspect on Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: VIEW SWITCHER (Visual Learning Map vs. Structured Daily Plan) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveView('map')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'map'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4 text-teal-600" />
            <span>Interactive Visual Map</span>
          </button>

          <button
            onClick={() => setActiveView('plan')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'plan'
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Daily Learning Plan</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
          {roadmap.phases?.length || 0} Phases • {allTasks.length} Days Mapped
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          PHASE 3: INTERACTIVE VISUAL LEARNING MAP WITH CONNECTED TOPIC NODES
      ═════════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Visual Graph & Topic Journey (8 cols on desktop) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Connected Curriculum Pathway</h2>
              </div>
              <span className="text-[11px] text-slate-400">Click any topic to view structured subtopics</span>
            </div>

            {/* Sequential Phase Swimlanes */}
            <div className="space-y-6">
              {roadmap.phases?.map((phase, pIdx) => {
                const phaseStatus = getPhaseStatus(pIdx);
                const isLocked = phaseStatus === 'LOCKED';

                return (
                  <div
                    key={pIdx}
                    className={`p-5 rounded-3xl border transition-all ${
                      isLocked
                        ? 'bg-slate-50/70 border-slate-200/80 opacity-60'
                        : phaseStatus === 'COMPLETED'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : 'bg-slate-50/40 border-slate-200/90'
                    }`}
                  >
                    {/* Phase Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          phaseStatus === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : isLocked
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-teal-600 text-white'
                        }`}>
                          {phaseStatus === 'COMPLETED' ? <Check className="w-4 h-4 stroke-[3]" /> : pIdx + 1}
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            {phase.phaseTitle || phase.phase}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {phase.duration} • {phase.dailyTasks?.length || 0} Daily Activities
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        phaseStatus === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isLocked
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-teal-100 text-teal-800'
                      }`}>
                        {phaseStatus.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Connected Topic Nodes within this Phase */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                      {(tasksByPhase[pIdx] || []).map((taskItem) => {
                        const taskId = taskItem.id;
                        const task = taskItem.task;
                        const isDone = Boolean(completedTasks[taskId]);
                        const isSelected = selectedNodeId === taskId;
                        const taskContent = getTaskContent({ task });

                        return (
                          <div
                            key={taskId}
                            onClick={() => setSelectedNodeId(taskId)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                              isSelected
                                ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                                : isDone
                                ? 'bg-white border-emerald-300 hover:border-emerald-400'
                                : isLocked
                                ? 'bg-white/60 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-2xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-black font-mono px-1.5 py-0.2 rounded ${
                                  isSelected ? 'bg-teal-200 text-teal-900' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  DAY {task.dayNumber || 1}
                                </span>

                                {isDone ? (
                                  <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {task.estimatedMinutes || 60}m
                                  </span>
                                )}
                              </div>

                              <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${
                                isDone ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-teal-700'
                              }`}>
                                {task.title}
                              </h4>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{taskContent.subtopics.length} subtopics</span>
                              <span className="font-semibold text-teal-700 group-hover:underline">
                                {isSelected ? 'Inspecting →' : 'Details'}
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
          </div>

          {/* DETAIL PANEL FOR SELECTED TOPIC NODE (5 cols on desktop) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs sticky top-6 space-y-5 animate-fade-slide">
            {selectedTaskItem && selectedTaskContent ? (
              <>
                {/* Detail Panel Header */}
                <div className="pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/60">
                      DAY {selectedTaskItem.task.dayNumber} • {selectedTaskItem.phaseTitle}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleTask(selectedTaskItem.id)}
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        completedTasks[selectedTaskItem.id]
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{completedTasks[selectedTaskItem.id] ? 'Completed' : 'Mark Done'}</span>
                    </button>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {selectedTaskItem.task.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
                    <span className="flex items-center space-x-1 font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{selectedTaskItem.task.estimatedMinutes || 90} Minutes</span>
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {formatEnum(selectedTaskItem.task.activityType || 'STUDY')}
                    </span>
                  </div>
                </div>

                {/* Concept Notes */}
                {selectedTaskContent.conceptExplanation && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Core Concept Note
                    </span>
                    <p className="leading-relaxed">{selectedTaskContent.conceptExplanation}</p>
                  </div>
                )}

                {/* Learning Objectives */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Learning Objectives
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {selectedTaskContent.learningObjectives.map((obj, oIdx) => (
                      <li key={oIdx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Structured Subtopics with Individual Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Daily Subtopics & Milestones
                    </span>
                    <span className="text-[10px] font-mono text-teal-700 font-bold">
                      {selectedTaskContent.subtopics.filter((_, idx) => completedSubtopics[`${selectedTaskItem.id}-sub-${idx}`]).length}/
                      {selectedTaskContent.subtopics.length} Done
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedTaskContent.subtopics.map((sub, sIdx) => {
                      const subKey = `${selectedTaskItem.id}-sub-${sIdx}`;
                      const isSubDone = Boolean(completedSubtopics[subKey]);

                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleToggleSubtopic(selectedTaskItem.id, sIdx, selectedTaskContent.subtopics.length)}
                          className={`w-full p-2.5 rounded-xl border text-xs text-left transition cursor-pointer flex items-center space-x-2.5 ${
                            isSubDone
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSubDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isSubDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={isSubDone ? 'line-through text-slate-400' : 'font-medium'}>
                            {sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Practical Exercises */}
                {selectedTaskContent.practiceTasks && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900">
                      <Code className="w-4 h-4 text-indigo-600" />
                      <span>Hands-On Coding Practice</span>
                    </div>
                    <ul className="text-xs text-indigo-950 space-y-1 pl-5 list-disc">
                      {selectedTaskContent.practiceTasks.map((prac, pIdx) => (
                        <li key={pIdx}>{prac}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Quiz Self-Assessment */}
                {selectedTaskContent.quizQuestion && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-900">
                      <HelpCircle className="w-4 h-4 text-teal-600" />
                      <span>Knowledge Check Quiz</span>
                    </div>
                    <p className="text-xs text-teal-950 pl-5 italic">
                      "{selectedTaskContent.quizQuestion}"
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Select a Topic Node</p>
                <p className="text-[11px] text-slate-400">
                  Click any topic node on the left visual map to inspect structured subtopics and exercises.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          PHASE 2 & 4: STRUCTURED DAILY LEARNING PLAN ACCORDION
      ═════════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'plan' && (
        <div className="space-y-4">
          {roadmap.phases?.map((phase, pIdx) => {
            const isExpanded = Boolean(expandedPhases[pIdx]);
            const status = getPhaseStatus(pIdx);
            const isLocked = status === 'LOCKED';

            return (
              <div
                key={pIdx}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isLocked ? 'border-slate-200 opacity-60' : 'border-slate-200/90'
                }`}
              >
                {/* Phase Header */}
                <div
                  onClick={() => setExpandedPhases(prev => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                  className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isLocked
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-teal-600 text-white'
                    }`}>
                      {status === 'COMPLETED' ? <Check className="w-4 h-4 stroke-[3]" /> : pIdx + 1}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          PHASE {phase.phaseNumber || pIdx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">• {phase.duration}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : isLocked
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {phase.phaseTitle || phase.phase}
                      </h3>
                    </div>
                  </div>

                  <div className="p-1 rounded-xl bg-slate-100 text-slate-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Phase Content */}
                {isExpanded && (
                  <div className="px-5 sm:px-7 pb-7 pt-2 border-t border-slate-100 space-y-6 animate-fade-slide">
                    {/* Daily Tasks List with Expandable Subtopics */}
                    <div className="space-y-3.5">
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
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              isDone
                                ? 'bg-emerald-50/40 border-emerald-200/90'
                                : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-teal-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(taskId)}
                                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                      : 'border-slate-300 bg-white hover:border-teal-500'
                                  }`}
                                >
                                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-black font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                                      DAY {task.dayNumber || tIdx + 1}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                      {formatEnum(task.activityType || 'STUDY')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{task.estimatedMinutes || 90}m</span>
                                    </span>
                                  </div>

                                  <h4 className={`text-sm font-bold mt-1.5 ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {task.title}
                                  </h4>
                                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    {task.description}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedTaskSubtopics(prev => ({ ...prev, [taskId]: !prev[taskId] }))}
                                className="text-xs font-semibold text-teal-700 hover:text-teal-900 p-1.5 rounded-xl hover:bg-teal-50 transition cursor-pointer shrink-0"
                              >
                                {isSubtopicsExpanded ? 'Hide Subtopics' : `Subtopics (${taskContent.subtopics.length})`}
                              </button>
                            </div>

                            {/* Expandable Subtopics Accordion */}
                            {isSubtopicsExpanded && (
                              <div className="mt-4 pt-3.5 border-t border-slate-200/70 space-y-3 animate-fade-slide">
                                {/* Subtopics Checklist */}
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                    Subtopic Checklist
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {taskContent.subtopics.map((sub, sIdx) => {
                                      const subKey = `${taskId}-sub-${sIdx}`;
                                      const isSubDone = Boolean(completedSubtopics[subKey]);

                                      return (
                                        <button
                                          key={sIdx}
                                          type="button"
                                          onClick={() => handleToggleSubtopic(taskId, sIdx, taskContent.subtopics.length)}
                                          className={`p-2.5 rounded-xl border text-xs text-left transition cursor-pointer flex items-center space-x-2 ${
                                            isSubDone
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                            isSubDone
                                              ? 'bg-emerald-600 border-emerald-600 text-white'
                                              : 'border-slate-300 bg-white'
                                          }`}>
                                            {isSubDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </div>
                                          <span className={isSubDone ? 'line-through text-slate-400' : ''}>
                                            {sub}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Practice & Self Assessment */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {taskContent.practiceTasks && (
                                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                                      <span className="font-bold text-indigo-900 block mb-1">Practical Exercises:</span>
                                      <ul className="list-disc pl-4 text-indigo-950 space-y-0.5">
                                        {taskContent.practiceTasks.map((prac, pIdx) => (
                                          <li key={pIdx}>{prac}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {taskContent.quizQuestion && (
                                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 text-xs">
                                      <span className="font-bold text-teal-900 block mb-1">Quiz Self-Check:</span>
                                      <p className="text-teal-950 italic">{taskContent.quizQuestion}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CURATED LEARNING RESOURCES */}
      {roadmap.learningResources && roadmap.learningResources.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Curated Learning Resources</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified documentation and code sandboxes curated specifically for this curriculum.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {roadmap.learningResources.map((res, rIdx) => (
              <a
                key={rIdx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60 uppercase">
                      {res.type || 'DOCUMENTATION'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 mt-2">{res.title}</h3>
                  {res.relevance && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{res.relevance}</p>
                  )}
                </div>
                <div className="mt-3 text-[10px] text-teal-600 font-bold flex items-center space-x-1 truncate">
                  <span>Visit resource ↗</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {/* Regeneration Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Confirm Roadmap Regeneration</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Regenerating replaces this roadmap and resets your {Object.keys(completedTasks).filter(k => completedTasks[k]).length} completed tasks. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                disabled={regenerating}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
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
                disabled={regenerating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveRoadmap;
