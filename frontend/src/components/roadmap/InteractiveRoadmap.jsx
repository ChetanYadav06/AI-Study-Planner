import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Download,
  RotateCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Award,
  ShieldCheck,
  Compass,
  CheckCheck,
  Code,
  FileCheck2,
  ListTodo,
  Layers,
  HelpCircle,
  Flag,
  Target
} from 'lucide-react';

export const InteractiveRoadmap = ({
  roadmap,
  goal,
  onSyncGoalProgress,
  onRegenerate,
  onSaveAsGoal,
  onBack,
  onProgressUpdate,
  isModal = false
}) => {
  if (!roadmap) return null;

  const stableId = roadmap.id || `${roadmap.topic}_${roadmap.targetDays}`;
  const storageKey = `ai_roadmap_progress_${stableId}`;
  const legacyStorageKey = `ai_roadmap_milestones_${roadmap.topic}_${roadmap.targetDays}`;

  // Initial load from localStorage
  const [progressData, setProgressData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
      // Fallback check legacy key
      const legacy = localStorage.getItem(legacyStorageKey);
      if (legacy) {
        return { completedMilestones: JSON.parse(legacy), completedTasks: {} };
      }
    } catch (e) {
      console.error('Error loading progress data', e);
    }
    return { completedMilestones: {}, completedTasks: {} };
  });

  const completedMilestones = progressData.completedMilestones || {};
  const completedTasks = progressData.completedTasks || {};

  // Expand state for phases
  const [expandedPhases, setExpandedPhases] = useState(() => {
    const initial = {};
    roadmap.phases?.forEach((_, idx) => {
      initial[idx] = idx === 0; // First phase expanded by default for scanning ease
    });
    return initial;
  });

  // Expand state for individual daily tasks
  const [expandedTasks, setExpandedTasks] = useState({});

  const [copied, setCopied] = useState(false);
  const [syncingGoal, setSyncingGoal] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Compute all tasks and milestones count
  const { allTasks, allMilestones, totalTasksCount, totalMilestonesCount } = useMemo(() => {
    const tasks = [];
    const milestones = [];
    roadmap.phases?.forEach((phase, pIdx) => {
      phase.dailyTasks?.forEach((task, tIdx) => {
        tasks.push({
          id: `${pIdx}-task-${task.dayNumber || tIdx}`,
          phaseIdx: pIdx,
          task
        });
      });
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
      totalMilestonesCount: milestones.length
    };
  }, [roadmap]);

  // Combined progress
  const completedTasksCount = allTasks.filter(t => completedTasks[t.id]).length;
  const completedMilestonesCount = allMilestones.filter(m => completedMilestones[m.id]).length;

  const totalTrackableItems = totalTasksCount + totalMilestonesCount;
  const completedTrackableItems = completedTasksCount + completedMilestonesCount;

  const progressPercent = totalTrackableItems > 0
    ? Math.round((completedTrackableItems / totalTrackableItems) * 100)
    : 0;

  // Determine current active phase
  const currentPhaseTitle = useMemo(() => {
    if (!roadmap.phases || roadmap.phases.length === 0) return 'General';
    for (let i = 0; i < roadmap.phases.length; i++) {
      const p = roadmap.phases[i];
      const pTasks = p.dailyTasks || [];
      const pMilestones = p.milestones || [];
      const pTasksDone = pTasks.every((t, ti) => completedTasks[`${i}-task-${t.dayNumber || ti}`]);
      const pMilestonesDone = pMilestones.every((_, mi) => completedMilestones[`${i}-${mi}`]);
      if (!pTasksDone || !pMilestonesDone) {
        return p.phaseTitle || p.phase || `Phase ${i + 1}`;
      }
    }
    return 'Completed';
  }, [roadmap, completedTasks, completedMilestones]);

  // Persist progress and notify parent
  const saveProgress = (newMilestones, newTasks) => {
    const updated = {
      completedMilestones: newMilestones,
      completedTasks: newTasks
    };
    setProgressData(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save roadmap progress', e);
    }

    const cTasks = allTasks.filter(t => newTasks[t.id]).length;
    const cMilestones = allMilestones.filter(m => newMilestones[m.id]).length;
    const total = totalTasksCount + totalMilestonesCount;
    const percent = total > 0 ? Math.round(((cTasks + cMilestones) / total) * 100) : 0;

    if (onProgressUpdate) {
      onProgressUpdate({
        roadmapId: roadmap.id,
        progressPercent: percent,
        completedTasksCount: cTasks,
        totalTasksCount,
        completedMilestonesCount: cMilestones,
        totalMilestonesCount,
        currentPhase: currentPhaseTitle
      });
    }
  };

  const toggleTask = (taskId, e) => {
    if (e) e.stopPropagation();
    const nextTasks = { ...completedTasks, [taskId]: !completedTasks[taskId] };
    saveProgress(completedMilestones, nextTasks);
  };

  const toggleMilestone = (milestoneId, e) => {
    if (e) e.stopPropagation();
    const nextMilestones = { ...completedMilestones, [milestoneId]: !completedMilestones[milestoneId] };
    saveProgress(nextMilestones, completedTasks);
  };

  const togglePhase = (idx) => {
    setExpandedPhases(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleTaskExpand = (taskId, e) => {
    if (e) e.stopPropagation();
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const expandAllPhases = () => {
    const next = {};
    roadmap.phases?.forEach((_, idx) => { next[idx] = true; });
    setExpandedPhases(next);
  };

  const collapseAllPhases = () => {
    setExpandedPhases({});
  };

  const handleSyncWithGoal = async () => {
    if (!goal || !onSyncGoalProgress) return;
    setSyncingGoal(true);
    try {
      await onSyncGoalProgress(goal.id, progressPercent);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to sync progress with goal', err);
    } finally {
      setSyncingGoal(false);
    }
  };

  const handleCopyMarkdown = () => {
    const content = generateMarkdownFromRoadmap(roadmap, progressPercent);
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadMarkdown = () => {
    const content = generateMarkdownFromRoadmap(roadmap, progressPercent);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roadmap.topic.replace(/[^a-zA-Z0-9]/g, '_')}_Roadmap.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSkillBadge = (level) => {
    const map = {
      BEGINNER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      INTERMEDIATE: 'bg-blue-50 text-blue-700 border-blue-200',
      ADVANCED: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return map[level] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'PRACTICE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REVISION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ASSESSMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'STUDY':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const totalCalculatedHours = roadmap.totalStudyHours || Math.round((roadmap.targetDays || 14) * (roadmap.hoursPerDay || 2));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Navigation Bar (Back to Roadmaps & Linked Goal) ── */}
      {onBack && (
        <div className="flex items-center justify-between pb-2">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to My Roadmaps Studio</span>
          </button>

          {goal && (
            <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>Linked to Goal: <strong className="text-slate-800">{goal.title}</strong></span>
            </span>
          )}
        </div>
      )}

      {/* ── Section A: Compact Roadmap Summary Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>AI Personalized Curriculum</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getSkillBadge(roadmap.skillLevel)}`}>
                {roadmap.skillLevel || 'INTERMEDIATE'}
              </span>
              {goal && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Goal: {goal.title}
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              {roadmap.topic}
            </h2>

            {roadmap.overview && (
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-3xl pt-1">
                {roadmap.overview}
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Copy Roadmap as Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Download as .md file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                title="Re-run AI generation"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-semibold">Total Duration</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900">{roadmap.targetDays} Days</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold">Daily Commitment</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900">{roadmap.hoursPerDay} hrs/day</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold">Planned Study Time</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900">{totalCalculatedHours} Hours</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-semibold">Completion</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-blue-700">{progressPercent}%</p>
              <span className="text-[10px] text-slate-400 font-medium">
                {completedTasksCount}/{totalTasksCount} tasks
              </span>
            </div>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
              <span>Overall Curriculum Progress</span>
              <span className="text-slate-400 font-normal">
                ({completedTrackableItems} of {totalTrackableItems} tasks & milestones checked)
              </span>
            </span>
            <span className="font-bold text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Feasibility Note & Goal Sync */}
        {(roadmap.feasibilityNote || goal) && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-blue-50/50 border border-blue-100 rounded-xl p-3">
            {roadmap.feasibilityNote && (
              <p className="text-slate-700 leading-relaxed font-normal">
                <strong className="text-blue-900 font-semibold">Feasibility Guidance: </strong>
                {roadmap.feasibilityNote}
              </p>
            )}

            {goal && (
              <button
                onClick={handleSyncWithGoal}
                disabled={syncingGoal || syncSuccess}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 transition disabled:opacity-50 cursor-pointer"
              >
                {syncSuccess ? (
                  <><Check className="w-3.5 h-3.5" /><span>Synced!</span></>
                ) : (
                  <><TrendingUp className="w-3.5 h-3.5" /><span>{syncingGoal ? 'Syncing...' : 'Sync with Goal'}</span></>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Prerequisites Checklist ── */}
      {roadmap.prerequisites && roadmap.prerequisites.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
            <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Required Foundations & Prerequisites</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {roadmap.prerequisites.map((pre, pidx) => (
              <span
                key={pidx}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{pre}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Section B: Interactive Phase Timeline & Expandable Daily Tasks ── */}
      {roadmap.phases && roadmap.phases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Curriculum Phases ({roadmap.phases.length})
              </h3>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={expandAllPhases}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Expand all
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={collapseAllPhases}
                className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {roadmap.phases.map((phase, pIdx) => {
              const isExpanded = !!expandedPhases[pIdx];
              const phaseMilestones = phase.milestones || [];
              const phaseTasks = phase.dailyTasks || [];

              const phaseCompletedTasks = phaseTasks.filter(
                (t, tIdx) => completedTasks[`${pIdx}-task-${t.dayNumber || tIdx}`]
              ).length;
              const phaseCompletedMilestones = phaseMilestones.filter(
                (_, mIdx) => completedMilestones[`${pIdx}-${mIdx}`]
              ).length;

              const totalPhaseItems = phaseTasks.length + phaseMilestones.length;
              const completedPhaseItems = phaseCompletedTasks + phaseCompletedMilestones;
              const isPhaseComplete = totalPhaseItems > 0 && completedPhaseItems === totalPhaseItems;
              const isPhaseCurrent = !isPhaseComplete && completedPhaseItems > 0;

              return (
                <div
                  key={pIdx}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isPhaseComplete
                      ? 'border-emerald-200 shadow-xs'
                      : isExpanded
                      ? 'border-blue-200 shadow-md ring-1 ring-blue-100'
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Phase Header */}
                  <div
                    onClick={() => togglePhase(pIdx)}
                    className="p-5 flex items-center justify-between cursor-pointer select-none bg-white hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                      {/* Phase Number Badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isPhaseComplete
                            ? 'bg-emerald-500 text-white'
                            : isPhaseCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isPhaseComplete ? <Check className="w-4 h-4" /> : pIdx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {phase.phaseTitle || phase.phase}
                          </h4>
                          {(phase.duration || phase.durationDays) && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold shrink-0">
                              {phase.duration || `${phase.durationDays} days`}
                            </span>
                          )}
                          {isPhaseComplete && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                              Completed
                            </span>
                          )}
                          {isPhaseCurrent && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold shrink-0">
                              In Progress
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {phaseCompletedTasks}/{phaseTasks.length} tasks completed • {phaseCompletedMilestones}/{phaseMilestones.length} milestones
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Phase Body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 space-y-6 border-t border-slate-100 bg-slate-50/40">
                      {/* Topics Chips */}
                      {phase.topics && phase.topics.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Curriculum Core Topics
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {phase.topics.map((t, ti) => (
                              <span
                                key={ti}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs hover:border-blue-300 hover:text-blue-700 transition"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subtopics if available */}
                      {phase.subtopics && phase.subtopics.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Detailed Subtopics & Concepts
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {phase.subtopics.map((st, sti) => (
                              <span
                                key={sti}
                                className="px-2 py-0.5 rounded-md bg-indigo-50/60 border border-indigo-100 text-indigo-700 text-[11px] font-medium"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Section C & D: Expandable Daily Tasks Breakdown ── */}
                      {phaseTasks.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                              <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                              <span>Day-by-Day Study Tasks ({phaseTasks.length})</span>
                            </p>
                            <span className="text-[10px] text-slate-400">Click task to expand study details</span>
                          </div>

                          <div className="space-y-2">
                            {phaseTasks.map((task, dIdx) => {
                              const taskId = `${pIdx}-task-${task.dayNumber || dIdx}`;
                              const isTaskDone = !!completedTasks[taskId];
                              const isTaskExpanded = !!expandedTasks[taskId];

                              return (
                                <div
                                  key={dIdx}
                                  className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                                    isTaskDone
                                      ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                                      : isTaskExpanded
                                      ? 'bg-white border-blue-300 shadow-sm'
                                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                  }`}
                                >
                                  {/* Task Summary Header */}
                                  <div
                                    onClick={(e) => toggleTaskExpand(taskId, e)}
                                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                                  >
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      {/* Task Completion Checkbox */}
                                      <button
                                        type="button"
                                        onClick={(e) => toggleTask(taskId, e)}
                                        className="shrink-0 p-0.5 text-slate-400 hover:text-emerald-600 transition"
                                        title={isTaskDone ? 'Mark as incomplete' : 'Mark as complete'}
                                      >
                                        {isTaskDone ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                          <Circle className="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
                                        )}
                                      </button>

                                      {/* Day Badge */}
                                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                        D{task.dayNumber || dIdx + 1}
                                      </span>

                                      {/* Title */}
                                      <h5 className={`text-xs font-bold truncate ${
                                        isTaskDone ? 'line-through text-emerald-800/80 font-medium' : 'text-slate-800'
                                      }`}>
                                        {task.title}
                                      </h5>
                                    </div>

                                    {/* Badges & Expand Chevron */}
                                    <div className="flex items-center space-x-2 shrink-0">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${getActivityBadge(task.activityType)}`}>
                                        {task.activityType || 'STUDY'}
                                      </span>
                                      {task.estimatedMinutes && (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                          {task.estimatedMinutes}m
                                        </span>
                                      )}
                                      <div className="text-slate-400">
                                        {isTaskExpanded ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Task Details Hierarchy (Expanded) */}
                                  {isTaskExpanded && (
                                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                                      {/* Instructions / Explanation */}
                                      {task.description && (
                                        <div>
                                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            Study Instructions & Concepts
                                          </p>
                                          <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                                            {task.description}
                                          </p>
                                        </div>
                                      )}

                                      {/* Action Checklist for Task */}
                                      <div className="flex items-center justify-between pt-1">
                                        <span className="text-[11px] text-slate-500">
                                          Estimated duration: <strong>{task.estimatedMinutes || 60} minutes</strong>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => toggleTask(taskId, e)}
                                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                            isTaskDone
                                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                              : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200'
                                          }`}
                                        >
                                          {isTaskDone ? '✓ Completed' : 'Mark Done'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Practical Exercises & Mini-Projects */}
                      {phase.practicalExercises && phase.practicalExercises.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                            <Code className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Hands-On Practical Exercises</span>
                          </p>
                          <div className="space-y-2">
                            {phase.practicalExercises.map((ex, eIdx) => (
                              <div
                                key={eIdx}
                                className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/40 to-blue-50/20 border border-indigo-100 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-indigo-950">
                                    {ex.title}
                                  </span>
                                  {ex.difficulty && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                                      {ex.difficulty}
                                    </span>
                                  )}
                                </div>
                                {ex.instructions && (
                                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                                    {ex.instructions}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Phase Assessment Milestone */}
                      {phase.assessment && (
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/60 to-orange-50/40 border border-amber-200/80 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <FileCheck2 className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                Phase Assessment Milestone: {phase.assessment.title}
                              </span>
                            </div>
                            {phase.assessment.type && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                                {phase.assessment.type}
                              </span>
                            )}
                          </div>
                          {phase.assessment.description && (
                            <p className="text-xs text-slate-800 leading-relaxed">
                              {phase.assessment.description}
                            </p>
                          )}
                          {phase.assessment.passingCriteria && (
                            <p className="text-[11px] text-amber-900 font-semibold pt-1 border-t border-amber-200/60">
                              ✓ Passing Criteria: {phase.assessment.passingCriteria}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Interactive Milestones Checklist */}
                      {phaseMilestones.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Phase Milestones (Click to check off)
                          </p>
                          <div className="space-y-1.5">
                            {phaseMilestones.map((m, mi) => {
                              const milestoneId = `${pIdx}-${mi}`;
                              const isChecked = !!completedMilestones[milestoneId];

                              return (
                                <div
                                  key={mi}
                                  onClick={(e) => toggleMilestone(milestoneId, e)}
                                  className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <div className="shrink-0 mt-0.5">
                                    {isChecked ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-xs leading-relaxed ${
                                      isChecked
                                        ? 'line-through text-emerald-800/80 font-medium'
                                        : 'font-normal'
                                    }`}
                                  >
                                    {m}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section F: Recommended Learning Resources ── */}
      {roadmap.learningResources && roadmap.learningResources.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Recommended Learning Resources ({roadmap.learningResources.length})</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roadmap.learningResources.map((res, rIdx) => (
              <a
                key={rIdx}
                href={res.url || `https://www.google.com/search?q=${encodeURIComponent(res.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-300 transition group cursor-pointer space-y-2 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-950 truncate">
                      {res.title}
                    </span>
                  </div>

                  {res.type && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold uppercase shrink-0">
                      {res.type}
                    </span>
                  )}
                </div>

                {res.relevance && (
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {res.relevance}
                  </p>
                )}

                <div className="flex items-center space-x-1 text-[11px] text-emerald-600 font-semibold group-hover:underline">
                  <span>Visit resource link</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Markdown exporter helper
function generateMarkdownFromRoadmap(roadmap, progressPercent = 0) {
  let md = `# ${roadmap.topic} — AI Study Roadmap\n\n`;
  md += `**Skill Level:** ${roadmap.skillLevel || 'INTERMEDIATE'}  \n`;
  md += `**Target Duration:** ${roadmap.targetDays} days  \n`;
  md += `**Daily Commitment:** ${roadmap.hoursPerDay} hrs/day  \n`;
  md += `**Total Study Hours:** ${roadmap.totalStudyHours || Math.round((roadmap.targetDays || 14) * (roadmap.hoursPerDay || 2))} hours  \n`;
  md += `**Overall Progress:** ${progressPercent}%  \n\n`;

  if (roadmap.overview) {
    md += `## Overview\n\n${roadmap.overview}\n\n`;
  }

  if (roadmap.prerequisites?.length > 0) {
    md += `## Prerequisites\n\n`;
    roadmap.prerequisites.forEach(p => { md += `- [ ] ${p}\n`; });
    md += `\n`;
  }

  if (roadmap.phases?.length > 0) {
    md += `## Curriculum Phases\n\n`;
    roadmap.phases.forEach((p, idx) => {
      md += `### Phase ${idx + 1}: ${p.phaseTitle || p.phase} (${p.duration || `${p.durationDays} days`})\n\n`;
      if (p.topics?.length > 0) {
        md += `**Core Topics:** ${p.topics.join(', ')}\n\n`;
      }
      if (p.dailyTasks?.length > 0) {
        md += `#### Daily Study Tasks\n`;
        p.dailyTasks.forEach(t => {
          md += `- [ ] **Day ${t.dayNumber}:** ${t.title} (${t.estimatedMinutes || 60}m - ${t.activityType || 'STUDY'})\n  ${t.description || ''}\n`;
        });
        md += `\n`;
      }
      if (p.milestones?.length > 0) {
        md += `#### Milestones\n`;
        p.milestones.forEach(m => { md += `- [ ] ${m}\n`; });
        md += `\n`;
      }
    });
  }

  if (roadmap.learningResources?.length > 0) {
    md += `## Recommended Resources\n\n`;
    roadmap.learningResources.forEach(r => {
      md += `- [${r.title}](${r.url || '#'}) - *${r.type || 'Resource'}*: ${r.relevance || ''}\n`;
    });
    md += `\n`;
  }

  return md;
}

export default InteractiveRoadmap;
