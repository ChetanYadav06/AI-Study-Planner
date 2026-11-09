import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  PlusCircle,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  TrendingUp,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Archive,
  AlertCircle,
  PlayCircle,
  Check,
  ChevronRight,
  Activity,
  X,
  Loader2,
  Map,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sliders,
  Zap,
  ListTodo
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

export const StudentDashboard = ({ onNavigateTab, onOpenCreateGoal, onNavigateRoadmap, accentColor = 'teal' }) => {
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
  const [activeContinueGoalId, setActiveContinueGoalId] = useState(null);
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

  // Compute stats dynamically if backend returns partial data
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

  // Active goals for "Continue Learning"
  const activeGoals = goalStats.activeGoalsList;

  // Determine current focus goal for "Continue Learning"
  const currentContinueGoal = useMemo(() => {
    if (activeGoals.length === 0) return null;
    if (activeContinueGoalId) {
      const found = activeGoals.find((g) => g.id === activeContinueGoalId);
      if (found) return found;
    }
    return activeGoals.find((g) => g.status === 'IN_PROGRESS') || activeGoals[0];
  }, [activeGoals, activeContinueGoalId]);

  // Active saved roadmap for primary study queue
  const primaryRoadmap = useMemo(() => {
    if (!savedRoadmaps || savedRoadmaps.length === 0) return null;
    if (currentContinueGoal) {
      const found = savedRoadmaps.find(r => r.goalId === currentContinueGoal.id);
      if (found) return found;
    }
    return savedRoadmaps[0];
  }, [savedRoadmaps, currentContinueGoal]);

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

      // Reload fresh dashboard data so goal progress and status sync immediately
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

  const getSkillBadge = (level) => {
    switch (level) {
      case 'BEGINNER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Beginner
          </span>
        );
      case 'INTERMEDIATE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
            Intermediate
          </span>
        );
      case 'ADVANCED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200">
            Advanced
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {level || 'Standard'}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
            <span>Completed</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-16 animate-fade-slide">
      {/* 1. CLEAN HEADER WITH PERSONALIZED GREETING */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/60">
              {todayFormatted}
            </span>
            <span className="text-xs font-bold text-slate-400">
              • Academic Companion
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, {user?.name || 'Scholar'}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Welcome back to your personalized study workspace. Here is an overview of your active commitments.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 self-start md:self-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Goal</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-teal-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create AI Roadmap</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-teal-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="text-rose-700 font-bold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. LEARNING PROGRESS INDICATORS (Verified Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Goals */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs hover:border-teal-200 card-hover-lift transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Total Goals
            </span>
            <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{computedStats.totalGoals}</p>
          <p className="mt-1 text-xs text-slate-500">Tracked in curriculum</p>
        </div>

        {/* Active Goals */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs hover:border-teal-200 card-hover-lift transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Active Goals
            </span>
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-teal-600">{computedStats.activeGoals}</p>
          <p className="mt-1 text-xs text-slate-500">In progress & sprints</p>
        </div>

        {/* Completed Goals */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs hover:border-teal-200 card-hover-lift transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Completed Goals
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{computedStats.completedGoals}</p>
          <p className="mt-1 text-xs text-slate-500">100% completed targets</p>
        </div>

        {/* Daily Study Target */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs hover:border-teal-200 card-hover-lift transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Daily Target
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              Today: {(todayLoggedMinutes / 60).toFixed(1)} of {computedStats.dailyTargetHours}
            </p>
            <span className="text-xs font-bold text-slate-500">h</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((todayLoggedMinutes / 60) / (computedStats.dailyTargetHours || 1)) * 100))}%`
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {todayLoggedMinutes > 0
              ? `${todayLoggedMinutes} mins logged today`
              : 'Planned focus commitment'}
          </p>
        </div>
      </div>

      {/* 3. PROMINENT "CONTINUE LEARNING" ACTION */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <PlayCircle className="w-5 h-5 text-teal-600" />
              <span>Continue Learning</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Resume your immediate active study sprint without losing momentum
            </p>
          </div>

          {activeGoals.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Switch goal:</span>
              <select
                value={currentContinueGoal?.id || ''}
                onChange={(e) => setActiveContinueGoalId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer max-w-xs truncate"
              >
                {activeGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.progressPercentage}%)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {currentContinueGoal ? (
          <div className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 border border-teal-100/80">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  {getSkillBadge(currentContinueGoal.skillLevel)}
                  {getStatusBadge(currentContinueGoal.status)}
                  {currentContinueGoal.priority && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {currentContinueGoal.priority} PRIORITY
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {currentContinueGoal.title}
                </h3>
                {currentContinueGoal.description && (
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    {currentContinueGoal.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span className="font-bold text-slate-800">
                      {currentContinueGoal.targetDays} Days
                    </span>
                    <span className="text-slate-400">target</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-bold text-slate-800">
                      {currentContinueGoal.hoursPerDay}h / day
                    </span>
                  </div>
                  {currentContinueGoal.subject && (
                    <>
                      <span>•</span>
                      <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md">
                        {currentContinueGoal.subject}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress & Quick Actions */}
              <div className="lg:w-80 shrink-0 space-y-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Goal Completion</span>
                  <span className="text-teal-700 font-mono font-black text-sm">
                    {currentContinueGoal.progressPercentage}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${currentContinueGoal.progressPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {currentContinueGoal.hasLinkedRoadmap || savedRoadmaps.some(r => r.goalId === currentContinueGoal.id) ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200/60">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Roadmap auto-sync</span>
                    </span>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleUpdateProgress(currentContinueGoal, -10)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                        title="Decrease 10%"
                      >
                        -10%
                      </button>
                      <button
                        onClick={() => handleUpdateProgress(currentContinueGoal, 10)}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 transition cursor-pointer shadow-2xs"
                        title="Increase 10%"
                      >
                        +10%
                      </button>
                      {currentContinueGoal.progressPercentage < 100 && (
                        <button
                          onClick={() => handleSetExactProgress(currentContinueGoal, 100)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                          title="Mark complete"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenRoadmap(currentContinueGoal)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <span>AI Roadmap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Active Goals in Progress
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a personalized learning goal to begin tracking your study sprint with AI guidance.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Goal</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. TODAY'S STUDY TASKS & UP NEXT (From Shared Study Queue) */}
      {(todayTasks.length > 0 || upNextTasks.length > 0) && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ListTodo className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Today's Recommended Study Tasks {studyQueue.todayDayNumber != null && `(Day ${studyQueue.todayDayNumber})`}
                </h3>
                <p className="text-xs text-slate-500">Current scheduled curriculum day from your active roadmap</p>
              </div>
            </div>
            {todayTasks.length > 0 && (
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
                {todayTasks.length} {todayTasks.length === 1 ? 'Task' : 'Tasks'} for Today
              </span>
            )}
          </div>

          {todayTasks.length > 0 ? (
            <div className="space-y-2.5">
              {todayTasks.map((item) => (
                <div
                  key={item.taskId}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start space-x-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleTodayTask(item)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                        item.isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 bg-white hover:border-teal-500'
                      }`}
                      title={item.isDone ? 'Mark Incomplete' : 'Mark Done'}
                    >
                      <Check className={`w-3.5 h-3.5 ${item.isDone ? 'text-white' : 'text-transparent group-hover:text-slate-300'}`} />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          Day {item.task.dayNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {formatEnum(item.task.activityType || 'Study')}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.task.estimatedMinutes != null ? `${item.task.estimatedMinutes} min` : 'Flexible duration'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {item.roadmapTitle}
                        </span>
                      </div>

                      <h4 className={`text-xs md:text-sm font-bold mt-1 ${item.isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {item.task.title}
                      </h4>
                      {item.task.description && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {item.task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab && onNavigateTab('active-study')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-400 text-teal-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs shrink-0 self-center"
                  >
                    <span>Start Task</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              All tasks for today are completed! Check out upcoming days below.
            </div>
          )}

          {/* Up Next Section */}
          {upNextTasks.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Up Next {studyQueue.upNextDays?.length > 0 && `(Days ${studyQueue.upNextDays.join(' & ')})`}</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {upNextTasks.length} Upcoming Tasks
                </span>
              </div>

              <div className="space-y-2">
                {upNextTasks.map((item) => (
                  <div
                    key={item.taskId}
                    className="p-3.5 rounded-2xl border border-slate-200/60 bg-slate-50/40 hover:bg-white transition-all flex items-start justify-between gap-3 text-slate-600 group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 w-5 h-5 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-md">
                            Day {item.task.dayNumber}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {formatEnum(item.task.activityType || 'Study')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.task.estimatedMinutes != null ? `${item.task.estimatedMinutes} min` : 'Flexible duration'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 mt-1">
                          {item.task.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. VISUALLY APPEALING SECTION FOR CURRENT ROADMAPS */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Map className="w-5 h-5 text-teal-600" />
              <span>Current Study Roadmaps</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phased AI curricula calibrated to your topic mastery levels
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              View All Roadmaps →
            </button>
          </div>
        </div>

        {savedRoadmaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoadmaps.slice(0, 4).map((roadmap) => (
              <div
                key={roadmap.id}
                onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
                className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-teal-300 card-hover-lift transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                      {formatEnum(roadmap.skillLevel)}
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-700">
                      {roadmap.progressPercentage || 0}% Done
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 group-hover:text-teal-700 transition leading-snug">
                    {roadmap.title}
                  </h3>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{roadmap.targetDays} Days</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {(() => {
                        const linkedGoal = goals.find(g => g.id === roadmap.goalId);
                        const displayHours = linkedGoal?.hoursPerDay != null ? linkedGoal.hoursPerDay : roadmap.hoursPerDay;
                        return <span>{displayHours}h / day</span>;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${roadmap.progressPercentage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Map className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No AI roadmaps generated yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Launch the AI roadmap studio to generate day-by-day learning milestones.
            </p>
            <button
              onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Studio</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. CONCISE OVERVIEW OF LEARNING GOALS */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Target className="w-5 h-5 text-teal-600" />
              <span>My Learning Goals</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, update, and manage your learning targets
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Goals' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'NOT_STARTED', label: 'Not Started' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Goals Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm font-semibold">Loading your learning goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-12 text-center max-w-md mx-auto space-y-2">
            <Target className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              {goals.length === 0 ? 'No Learning Goals Yet' : 'No Goals Match this Filter'}
            </h3>
            <p className="text-xs text-slate-500">
              Create a goal to begin organizing your curriculum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-3xl border border-[#E2E8F0] p-5 hover:border-teal-300 card-hover-lift transition-all flex flex-col justify-between shadow-2xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-2">
                      {getSkillBadge(goal.skillLevel)}
                      {getStatusBadge(goal.status)}
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition leading-snug">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-3 mt-3 text-xs text-slate-600">
                    <div className="flex items-center space-x-1 font-semibold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{goal.targetDays} Days</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1 font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{goal.hoursPerDay}h / day</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 text-[11px]">Progress</span>
                      <span className="font-mono font-bold text-teal-700">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs">
                      {goal.hasLinkedRoadmap || savedRoadmaps.some(r => r.goalId === goal.id) ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200/50">
                          <Sparkles className="w-3 h-3 text-teal-600" />
                          <span>Roadmap Linked</span>
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleUpdateProgress(goal, -10)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            -10%
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(goal, 10)}
                            className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] transition cursor-pointer"
                          >
                            +10%
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenRoadmap(goal)}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        <span>AI Roadmap</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Roadmap Modal */}
      {selectedGoalForRoadmap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto animate-fade-slide">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Map className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {generatedRoadmap ? 'AI Study Roadmap' : 'Generate AI Learning Roadmap'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {generatedRoadmap
                      ? 'Interactive Curriculum & Phased Learning Timeline'
                      : 'Customize roadmap parameters for your learning goal'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseRoadmap}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {existingSavedRoadmap && !generatedRoadmap && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-teal-900 block">
                      Saved Roadmap Found for This Goal ({existingSavedRoadmap.progressPercentage || 0}% Completed)
                    </span>
                    <span className="text-[11px] text-teal-700 mt-0.5 block">
                      Resume without regenerating from Gemini.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setGeneratedRoadmap(JSON.parse(existingSavedRoadmap.roadmapJson));
                      } catch (e) {
                        console.error('Error parsing roadmap json', e);
                      }
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Saved Roadmap</span>
                  </button>
                </div>
              )}

              {!generatedRoadmap && !roadmapLoading && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Target Learning Goal
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {selectedGoalForRoadmap.title}
                    </h4>
                    {selectedGoalForRoadmap.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedGoalForRoadmap.description}
                      </p>
                    )}
                  </div>

                  {roadmapError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{roadmapError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseRoadmap}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateRoadmap}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Synthesize Roadmap</span>
                    </button>
                  </div>
                </div>
              )}

              {roadmapLoading && (
                <div className="py-14 text-center">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-900">
                    Gemini AI is Structuring Your Curriculum
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Personalizing daily activities, verification milestones, and practical exercises...
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
