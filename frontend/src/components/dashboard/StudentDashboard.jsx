import React, { useState, useEffect } from 'react';
import {
  Target,
  PlusCircle,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Flame,
  BookOpen,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  getGoals,
  getDashboardStats,
  updateGoalStatus,
  deleteGoal,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreateGoalModal } from '../goals/CreateGoalModal';

export const StudentDashboard = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedGoalForRoadmap, setSelectedGoalForRoadmap] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [goalsData, statsData] = await Promise.all([
        getGoals(),
        getDashboardStats(),
      ]);
      setGoals(goalsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUpdateProgress = async (goal, delta) => {
    const newProgress = Math.min(100, Math.max(0, goal.progressPercentage + delta));
    const newStatus = newProgress === 100 ? 'COMPLETED' : (newProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');

    try {
      const updated = await updateGoalStatus(goal.id, {
        progressPercentage: newProgress,
        status: newStatus,
      });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      const freshStats = await getDashboardStats();
      setStats(freshStats);
    } catch (err) {
      console.error('Failed to update goal progress:', err);
    }
  };

  const handleStatusChange = async (goal, newStatus) => {
    try {
      const newProgress = newStatus === 'COMPLETED' ? 100 : (newStatus === 'NOT_STARTED' ? 0 : goal.progressPercentage);
      const updated = await updateGoalStatus(goal.id, {
        status: newStatus,
        progressPercentage: newProgress,
      });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      const freshStats = await getDashboardStats();
      setStats(freshStats);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this learning goal?')) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
      const freshStats = await getDashboardStats();
      setStats(freshStats);
      setActionMessage('Learning goal deleted successfully.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleTriggerRoadmap = (goal) => {
    setSelectedGoalForRoadmap(goal);
  };

  const filteredGoals = goals.filter((goal) => {
    if (statusFilter === 'ALL') return true;
    return goal.status === statusFilter;
  });

  const getSkillBadgeColor = (level) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INTERMEDIATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ADVANCED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <TrendingUp className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3" />
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Welcome back, {user?.name || 'Student'}! 👋
          </h1>
          <p className="text-sm text-blue-100 mt-2 leading-relaxed">
            Manage your learning goals, track daily study commitments, and generate personalised AI study roadmaps.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-white/10 text-xs text-blue-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm rounded-xl transition shadow-lg shadow-black/10 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Create Learning Goal</span>
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 right-32 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Goals</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-extrabold text-slate-900">{stats?.activeGoals || 0}</p>
            <span className="text-xs text-slate-500 font-medium">of {stats?.totalGoals || 0} total</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-blue-600 font-medium">
            <span>{stats?.completedGoals || 0} completed</span>
          </div>
        </div>

        {/* Daily Study Commitment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daily Target</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <p className="text-2xl font-extrabold text-slate-900">{stats?.dailyTargetHours || 0}</p>
            <span className="text-sm font-semibold text-slate-600">hrs/day</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Target daily focus time</span>
          </div>
        </div>

        {/* Study Streak */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Learning Streak</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <p className="text-2xl font-extrabold text-slate-900">{stats?.studyStreakDays || 0}</p>
            <span className="text-sm font-semibold text-slate-600">Days</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-amber-600 font-medium">
            <span>Keep your momentum alive!</span>
          </div>
        </div>

        {/* AI Roadmaps Ready */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Roadmaps</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <p className="text-2xl font-extrabold text-slate-900">{goals.length}</p>
            <span className="text-xs text-slate-500">ready for AI synthesis</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-purple-600 font-semibold">
            <span>AI-powered roadmaps</span>
          </div>
        </div>
      </div>

      {/* Main Goal Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>Your Learning Goals</span>
            </h2>
            <p className="text-xs text-slate-500">Track and update active goals or generate structured AI roadmaps</p>
          </div>

          <div className="flex items-center space-x-2">
            {(['ALL', 'IN_PROGRESS', 'NOT_STARTED', 'COMPLETED']).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL'
                  ? 'All'
                  : filter === 'IN_PROGRESS'
                  ? 'In Progress'
                  : filter === 'NOT_STARTED'
                  ? 'Not Started'
                  : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Goals List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">Loading your learning goals from database...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {goals.length === 0 ? 'No Learning Goals Yet' : 'No Goals in this Category'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
              {goals.length === 0
                ? 'Create your first goal to set up daily study hours, target days, and unlock personalized AI Roadmap generation in Phase 4.'
                : 'No learning goals match the selected filter.'}
            </p>
            {goals.length === 0 && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Goal</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges & Delete */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getSkillBadgeColor(goal.skillLevel)}`}>
                        {goal.skillLevel}
                      </span>
                      {getStatusBadge(goal.status)}
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Metrics Badges */}
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
                    <span>•</span>
                    <div className="text-slate-500">
                      ~{Math.round(goal.targetDays * goal.hoursPerDay)} total hrs
                    </div>
                  </div>

                  {/* Progress Bar & Slider */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">Goal Progress</span>
                      <span className="font-bold text-blue-700">{goal.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progressPercentage}%` }}
                      />
                    </div>

                    {/* Quick progress bump actions */}
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <div className="flex items-center space-x-1">
                        <span>Quick update:</span>
                        <button
                          onClick={() => handleUpdateProgress(goal, 10)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                        >
                          +10%
                        </button>
                        <button
                          onClick={() => handleUpdateProgress(goal, 25)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                        >
                          +25%
                        </button>
                        <button
                          onClick={() => handleUpdateProgress(goal, -10)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          -10%
                        </button>
                      </div>

                      <select
                        value={goal.status}
                        onChange={(e) => handleStatusChange(goal, e.target.value)}
                        className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 bg-white text-[10px] font-medium"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card Footer: AI Roadmap Trigger */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Created {new Date(goal.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleTriggerRoadmap(goal)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Generate AI Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Roadmap Preview Modal */}
      {selectedGoalForRoadmap && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              AI Study Roadmap Generator
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ready to generate a tailored {selectedGoalForRoadmap.targetDays}-day structured curriculum with daily topics, practice exercises, and study milestones.
            </p>

            <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800">{selectedGoalForRoadmap.title}</div>
              <div className="text-slate-600">
                Commitment: {selectedGoalForRoadmap.hoursPerDay} hrs/day • {selectedGoalForRoadmap.targetDays} total days ({selectedGoalForRoadmap.skillLevel})
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setSelectedGoalForRoadmap(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedGoalForRoadmap(null);
                  setActionMessage(`Goal "${selectedGoalForRoadmap.title}" is queued for Phase 4 AI roadmap generation.`);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-md shadow-purple-500/20"
              >
                Prepare AI Roadmap
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
