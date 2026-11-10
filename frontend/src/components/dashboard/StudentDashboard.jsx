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
  Plus
} from 'lucide-react';
import {
  getGoals,
  getDashboardStats,
  updateGoalStatus,
  deleteGoal,
  generateRoadmap,
  getSavedRoadmaps,
  updateRoadmapProgress,
  getStudySessionsSummary
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { InteractiveRoadmap } from '../roadmap/InteractiveRoadmap';
import { computeGoalStats } from '../../utils/goalStats';
import { computeStudyQueue } from '../../utils/studyQueue';
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
  const [todayLoggedMinutes, setTodayLoggedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedGoalForRoadmap, setSelectedGoalForRoadmap] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

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

      const [goalsData, statsData, roadmapsData, sessionSummary] = await Promise.all([
        getGoals().catch(() => []),
        getDashboardStats().catch(() => null),
        getSavedRoadmaps().catch(() => []),
        getStudySessionsSummary({ from, to }).catch(() => null)
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setStats(statsData || null);
      setSavedRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : []);
      setTodayLoggedMinutes(sessionSummary?.totalMinutes ?? 0);
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

  // Extract today's tasks and up-next tasks using shared studyQueue
  const studyQueue = useMemo(() => {
    if (!primaryRoadmap) {
      return { todayTasks: [], upNextTasks: [], todayDayNumber: null, upNextDays: [], currentFocusTask: null };
    }
    const queue = computeStudyQueue(primaryRoadmap);
    return {
      ...queue,
      todayTasks: queue.todayTasks.map(t => ({
        ...t,
        roadmapId: primaryRoadmap.id,
        roadmapTitle: primaryRoadmap.topic || primaryRoadmap.title
      })),
      upNextTasks: queue.upNextTasks.map(t => ({
        ...t,
        roadmapId: primaryRoadmap.id,
        roadmapTitle: primaryRoadmap.topic || primaryRoadmap.title
      }))
    };
  }, [primaryRoadmap]);

  const todayTasks = studyQueue.todayTasks;
  const upNextTasks = studyQueue.upNextTasks;

  // Toggle today's task
  const handleToggleTodayTask = async (taskItem) => {
    const roadmap = savedRoadmaps.find(r => r.id === taskItem.roadmapId);
    if (!roadmap) return;

    try {
      const currentCompleted = roadmap.completedTasksJson ? JSON.parse(roadmap.completedTasksJson) : [];
      const updated = currentCompleted.includes(taskItem.taskId)
        ? currentCompleted.filter(id => id !== taskItem.taskId)
        : [...currentCompleted, taskItem.taskId];

      await updateRoadmapProgress(roadmap.id, {
        completedTasksJson: JSON.stringify(updated),
        completedMilestonesJson: roadmap.completedMilestonesJson || '[]',
        progressPercentage: roadmap.progressPercentage || 0
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

      {/* 3. TODAY'S STUDY TASKS & UP NEXT */}
      {(todayTasks.length > 0 || upNextTasks.length > 0) && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Today's Tasks {studyQueue.todayDayNumber != null && `(Day ${studyQueue.todayDayNumber})`}
              </h2>
              <p className="text-xs text-muted mt-0.5">Tasks scheduled from your active roadmap</p>
            </div>
            {todayTasks.length > 0 && (
              <span className="text-xs text-muted">
                {todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>

          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map((item) => (
                <div
                  key={item.taskId}
                  className="p-3 rounded-md border border-line bg-white flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTodayTask(item)}
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                        item.isDone
                          ? 'bg-accent border-accent text-white'
                          : 'border-line bg-white hover:border-accent'
                      }`}
                      title={item.isDone ? 'Mark incomplete' : 'Mark done'}
                      aria-label={item.isDone ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {item.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 truncate">
                      <p className={`font-medium truncate ${item.isDone ? 'line-through text-muted' : 'text-ink'}`}>
                        {item.task.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                        <span>Day {item.task.dayNumber}</span>
                        <span>•</span>
                        <span>{formatEnum(item.task.activityType || 'Study')}</span>
                        {item.task.estimatedMinutes != null && (
                          <>
                            <span>•</span>
                            <span>{item.task.estimatedMinutes} min</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="truncate">{item.roadmapTitle}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateTab && onNavigateTab('active-study')}
                    className="text-xs font-medium text-accent hover:text-accent-hover hover:underline cursor-pointer shrink-0 min-h-[40px] px-2 flex items-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-xs text-muted">
              All tasks for today are completed.
            </p>
          )}

          {/* Up Next List */}
          {upNextTasks.length > 0 && (
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-medium text-ink">
                  Up Next {studyQueue.upNextDays?.length > 0 && `(Days ${studyQueue.upNextDays.join(' & ')})`}
                </span>
                <span>{upNextTasks.length} upcoming</span>
              </div>

              <div className="space-y-1.5">
                {upNextTasks.map((item) => (
                  <div
                    key={item.taskId}
                    className="p-2.5 rounded-md border border-line bg-page flex items-center justify-between gap-3 text-xs text-muted"
                  >
                    <div className="truncate">
                      <span className="font-medium text-ink mr-2">
                        Day {item.task.dayNumber}: {item.task.title}
                      </span>
                      <span>{formatEnum(item.task.activityType || 'Study')}</span>
                      {item.task.estimatedMinutes != null && (
                        <span className="ml-2">• {item.task.estimatedMinutes} min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer min-h-[36px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  statusFilter === tab.id
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-ink hover:bg-page'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Goals List Content */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">
            Loading learning goals...
          </div>
        ) : filteredGoals.length === 0 ? (
          <EmptyState
            title={goals.length === 0 ? 'No goals yet' : 'No goals match this filter'}
            description="Create a goal to begin organizing your study plan."
            action={
              goals.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create Goal
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const hasLinkedRoadmap = Boolean(
                goal.hasLinkedRoadmap || savedRoadmaps.some(r => r.goalId === goal.id)
              );

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-md border border-line bg-white hover:border-[#cbd5e1] transition-colors duration-150 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink truncate">
                          {goal.title}
                        </h3>
                        {formatGoalStatus(goal.status)}
                      </div>

                      <p className="text-xs text-muted flex items-center gap-2">
                        <span>{formatEnum(goal.skillLevel)}</span>
                        <span>•</span>
                        <span>{goal.priority || 'MEDIUM'} priority</span>
                        <span>•</span>
                        <span>{goal.targetDays} days</span>
                        <span>•</span>
                        <span>{goal.hoursPerDay}h/day</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenRoadmap(goal)}
                      >
                        {hasLinkedRoadmap ? 'View Roadmap' : 'Generate Roadmap'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-muted hover:text-danger p-2 min-h-[36px] min-w-[36px]"
                        title="Delete Goal"
                        aria-label="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-muted line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress & Manual Actions (only for goals without linked roadmap) */}
                  <div className="pt-2 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex-1 max-w-md flex items-center gap-3">
                      <span className="text-muted shrink-0 font-medium">
                        {goal.progressPercentage || 0}%
                      </span>
                      <ProgressBar
                        value={goal.progressPercentage || 0}
                        ariaLabel={`Progress for ${goal.title}`}
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasLinkedRoadmap ? (
                        <span className="text-xs text-muted">
                          Roadmap linked
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(goal, -10)}
                            className="px-2 py-1 text-xs font-medium rounded-md border border-line text-ink hover:bg-page transition-colors duration-150 cursor-pointer min-h-[32px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                            title="Decrease 10%"
                          >
                            -10%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(goal, 10)}
                            className="px-2 py-1 text-xs font-medium rounded-md border border-line text-ink hover:bg-page transition-colors duration-150 cursor-pointer min-h-[32px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                            title="Increase 10%"
                          >
                            +10%
                          </button>
                          {goal.progressPercentage < 100 && (
                            <button
                              type="button"
                              onClick={() => handleSetExactProgress(goal, 100)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors duration-150 cursor-pointer min-h-[32px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                              title="Mark complete"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* AI Roadmap Modal */}
      {selectedGoalForRoadmap && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl border border-line my-8 overflow-hidden shadow-md">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {generatedRoadmap ? 'AI Study Roadmap' : 'Generate Roadmap'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {selectedGoalForRoadmap.title}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRoadmap}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-page transition-colors duration-150 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {existingSavedRoadmap && !generatedRoadmap && (
                <div className="p-4 rounded-md border border-line bg-page flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-ink block">
                      Saved Roadmap Found ({existingSavedRoadmap.progressPercentage || 0}% Completed)
                    </span>
                    <span className="text-xs text-muted mt-0.5 block">
                      Resume without regenerating from Gemini.
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      try {
                        setGeneratedRoadmap(JSON.parse(existingSavedRoadmap.roadmapJson));
                      } catch (e) {
                        console.error('Error parsing roadmap json', e);
                      }
                    }}
                  >
                    Open Saved Roadmap
                  </Button>
                </div>
              )}

              {!generatedRoadmap && !roadmapLoading && (
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-page border border-line text-xs text-muted space-y-1">
                    <p className="font-semibold text-ink">{selectedGoalForRoadmap.title}</p>
                    {selectedGoalForRoadmap.description && (
                      <p>{selectedGoalForRoadmap.description}</p>
                    )}
                    <p>
                      {roadmapPrefs.targetDays} days • {roadmapPrefs.hoursPerDay}h/day • {formatEnum(roadmapPrefs.skillLevel)}
                    </p>
                  </div>

                  {roadmapError && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-danger text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{roadmapError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                    <Button variant="secondary" size="sm" onClick={handleCloseRoadmap}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleGenerateRoadmap}>
                      Generate Roadmap
                    </Button>
                  </div>
                </div>
              )}

              {roadmapLoading && (
                <div className="py-12 text-center">
                  <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto mb-2" />
                  <p className="text-sm font-semibold text-ink">
                    Generating Roadmap
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Structuring daily activities and milestones...
                  </p>
                </div>
              )}

              {generatedRoadmap && !roadmapLoading && (
                <InteractiveRoadmap
                  roadmap={generatedRoadmap}
                  goal={selectedGoalForRoadmap}
                  onSyncGoalProgress={handleSyncGoalProgress}
                  onRegenerate={() => setGeneratedRoadmap(null)}
                  isModal={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGoalCreated={loadDashboardData}
      />
    </div>
  );
};

export default StudentDashboard;
