import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  AlertCircle,
  Check,
  ChevronRight,
  X,
  Loader2,
  Map,
  Plus,
  BookOpen,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import {
  getGoals,
  getDashboardStats,
  updateGoalStatus,
  deleteGoal,
  generateRoadmap,
  getSavedRoadmaps,
  updateRoadmapProgress,
  getStudySessionsSummary,
  getStudentProfile
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { InteractiveRoadmap } from '../roadmap/InteractiveRoadmap';
import { computeGoalStats } from '../../utils/goalStats';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { formatEnum } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusText } from '../ui/StatusText';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';

export const StudentDashboard = ({ onNavigateTab, onOpenCreateGoal, onNavigateRoadmap }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [profile, setProfile] = useState(null);
  const [todayLoggedMinutes, setTodayLoggedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedGoalForRoadmap, setSelectedGoalForRoadmap] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Roadmap generation state
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState(null);
  const [generatedRoadmap, setGeneratedRoadmap] = useState(null);
  const [existingSavedRoadmap, setExistingSavedRoadmap] = useState(null);
  const [roadmapPrefs, setRoadmapPrefs] = useState({
    skillLevel: 'INTERMEDIATE',
    targetDays: 30,
    hoursPerDay: 2.0,
    priorKnowledge: '',
    specificTopics: '',
    targetOutcomes: '',
    showPersonalization: false,
  });

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const from = `${todayIso}T00:00:00`;
      const to = `${todayIso}T23:59:59`;

      const [goalsData, statsData, roadmapsData, sessionSummary, profileData] = await Promise.all([
        getGoals().catch(() => []),
        getDashboardStats().catch(() => null),
        getSavedRoadmaps().catch(() => []),
        getStudySessionsSummary({ from, to }).catch(() => null),
        getStudentProfile().catch(() => null)
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setStats(statsData || null);
      setSavedRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : []);
      setTodayLoggedMinutes(sessionSummary?.totalMinutes ?? 0);
      setProfile(profileData || null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load your dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute shared goal stats
  const goalStats = useMemo(() => computeGoalStats(goals), [goals]);

  // Compute stats dynamically
  const computedStats = useMemo(() => {
    const total = stats?.totalGoals ?? goalStats.totalGoals;
    const active = stats?.activeGoals ?? goalStats.activeGoals;
    const completed = stats?.completedGoals ?? goalStats.completedGoals;

    const dailyHours = stats?.dailyTargetHours ?? goalStats.activeGoalsList.reduce(
      (acc, g) => acc + (Number(g.hoursPerDay) || 0),
      0
    );

    return {
      totalGoals: total,
      activeGoals: active,
      completedGoals: completed,
      dailyTargetHours: Math.round(dailyHours * 10) / 10,
    };
  }, [goals, stats, goalStats]);

  // Active saved roadmap for primary study queue
  const primaryRoadmap = useMemo(() => {
    if (!savedRoadmaps || savedRoadmaps.length === 0) return null;
    const activeGoal = goals.find(g => g.status === 'IN_PROGRESS');
    if (activeGoal) {
      const found = savedRoadmaps.find(r => r.goalId === activeGoal.id);
      if (found) return found;
    }
    return savedRoadmaps[0];
  }, [savedRoadmaps, goals]);

  // Parse primary roadmap JSON & completed tasks
  const { allRoadmapTasks, parsedRoadmap } = useMemo(() => {
    if (!primaryRoadmap) return { allRoadmapTasks: [], parsedRoadmap: null };

    let parsed = primaryRoadmap;
    if (primaryRoadmap.roadmapJson) {
      try {
        parsed = typeof primaryRoadmap.roadmapJson === 'string'
          ? JSON.parse(primaryRoadmap.roadmapJson)
          : primaryRoadmap.roadmapJson;
      } catch {
        parsed = primaryRoadmap;
      }
    }

    let completedSet = new Set();
    if (primaryRoadmap.completedTasksJson) {
      try {
        const arr = JSON.parse(primaryRoadmap.completedTasksJson);
        if (Array.isArray(arr)) completedSet = new Set(arr);
      } catch {}
    }

    const tasks = [];
    const phases = parsed.phases || [];
    phases.forEach((phase, pIdx) => {
      const dailyTasks = phase.dailyTasks || [];
      const suffixCounts = {};
      dailyTasks.forEach((task, tIdx) => {
        const taskId = getCanonicalTaskId(pIdx, task, tIdx, suffixCounts);
        const isDone = completedSet.has(taskId);
        const dayNumber = Number(task.dayNumber) || (tIdx + 1);

        tasks.push({
          taskId,
          dayNumber,
          phaseIdx: pIdx,
          phaseTitle: phase.phaseTitle || phase.phase || `Phase ${pIdx + 1}`,
          task,
          isDone,
          estimatedMinutes: task.estimatedMinutes != null && !isNaN(task.estimatedMinutes) ? Number(task.estimatedMinutes) : 90
        });
      });
    });

    return { allRoadmapTasks: tasks, parsedRoadmap: parsed };
  }, [primaryRoadmap]);

  // Study schedule preference (default: 5 days/week -> Mon-Fri)
  const availableDaysCount = Math.max(1, Math.min(7, profile?.availableDaysPerWeek ?? 5));

  const isStudyDayIndex = (dayIndex) => {
    const mondayBased = (dayIndex + 6) % 7;
    return mondayBased < availableDaysCount;
  };

  // Group all tasks by dayNumber
  const tasksByDayNumber = useMemo(() => {
    const map = new Map();
    allRoadmapTasks.forEach(t => {
      if (!map.has(t.dayNumber)) {
        map.set(t.dayNumber, []);
      }
      map.get(t.dayNumber).push(t);
    });
    return Array.from(map.entries()).map(([dayNum, tasks]) => ({
      dayNumber: dayNum,
      tasks,
      totalMinutes: tasks.reduce((sum, item) => sum + item.estimatedMinutes, 0),
      isCompleted: tasks.every(t => t.isDone)
    }));
  }, [allRoadmapTasks]);

  // Map weekly calendar days to scheduled roadmap days
  const weeklySchedule = useMemo(() => {
    const todayIndex = new Date().getDay();
    const scheduleByDay = {};

    // Find the next incomplete roadmap day or start from Day 1
    const firstIncompleteIdx = tasksByDayNumber.findIndex(d => !d.isCompleted);
    let startDayIdx = firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0;
    let studyDaySlotCounter = startDayIdx;

    for (let offset = 0; offset < 7; offset++) {
      const currentDayIdx = (todayIndex + offset) % 7;
      const isStudy = isStudyDayIndex(currentDayIdx);

      if (isStudy) {
        const assignedRoadmapDay = tasksByDayNumber[studyDaySlotCounter] || null;
        scheduleByDay[currentDayIdx] = {
          isStudyDay: true,
          roadmapDay: assignedRoadmapDay,
          plannedMinutes: assignedRoadmapDay ? assignedRoadmapDay.totalMinutes : 0
        };
        studyDaySlotCounter++;
      } else {
        scheduleByDay[currentDayIdx] = {
          isStudyDay: false,
          roadmapDay: null,
          plannedMinutes: 0
        };
      }
    }

    return scheduleByDay;
  }, [tasksByDayNumber, availableDaysCount]);

  const selectedDayInfo = weeklySchedule[selectedDay] || { isStudyDay: false, roadmapDay: null, plannedMinutes: 0 };
  const selectedDayTasks = selectedDayInfo.roadmapDay?.tasks || [];
  const selectedDayCompletedCount = selectedDayTasks.filter(t => t.isDone).length;

  // Toggle task completion from dashboard
  const handleToggleTask = async (taskItem) => {
    if (!primaryRoadmap) return;

    try {
      const currentCompleted = primaryRoadmap.completedTasksJson
        ? JSON.parse(primaryRoadmap.completedTasksJson)
        : [];
      const updated = currentCompleted.includes(taskItem.taskId)
        ? currentCompleted.filter(id => id !== taskItem.taskId)
        : [...currentCompleted, taskItem.taskId];

      await updateRoadmapProgress(primaryRoadmap.id, {
        completedTasksJson: JSON.stringify(updated),
        completedMilestonesJson: primaryRoadmap.completedMilestonesJson || '[]',
        progressPercentage: primaryRoadmap.progressPercentage || 0
      });

      await loadDashboardData();
      setActionMessage(`Updated task "${taskItem.task.title}".`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Filtered goals
  const filteredGoals = useMemo(() => {
    const statusWeight = { IN_PROGRESS: 1, NOT_STARTED: 2, COMPLETED: 3, ARCHIVED: 4 };
    let result = [...goals];
    if (statusFilter !== 'ALL') {
      result = result.filter((g) => g.status === statusFilter);
    }
    return result.sort((a, b) => {
      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;
      if (weightA !== weightB) return weightA - weightB;
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }, [goals, statusFilter]);

  // Goal actions
  const handleUpdateProgress = async (goal, delta) => {
    const newProgress = Math.min(100, Math.max(0, (goal.progressPercentage || 0) + delta));
    const newStatus =
      newProgress === 100
        ? 'COMPLETED'
        : newProgress > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED';

    try {
      const updated = await updateGoalStatus(goal.id, {
        progressPercentage: newProgress,
        status: newStatus,
      });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      const freshStats = await getDashboardStats().catch(() => null);
      if (freshStats) setStats(freshStats);
      setActionMessage(`Updated "${goal.title}" to ${newProgress}%.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleSetExactProgress = async (goal, progress) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    const newStatus =
      newProgress === 100
        ? 'COMPLETED'
        : newProgress > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED';

    try {
      const updated = await updateGoalStatus(goal.id, {
        progressPercentage: newProgress,
        status: newStatus,
      });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      const freshStats = await getDashboardStats().catch(() => null);
      if (freshStats) setStats(freshStats);
      setActionMessage(`Marked "${goal.title}" as complete.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleStatusChange = async (goal, newStatus) => {
    const newProgress =
      newStatus === 'COMPLETED'
        ? 100
        : newStatus === 'NOT_STARTED'
        ? 0
        : goal.progressPercentage;

    try {
      const updated = await updateGoalStatus(goal.id, {
        status: newStatus,
        progressPercentage: newProgress,
      });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      const freshStats = await getDashboardStats().catch(() => null);
      if (freshStats) setStats(freshStats);
      setActionMessage(`Status of "${goal.title}" changed to ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this learning goal?')) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
      const freshStats = await getDashboardStats().catch(() => null);
      if (freshStats) setStats(freshStats);
      setActionMessage('Learning goal deleted successfully.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleOpenRoadmap = (goal) => {
    if (onNavigateRoadmap) {
      onNavigateRoadmap(goal);
      return;
    }
    setSelectedGoalForRoadmap(goal);
    setRoadmapError(null);
    setRoadmapPrefs({
      skillLevel: goal.skillLevel || 'INTERMEDIATE',
      targetDays: goal.targetDays || 30,
      hoursPerDay: goal.hoursPerDay || 2.0,
      priorKnowledge: '',
      specificTopics: goal.specificTopics || '',
      targetOutcomes: goal.targetOutcome || '',
      showPersonalization: Boolean(goal.specificTopics || goal.targetOutcome),
    });

    const match = savedRoadmaps.find(r => r.goalId === goal.id || r.topic === goal.title);
    if (match) {
      try {
        const parsed = JSON.parse(match.roadmapJson);
        setExistingSavedRoadmap(match);
        setGeneratedRoadmap(parsed);
      } catch {
        setExistingSavedRoadmap(null);
        setGeneratedRoadmap(null);
      }
    } else {
      setExistingSavedRoadmap(null);
      setGeneratedRoadmap(null);
    }
  };

  const handleCloseRoadmap = () => {
    setSelectedGoalForRoadmap(null);
    setGeneratedRoadmap(null);
    setExistingSavedRoadmap(null);
    setRoadmapError(null);
    setRoadmapLoading(false);
  };

  const handleGenerateRoadmap = async () => {
    if (!selectedGoalForRoadmap) return;
    setRoadmapLoading(true);
    setRoadmapError(null);
    try {
      const result = await generateRoadmap({
        topic: selectedGoalForRoadmap.title,
        description: selectedGoalForRoadmap.description || '',
        skillLevel: roadmapPrefs.skillLevel,
        targetDays: Number(roadmapPrefs.targetDays),
        hoursPerDay: Number(roadmapPrefs.hoursPerDay),
        goalId: selectedGoalForRoadmap.id,
        specificTopics: roadmapPrefs.specificTopics?.trim() || undefined,
        targetOutcomes: roadmapPrefs.targetOutcomes?.trim() || undefined,
        priorKnowledge: roadmapPrefs.priorKnowledge?.trim() || undefined,
      });

      result.id = result.id || `roadmap_${Date.now()}`;
      setGeneratedRoadmap(result);

      if (selectedGoalForRoadmap.status === 'NOT_STARTED') {
        try {
          const updated = await updateGoalStatus(selectedGoalForRoadmap.id, {
            status: 'IN_PROGRESS',
            progressPercentage: selectedGoalForRoadmap.progressPercentage,
          });
          setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        } catch (_) { /* non-critical */ }
      }
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setRoadmapError(
        err?.response?.data?.message ||
        'Failed to generate roadmap. Please check your Gemini connection and try again.'
      );
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleSyncGoalProgress = async (goalId, newProgress) => {
    try {
      const updated = await updateGoalStatus(goalId, {
        progressPercentage: newProgress,
        status: newProgress === 100 ? 'COMPLETED' : newProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
      });
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (selectedGoalForRoadmap && selectedGoalForRoadmap.id === goalId) {
        setSelectedGoalForRoadmap(updated);
      }
    } catch (err) {
      console.error('Failed to sync progress with goal:', err);
    }
  };

  const formatGoalStatus = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <StatusText status="success">Completed</StatusText>;
      case 'IN_PROGRESS':
        return <StatusText status="accent">In progress</StatusText>;
      case 'ARCHIVED':
        return <StatusText status="neutral">Archived</StatusText>;
      case 'NOT_STARTED':
      default:
        return <StatusText status="neutral">Not started</StatusText>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. GREETING & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
            {getGreeting()}, {user?.name || 'Scholar'}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {todayFormatted}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (onOpenCreateGoal) {
                onOpenCreateGoal();
              } else {
                setIsCreateModalOpen(true);
              }
            }}
          >
            Create Goal
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
          >
            Create AI Roadmap
          </Button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-3 rounded-md bg-accent-soft border border-accent/20 text-accent text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-accent hover:underline cursor-pointer text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="font-medium hover:underline cursor-pointer text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. STATS STRIP: ONE BORDERED STRIP WITH 4 VALUES */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line rounded-lg bg-white divide-y md:divide-y-0 md:divide-x divide-line">
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted">Total goals</p>
          <p className="text-2xl font-semibold text-ink mt-1">{computedStats.totalGoals}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted">Active goals</p>
          <p className="text-2xl font-semibold text-accent mt-1">{computedStats.activeGoals}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted">Completed goals</p>
          <p className="text-2xl font-semibold text-success mt-1">{computedStats.completedGoals}</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted">Daily target</p>
          <p className="text-base sm:text-lg font-semibold text-ink mt-1">
            Today: {(todayLoggedMinutes / 60).toFixed(1)} of {computedStats.dailyTargetHours} h
          </p>
        </div>
      </div>

      {/* 3. PLANNED TASKS FOR SELECTED DAY (WEEKLY CALENDAR) */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Planned tasks for {daysOfWeek[selectedDay]}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {primaryRoadmap ? (
                <span>
                  From active roadmap: <strong>{primaryRoadmap.topic || primaryRoadmap.title}</strong>
                </span>
              ) : (
                'No active roadmap found. Create a roadmap to schedule tasks.'
              )}
            </p>
          </div>

          {selectedDayTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-accent">
                {selectedDayCompletedCount} of {selectedDayTasks.length} completed
              </span>
              <span className="text-xs text-muted">({selectedDayInfo.plannedMinutes} min planned)</span>
            </div>
          )}
        </div>

        {/* Days Selector Strip */}
        <div className="grid grid-cols-7 gap-1 p-1 bg-page rounded-md border border-line">
          {daysOfWeek.map((dayName, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = new Date().getDay() === idx;
            const daySched = weeklySchedule[idx];
            const isRest = !daySched?.isStudyDay;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDay(idx)}
                className={`p-2.5 rounded-sm text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : isRest
                    ? 'bg-page text-muted hover:bg-slate-100'
                    : 'hover:bg-surface text-ink'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                  {shortDays[idx]}
                </span>
                <span className="text-xs font-semibold mt-0.5">
                  {isToday ? 'Today' : `D${idx + 1}`}
                </span>
                <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/90' : isRest ? 'text-muted' : 'text-accent'}`}>
                  {isRest ? 'Rest' : 'Study'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Task List for Selected Day */}
        {selectedDayInfo.isStudyDay ? (
          selectedDayTasks.length > 0 ? (
            <div className="space-y-3 pt-1">
              {selectedDayInfo.roadmapDay && (
                <div className="p-2.5 bg-page rounded-md border border-line flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">
                    Roadmap Day {selectedDayInfo.roadmapDay.dayNumber} focus
                  </span>
                  <span className="text-muted font-mono">
                    {selectedDayInfo.plannedMinutes} mins estimated
                  </span>
                </div>
              )}

              {selectedDayTasks.map((item) => (
                <div
                  key={item.taskId}
                  className={`p-4 rounded-md border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.isDone
                      ? 'border-line bg-page/60 text-muted'
                      : 'border-line bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(item)}
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 mt-0.5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                        item.isDone
                          ? 'bg-accent border-accent text-white'
                          : 'border-line bg-white hover:border-accent'
                      }`}
                      title={item.isDone ? 'Mark incomplete' : 'Mark done'}
                      aria-label={item.isDone ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {item.isDone && <Check className="w-3.5 h-3.5 stroke-2" />}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold ${item.isDone ? 'line-through text-muted' : 'text-ink'}`}>
                          {item.task.title}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-accent/20">
                          {formatEnum(item.task.activityType || 'Study')}
                        </span>
                        <span className="text-xs text-muted flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{item.estimatedMinutes} min</span>
                        </span>
                        <span className="text-xs text-muted">
                          • {item.phaseTitle}
                        </span>
                      </div>

                      {item.task.description && (
                        <p className={`text-xs leading-relaxed ${item.isDone ? 'text-muted/80' : 'text-muted'}`}>
                          {item.task.description}
                        </p>
                      )}

                      {/* Subtopics and Learning Objectives Chips */}
                      {((item.task.subtopics && item.task.subtopics.length > 0) || (item.task.learningObjectives && item.task.learningObjectives.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.task.subtopics?.map((sub, sIdx) => (
                            <span key={`sub-${sIdx}`} className="text-xs px-1.5 py-0.5 rounded bg-page text-muted border border-line">
                              {sub}
                            </span>
                          ))}
                          {item.task.learningObjectives?.map((obj, oIdx) => (
                            <span key={`obj-${oIdx}`} className="text-xs px-1.5 py-0.5 rounded bg-page text-ink border border-line">
                              Goal: {obj}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab('active-study')}
                      className="text-xs font-medium text-accent hover:underline cursor-pointer px-2.5 py-1.5 rounded-sm border border-accent/20 hover:bg-accent-soft transition"
                    >
                      Start Focus
                    </button>
                    {primaryRoadmap && (
                      <button
                        type="button"
                        onClick={() => onNavigateRoadmap && onNavigateRoadmap(primaryRoadmap)}
                        className="p-1.5 rounded-sm border border-line hover:border-slate-300 text-muted hover:text-ink transition cursor-pointer"
                        title="View in full roadmap"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted space-y-1">
              <CheckCircle2 className="w-7 h-7 mx-auto text-success mb-1" />
              <p className="text-sm font-semibold text-ink">All tasks for {daysOfWeek[selectedDay]} are completed!</p>
              <p className="text-xs text-muted">You have finished all queued tasks for this study day.</p>
            </div>
          )
        ) : (
          <div className="py-8 text-center text-muted space-y-1.5 bg-page rounded-md border border-line">
            <Coffee className="w-7 h-7 mx-auto text-muted mb-1" />
            <p className="text-sm font-semibold text-ink">Scheduled Rest & Recovery Day</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Your profile is configured for {availableDaysCount} study days per week. Use this day to rest, reflect, or review past notes.
            </p>
          </div>
        )}
      </Card>

      {/* 4. GOALS: COMPACT CONSOLIDATED LIST */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Goals
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Your active learning targets and roadmaps
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'IN_PROGRESS', label: 'In progress' },
              { id: 'NOT_STARTED', label: 'Not started' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer min-h-9 ${
                  statusFilter === tab.id
                    ? 'bg-ink text-white'
                    : 'text-muted hover:text-ink hover:bg-page'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Goals List */}
        {filteredGoals.length > 0 ? (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const matchedRoadmap = savedRoadmaps.find(
                (r) => r.goalId === goal.id || r.topic === goal.title
              );

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-md border border-line bg-white hover:border-slate-300 transition-colors duration-150 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink truncate">
                          {goal.title}
                        </h3>
                        {formatGoalStatus(goal.status)}
                      </div>
                      {goal.description && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-1">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {matchedRoadmap ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (onNavigateRoadmap) {
                              onNavigateRoadmap(goal);
                            } else {
                              handleOpenRoadmap(goal);
                            }
                          }}
                        >
                          View Roadmap
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenRoadmap(goal)}
                        >
                          Generate Roadmap
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-muted hover:text-danger rounded-md hover:bg-page transition-colors duration-150 cursor-pointer"
                        title="Delete Goal"
                        aria-label={`Delete goal ${goal.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Numerical Percentage */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">
                        Progress: <strong className="text-ink">{goal.progressPercentage || 0}%</strong>
                      </span>
                      <span className="text-muted">
                        {goal.targetDays || 30} days · {goal.hoursPerDay || 2}h/day
                      </span>
                    </div>
                    <ProgressBar value={goal.progressPercentage || 0} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No goals found"
            description="Create your first study goal to start tracking progress."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (onOpenCreateGoal) {
                    onOpenCreateGoal();
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
              >
                Create Goal
              </Button>
            }
          />
        )}
      </Card>

      {/* Global Modals */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={() => {
          setIsCreateModalOpen(false);
          loadDashboardData();
        }}
      />

      {/* Inline Roadmap Generation / Inspection Modal if not navigated */}
      {selectedGoalForRoadmap && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4"
          onClick={handleCloseRoadmap}
        >
          <div
            className="bg-white rounded-lg w-full max-w-4xl border border-line my-8 overflow-hidden shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 className="text-base font-semibold text-ink">
                Roadmap: {selectedGoalForRoadmap.title}
              </h3>
              <button
                type="button"
                onClick={handleCloseRoadmap}
                className="p-1 rounded-md text-muted hover:text-ink cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {roadmapLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto mb-2" />
                  <p className="text-sm font-medium text-ink">
                    Generating curriculum roadmap with Gemini AI...
                  </p>
                  <p className="text-xs text-muted">
                    Calibrating daily tasks, exercises, and study schedule.
                  </p>
                </div>
              ) : generatedRoadmap ? (
                <InteractiveRoadmap
                  roadmap={generatedRoadmap}
                  goal={selectedGoalForRoadmap}
                  savedRoadmapId={existingSavedRoadmap?.id}
                  onBack={handleCloseRoadmap}
                  onProgressUpdate={(pct) => handleSyncGoalProgress(selectedGoalForRoadmap.id, pct)}
                  onRegenerate={handleGenerateRoadmap}
                />
              ) : (
                <div className="space-y-4">
                  {roadmapError && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-danger text-xs">
                      {roadmapError}
                    </div>
                  )}

                  <p className="text-sm text-muted">
                    No roadmap has been generated for this goal yet. Configure preferences or generate directly.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Target Days</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={roadmapPrefs.targetDays}
                        onChange={(e) => setRoadmapPrefs({ ...roadmapPrefs, targetDays: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Hours Per Day</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={roadmapPrefs.hoursPerDay}
                        onChange={(e) => setRoadmapPrefs({ ...roadmapPrefs, hoursPerDay: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-md border border-line focus:border-accent outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-line">
                    <Button variant="secondary" size="sm" onClick={handleCloseRoadmap}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleGenerateRoadmap}>
                      Generate Roadmap
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
