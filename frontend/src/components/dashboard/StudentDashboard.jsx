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
  Sliders
} from 'lucide-react';
import {
  getGoals,
  getDashboardStats,
  updateGoalStatus,
  deleteGoal,
  generateRoadmap,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { InteractiveRoadmap } from '../roadmap/InteractiveRoadmap';

export const StudentDashboard = ({ onNavigateTab, onOpenCreateGoal }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
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
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [roadmapSaved, setRoadmapSaved] = useState(false);
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

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsData, statsData] = await Promise.all([
        getGoals(),
        getDashboardStats().catch(() => null),
      ]);
      const validGoals = Array.isArray(goalsData) ? goalsData : [];
      setGoals(validGoals);
      setStats(statsData || null);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load your learning goals. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute stats dynamically if backend stats endpoint returns partial data
  const computedStats = useMemo(() => {
    const total = stats?.totalGoals ?? goals.length;
    const active = stats?.activeGoals ?? goals.filter(
      (g) => g.status === 'IN_PROGRESS' || g.status === 'NOT_STARTED'
    ).length;
    const completed = stats?.completedGoals ?? goals.filter(
      (g) => g.status === 'COMPLETED'
    ).length;

    // Daily study target across active goals
    const activeGoalsList = goals.filter(
      (g) => g.status === 'IN_PROGRESS' || g.status === 'NOT_STARTED'
    );
    const dailyHours = stats?.dailyTargetHours ?? activeGoalsList.reduce(
      (acc, g) => acc + (Number(g.hoursPerDay) || 0),
      0
    );

    return {
      totalGoals: total,
      activeGoals: active,
      completedGoals: completed,
      dailyTargetHours: Math.round(dailyHours * 10) / 10,
    };
  }, [goals, stats]);

  // Active goals available for "Continue Learning"
  const activeGoals = useMemo(() => {
    return goals.filter((g) => g.status === 'IN_PROGRESS' || g.status === 'NOT_STARTED');
  }, [goals]);

  // Determine current focus goal for "Continue Learning"
  const currentContinueGoal = useMemo(() => {
    if (activeGoals.length === 0) return null;
    if (activeContinueGoalId) {
      const found = activeGoals.find((g) => g.id === activeContinueGoalId);
      if (found) return found;
    }
    // Default to first IN_PROGRESS goal, or first active goal
    return activeGoals.find((g) => g.status === 'IN_PROGRESS') || activeGoals[0];
  }, [activeGoals, activeContinueGoalId]);

  // Filtered & sorted goals
  // Order: IN_PROGRESS first, then NOT_STARTED, then COMPLETED, then ARCHIVED
  const filteredGoals = useMemo(() => {
    const statusWeight = {
      IN_PROGRESS: 1,
      NOT_STARTED: 2,
      COMPLETED: 3,
      ARCHIVED: 4,
    };

    let result = [...goals];
    if (statusFilter !== 'ALL') {
      result = result.filter((g) => g.status === statusFilter);
    }

    return result.sort((a, b) => {
      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;
      if (weightA !== weightB) return weightA - weightB;
      // Secondary sort: newest updated/created first
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }, [goals, statusFilter]);

  // Recent student activity derived strictly from authenticated user's real goals
  const recentActivities = useMemo(() => {
    if (!goals || goals.length === 0) return [];
    const activities = [];

    goals.forEach((goal) => {
      if (goal.status === 'COMPLETED' && goal.updatedAt) {
        activities.push({
          id: `comp-${goal.id}`,
          type: 'COMPLETED',
          title: `Completed goal: ${goal.title}`,
          date: new Date(goal.updatedAt),
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-50',
        });
      } else if (goal.progressPercentage > 0 && goal.updatedAt) {
        activities.push({
          id: `prog-${goal.id}`,
          type: 'PROGRESS',
          title: `Updated progress to ${goal.progressPercentage}% on "${goal.title}"`,
          date: new Date(goal.updatedAt),
          icon: TrendingUp,
          color: 'text-blue-600 bg-blue-50',
        });
      }

      if (goal.createdAt) {
        activities.push({
          id: `creat-${goal.id}`,
          type: 'CREATED',
          title: `Created learning goal: "${goal.title}"`,
          date: new Date(goal.createdAt),
          icon: BookOpen,
          color: 'text-indigo-600 bg-indigo-50',
        });
      }
    });

    return activities
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
  }, [goals]);

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
    setSelectedGoalForRoadmap(goal);
    setRoadmapError(null);
    setRoadmapSaved(false);
    setExpandedPhase(null);

    setRoadmapPrefs({
      skillLevel: goal.skillLevel || 'INTERMEDIATE',
      targetDays: goal.targetDays || 30,
      hoursPerDay: goal.hoursPerDay || 2.0,
      priorKnowledge: '',
      specificTopics: '',
      targetOutcomes: '',
      showPersonalization: false,
    });

    // Check if roadmap is already saved for this goal
    const historyKey = `ai_saved_roadmaps_${user?.email || 'guest'}`;
    let savedMatch = null;
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
      savedMatch = saved.find(
        (item) => item.goalId === goal.id || item.roadmap?.topic === goal.title
      );
    } catch (e) {
      console.error('Failed reading saved roadmaps', e);
    }

    if (savedMatch && savedMatch.roadmap) {
      setExistingSavedRoadmap(savedMatch);
      setGeneratedRoadmap(savedMatch.roadmap);
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
    setRoadmapSaved(false);
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

      const stableId = result.id || `roadmap_${Date.now()}`;
      result.id = stableId;
      setGeneratedRoadmap(result);

      // Persist into user's saved roadmaps in localStorage
      const historyKey = `ai_saved_roadmaps_${user?.email || 'guest'}`;
      try {
        const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
        const newEntry = {
          id: stableId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          roadmap: result,
          goalId: selectedGoalForRoadmap.id,
          goalTitle: selectedGoalForRoadmap.title,
          progressPercent: 0,
          completedTasksCount: 0,
          totalTasksCount: result.phases?.reduce((acc, p) => acc + (p.dailyTasks?.length || 0), 0) || 0,
          currentPhase: result.phases?.[0]?.phaseTitle || 'Phase 1',
        };
        const filtered = saved.filter(
          (item) => item.goalId !== selectedGoalForRoadmap.id && item.roadmap?.topic !== result.topic
        );
        const updatedList = [newEntry, ...filtered];
        localStorage.setItem(historyKey, JSON.stringify(updatedList));
        setExistingSavedRoadmap(newEntry);
      } catch (e) {
        console.error('Failed to persist roadmap from dashboard', e);
      }

      // Auto-save: mark goal as in progress if it hasn't started
      if (selectedGoalForRoadmap.status === 'NOT_STARTED') {
        try {
          const updated = await updateGoalStatus(selectedGoalForRoadmap.id, {
            status: 'IN_PROGRESS',
            progressPercentage: selectedGoalForRoadmap.progressPercentage,
          });
          setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        } catch (_) { /* non-critical */ }
      }
      setRoadmapSaved(true);
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

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSkillBadge = (level) => {
    switch (level) {
      case 'BEGINNER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Beginner
          </span>
        );
      case 'INTERMEDIATE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Intermediate
          </span>
        );
      case 'ADVANCED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Advanced
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {level || 'Standard'}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Welcome Header (Personalized to authenticated student) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}, {user?.name || 'Student'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Ready to make progress on your learning goals?
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Learning Goal</span>
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
            title="Refresh Goals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="text-rose-700 font-semibold hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Student Statistics (Compact verified metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Learning Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Goals
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{computedStats.totalGoals}</p>
          <p className="mt-1 text-xs text-slate-500">All-time goals created</p>
        </div>

        {/* Active Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Goals
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-blue-600">{computedStats.activeGoals}</p>
          <p className="mt-1 text-xs text-slate-500">In progress & not started</p>
        </div>

        {/* Completed Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Goals
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{computedStats.completedGoals}</p>
          <p className="mt-1 text-xs text-slate-500">Successfully completed</p>
        </div>

        {/* Daily Study Target */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Daily Study Target
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <p className="text-2xl font-extrabold text-slate-900">
              {computedStats.dailyTargetHours}
            </p>
            <span className="text-sm font-semibold text-slate-600">hrs/day</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Planned focus across active goals</p>
        </div>
      </div>

      {/* 3. Continue Learning / Current Goal Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span>Continue Learning</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick up where you left off on your active study plan
            </p>
          </div>

          {activeGoals.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Switch goal:</span>
              <select
                value={currentContinueGoal?.id || ''}
                onChange={(e) => setActiveContinueGoalId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-xs truncate"
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
          <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  {getSkillBadge(currentContinueGoal.skillLevel)}
                  {getStatusBadge(currentContinueGoal.status)}
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  {currentContinueGoal.title}
                </h3>
                {currentContinueGoal.description && (
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    {currentContinueGoal.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800">
                      {currentContinueGoal.targetDays} Days
                    </span>
                    <span className="text-slate-400">total target</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-800">
                      {currentContinueGoal.hoursPerDay} hrs/day
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress & Quick Actions */}
              <div className="lg:w-72 shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Goal Progress</span>
                  <span className="text-blue-600 font-bold">
                    {currentContinueGoal.progressPercentage}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${currentContinueGoal.progressPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleUpdateProgress(currentContinueGoal, -10)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Decrease 10%"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(currentContinueGoal, 10)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                      title="Increase 10%"
                    >
                      +10%
                    </button>
                    {currentContinueGoal.progressPercentage < 100 && (
                      <button
                        onClick={() => handleSetExactProgress(currentContinueGoal, 100)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        title="Mark complete"
                      >
                        Complete
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenRoadmap(currentContinueGoal)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    <span>AI Roadmap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Active Goal in Progress
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
              You haven't created a learning goal yet. Start by choosing something you want to learn.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Goal</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. My Learning Goals Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>My Learning Goals</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, update, and manage your personalized learning targets
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Goals' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'NOT_STARTED', label: 'Not Started' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'ARCHIVED', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
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
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">Loading your learning goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {goals.length === 0 ? 'No Learning Goals Yet' : 'No Goals Match this Filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
              {goals.length === 0
                ? "You haven't created a learning goal yet. Start by choosing something you want to learn."
                : 'Try selecting a different status filter above to see other goals.'}
            </p>
            {goals.length === 0 && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Goal</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {filteredGoals.map((goal) => {
              const updatedDate = formatDate(goal.updatedAt || goal.createdAt);
              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges & Delete */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getSkillBadge(goal.skillLevel)}
                        {getStatusBadge(goal.status)}
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {goal.description}
                      </p>
                    )}

                    {/* Target Metrics */}
                    <div className="flex items-center space-x-3 mt-4 text-xs text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-semibold text-slate-800">{goal.targetDays} Days</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold text-slate-800">{goal.hoursPerDay} hrs/day</span>
                      </div>
                      {updatedDate && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] text-slate-400">
                            Updated {updatedDate}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 text-[11px]">Progress</span>
                        <span className="font-bold text-blue-600">
                          {goal.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${goal.progressPercentage}%` }}
                        />
                      </div>

                      {/* Stepper & Status Dropdown */}
                      <div className="flex items-center justify-between mt-3 text-xs">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleUpdateProgress(goal, -10)}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                            title="Decrease 10%"
                          >
                            -10%
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(goal, 10)}
                            className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                            title="Increase 10%"
                          >
                            +10%
                          </button>
                          {goal.progressPercentage < 100 && (
                            <button
                              onClick={() => handleSetExactProgress(goal, 100)}
                              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition cursor-pointer"
                              title="Mark as completed"
                            >
                              Complete
                            </button>
                          )}
                        </div>

                        {/* Status dropdown */}
                        <select
                          value={goal.status}
                          onChange={(e) => handleStatusChange(goal, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white text-[11px] font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: AI Roadmap Trigger */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Target: {Math.round(goal.targetDays * goal.hoursPerDay)} hrs total
                    </span>

                    <button
                      onClick={() => handleOpenRoadmap(goal)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI Roadmap</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recent Learning Activity & AI Roadmap Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Learning Activity Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Learning Activity</h3>
                <p className="text-xs text-slate-500">Chronological history of your goal updates</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={act.id}
                      className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className={`p-1.5 rounded-lg ${act.color} shrink-0 mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{act.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatRelativeTime(act.date)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">No recent activity yet</p>
                  <p className="mt-0.5 text-slate-400">
                    Updates to your learning goals will be reflected here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400 text-right">
            Verified student record
          </div>
        </div>

        {/* 6. AI Learning Roadmap Entry Point */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Learning Roadmap Studio</h3>
                  <p className="text-xs text-slate-500">Curriculum synthesis & progress tracking</p>
                </div>
              </div>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Gemini AI Ready</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              Transform your learning goals into phased, day-wise curricula with actionable milestone checklists, topic breakdowns, and curated study resources.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-100 text-xs text-blue-900 space-y-2">
              <div className="font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Interactive AI Roadmap Features</span>
              </div>
              <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
                <li>Structured weekly phases with interactive milestone checklists</li>
                <li>Dynamic progress tracking synced with your learning goals</li>
                <li>Direct links to documentation, guides, and courses</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => onNavigateTab && onNavigateTab('my-roadmaps')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center space-x-1"
            >
              <span>Open Dedicated Studio</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (activeGoals.length > 0) {
                  handleOpenRoadmap(activeGoals[0]);
                } else {
                  if (onNavigateTab) onNavigateTab('my-roadmaps');
                  else setIsCreateModalOpen(true);
                }
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeGoals.length > 0 ? 'Generate for Current Goal' : 'Launch Roadmap Studio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
           AI ROADMAP MODAL — Full Gemini-powered generation
      ══════════════════════════════════════════════════════════ */}
      {selectedGoalForRoadmap && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 my-8">

            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {generatedRoadmap ? 'AI Study Roadmap' : 'Generate AI Learning Roadmap'}
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {generatedRoadmap
                      ? 'Interactive Curriculum & Phased Learning Timeline'
                      : 'Customize roadmap parameters for your learning goal'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseRoadmap}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ── SAVED ROADMAP DETECTED BANNER ── */}
              {existingSavedRoadmap && !generatedRoadmap && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">
                      Saved Roadmap Found for This Goal ({existingSavedRoadmap.progressPercent || 0}% Completed)
                    </span>
                    <span className="text-[11px] text-blue-700 mt-0.5 block">
                      You can resume your saved roadmap without calling Gemini again.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedRoadmap(existingSavedRoadmap.roadmap)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Saved Roadmap</span>
                  </button>
                </div>
              )}

              {/* ── GOAL INFO & PREFERENCES FORM (Before generation) ── */}
              {!generatedRoadmap && !roadmapLoading && (
                <div className="space-y-5">
                  {/* Goal Summary Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Selected Learning Goal
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {selectedGoalForRoadmap.title}
                        </h4>
                        {selectedGoalForRoadmap.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {selectedGoalForRoadmap.description}
                          </p>
                        )}
                      </div>
                      {getSkillBadge(roadmapPrefs.skillLevel)}
                    </div>
                  </div>

                  {roadmapError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{roadmapError}</span>
                    </div>
                  )}

                  {/* Skill Level Selection Cards */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Target Skill Level
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'BEGINNER', label: 'Beginner', desc: 'Core fundamentals & basics' },
                        { id: 'INTERMEDIATE', label: 'Intermediate', desc: 'Architecture & practical apps' },
                        { id: 'ADVANCED', label: 'Advanced', desc: 'Deep dive & edge cases' }
                      ].map((lvl) => {
                        const isSelected = roadmapPrefs.skillLevel === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setRoadmapPrefs(p => ({ ...p, skillLevel: lvl.id }))}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-blue-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <span className="text-xs font-bold block">{lvl.label}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">{lvl.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration & Daily Hours Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Duration Slider */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Duration (Days)</span>
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          {roadmapPrefs.targetDays} Days
                        </span>
                      </div>
                      <input
                        type="range"
                        min={7}
                        max={120}
                        step={1}
                        value={roadmapPrefs.targetDays}
                        onChange={(e) => setRoadmapPrefs(p => ({ ...p, targetDays: Number(e.target.value) }))}
                        className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        {[14, 21, 30, 45, 60].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setRoadmapPrefs(p => ({ ...p, targetDays: d }))}
                            className="hover:text-blue-600"
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Daily Study Hours Slider */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Daily Study Time</span>
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          {roadmapPrefs.hoursPerDay} hrs/day
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={8.0}
                        step={0.5}
                        value={roadmapPrefs.hoursPerDay}
                        onChange={(e) => setRoadmapPrefs(p => ({ ...p, hoursPerDay: Number(e.target.value) }))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        {[1.0, 1.5, 2.0, 3.0, 4.0].map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setRoadmapPrefs(p => ({ ...p, hoursPerDay: h }))}
                            className="hover:text-indigo-600"
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Total Hours Calculation */}
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">Total Planned Study Time: </span>
                      <span className="font-extrabold text-blue-700">
                        {Math.round(roadmapPrefs.targetDays * roadmapPrefs.hoursPerDay)} Hours
                      </span>
                      <span className="text-slate-500"> across {roadmapPrefs.targetDays} days</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-indigo-700 font-semibold border border-indigo-200 text-[10px]">
                      Gemini Optimized
                    </span>
                  </div>

                  {/* Optional Deep Personalization Accordion */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setRoadmapPrefs(p => ({ ...p, showPersonalization: !p.showPersonalization }))}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Advanced Personalization (Prior knowledge & target outcomes)</span>
                      </div>
                      {roadmapPrefs.showPersonalization ? (
                        <ChevronUp className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-indigo-500" />
                      )}
                    </button>

                    {roadmapPrefs.showPersonalization && (
                      <div className="mt-3 p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Prior Knowledge / Background
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Familiar with basic Python and relational databases"
                            value={roadmapPrefs.priorKnowledge}
                            onChange={(e) => setRoadmapPrefs(p => ({ ...p, priorKnowledge: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Specific Focus Topics / Modules
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Focus on microservices and testing"
                            value={roadmapPrefs.specificTopics}
                            onChange={(e) => setRoadmapPrefs(p => ({ ...p, specificTopics: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Target Learning Outcomes
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Build and deploy an enterprise-grade full-stack project"
                            value={roadmapPrefs.targetOutcomes}
                            onChange={(e) => setRoadmapPrefs(p => ({ ...p, targetOutcomes: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary & Secondary Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCloseRoadmap}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateRoadmap}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Roadmap</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── LOADING STATE ── */}
              {roadmapLoading && (
                <div className="py-14 text-center">
                  <div className="relative inline-flex mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin absolute -top-1 -right-1" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Gemini AI is Structuring Your Curriculum
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Decomposing topics into weekly phases, actionable daily study tasks, and verified resources...
                  </p>
                  <div className="mt-4 flex justify-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ══ INTERACTIVE ROADMAP DISPLAY ══ */}
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

            {/* ── Modal Footer ── */}
            <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleCloseRoadmap();
                  if (onNavigateTab) onNavigateTab('my-roadmaps');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Open in Full Roadmap Studio →
              </button>

              <button
                type="button"
                onClick={handleCloseRoadmap}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
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
