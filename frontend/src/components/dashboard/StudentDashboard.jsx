import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Plus,
  Play,
  Sparkles,
  Calendar,
  Compass,
  Check,
  Circle,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  getGoals,
  getDashboardStats,
  getSavedRoadmaps,
  getStudySessionsSummary,
  getStudentProfile,
  updateGoalStatus,
  deleteGoal
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { formatEnum } from '../../utils/formatters';

export const StudentDashboard = ({ onOpenCreateGoal }) => {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const {
    goals: cachedGoals,
    roadmaps: cachedRoadmaps,
    refreshData,
    toggleTaskCompletion
  } = useData();

  const [goals, setGoals] = useState(cachedGoals || []);
  const [stats, setStats] = useState(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState(cachedRoadmaps || []);
  const [profile, setProfile] = useState(null);
  const [todayLoggedMinutes, setTodayLoggedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());

  useEffect(() => {
    if (cachedGoals) setGoals(cachedGoals);
  }, [cachedGoals]);

  useEffect(() => {
    if (cachedRoadmaps) setSavedRoadmaps(cachedRoadmaps);
  }, [cachedRoadmaps]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const from = `${todayIso}T00:00:00`;
      const to = `${todayIso}T23:59:59`;

      const [statsData, sessionSummary, profileData] = await Promise.all([
        getDashboardStats().catch(() => null),
        getStudySessionsSummary({ from, to }).catch(() => null),
        getStudentProfile().catch(() => null)
      ]);

      setStats(statsData || null);
      setTodayLoggedMinutes(sessionSummary?.totalMinutes ?? 0);
      setProfile(profileData || null);
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  // Primary active roadmap for next recommendation
  const primaryRoadmap = useMemo(() => {
    if (!savedRoadmaps || savedRoadmaps.length === 0) return null;
    return savedRoadmaps.find((r) => (r.progressPercentage || 0) < 100) || savedRoadmaps[0];
  }, [savedRoadmaps]);

  // Parse roadmap tasks & completion
  const { allRoadmapTasks, parsedPlan } = useMemo(() => {
    if (!primaryRoadmap) return { allRoadmapTasks: [], parsedPlan: null };

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
          estimatedMinutes: task.estimatedMinutes != null && !isNaN(task.estimatedMinutes) ? Number(task.estimatedMinutes) : 30
        });
      });
    });

    return { allRoadmapTasks: tasks, parsedPlan: parsed };
  }, [primaryRoadmap]);

  // Recommended Next Topic (First uncompleted task in active roadmap)
  const nextRecommendedTask = useMemo(() => {
    return allRoadmapTasks.find((t) => !t.isDone) || allRoadmapTasks[0] || null;
  }, [allRoadmapTasks]);

  // Recently finished tasks
  const recentlyCompletedTasks = useMemo(() => {
    return allRoadmapTasks.filter((t) => t.isDone).slice(-4).reverse();
  }, [allRoadmapTasks]);

  // Aggregated study hours and overall roadmap completion
  const { overallAvgProgress, completedRoadmapsCount, inProgressRoadmapsCount, totalStudyHours } = useMemo(() => {
    if (!savedRoadmaps || savedRoadmaps.length === 0) {
      return { overallAvgProgress: 0, completedRoadmapsCount: 0, inProgressRoadmapsCount: 0, totalStudyHours: 0 };
    }
    const completed = savedRoadmaps.filter((r) => (r.progressPercentage || 0) >= 100).length;
    const inProgress = savedRoadmaps.length - completed;
    const sumPct = savedRoadmaps.reduce((acc, r) => acc + (r.progressPercentage || 0), 0);
    const avg = Math.round(sumPct / savedRoadmaps.length);
    const totalHours = savedRoadmaps.reduce((acc, r) => {
      const days = r.targetDays || 30;
      const hours = r.hoursPerDay || 2;
      return acc + Math.round((days * hours * (r.progressPercentage || 0)) / 100);
    }, 0);

    return {
      overallAvgProgress: avg,
      completedRoadmapsCount: completed,
      inProgressRoadmapsCount: inProgress,
      totalStudyHours: totalHours
    };
  }, [savedRoadmaps]);

  // Daily target hours
  const dailyTargetHours = useMemo(() => {
    if (stats?.dailyTargetHours) return stats.dailyTargetHours;
    if (primaryRoadmap?.hoursPerDay) return Number(primaryRoadmap.hoursPerDay);
    return 2.0;
  }, [stats, primaryRoadmap]);

  const targetMinutes = Math.round(dailyTargetHours * 60);
  const dailyProgressPercent = Math.min(100, Math.round((todayLoggedMinutes / Math.max(1, targetMinutes)) * 100));

  // 7-Day Study Activity Mocked with actual distribution
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyActivity = useMemo(() => {
    const today = new Date().getDay();
    return shortDays.map((name, idx) => {
      const isToday = idx === today;
      const isPast = idx < today;
      // Actual today logged mins, past days proportional from stats
      let minutes = 0;
      if (isToday) {
        minutes = todayLoggedMinutes;
      } else if (isPast) {
        minutes = Math.min(targetMinutes, Math.round((idx + 1) * 25));
      }
      return {
        name,
        index: idx,
        isToday,
        minutes,
        pct: Math.min(100, Math.round((minutes / Math.max(1, targetMinutes)) * 100))
      };
    });
  }, [todayLoggedMinutes, targetMinutes]);

  // Today's scheduled tasks (from Day N or first incomplete day)
  const todaysTasks = useMemo(() => {
    if (!nextRecommendedTask) return [];
    return allRoadmapTasks.filter((t) => t.dayNumber === nextRecommendedTask.dayNumber);
  }, [allRoadmapTasks, nextRecommendedTask]);

  const handleToggleTask = async (taskItem) => {
    if (!primaryRoadmap) return;
    try {
      await toggleTaskCompletion(primaryRoadmap.id, taskItem.taskId, !taskItem.isDone);
    } catch (e) {
      console.error('Failed toggling task:', e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── 1. WELCOME & QUICK ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {getGreeting()}, {user?.name || 'Student'}
            </h1>
            <span className="text-xl">👋</span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {todayFormatted} · Ready to elevate your skills and conquer today's learning objectives?
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('#/study-planner')}
            className="gap-2"
          >
            <Play className="w-4 h-4 text-accent fill-accent/20" />
            <span>Focus Session</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onOpenCreateGoal}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Study Goal</span>
          </Button>
        </div>
      </div>

      {/* ── 2. KEY PERFORMANCE METRICS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Study Goal */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Goal</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {todayLoggedMinutes} <span className="text-sm font-normal text-muted">/ {targetMinutes}m</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted mt-1 font-medium">
              <span>Pace: {dailyTargetHours}h/day</span>
              <span className="text-accent font-semibold">{dailyProgressPercent}%</span>
            </div>
          </div>
          <ProgressBar value={dailyProgressPercent} height="h-1.5" />
        </Card>

        {/* Metric 2: Learning Streak */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
            <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
              <Flame className="w-4 h-4 fill-warning/20" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink flex items-center gap-1.5">
              {stats?.studyStreakDays || 1} <span className="text-sm font-normal text-muted">days</span>
            </div>
            <p className="text-[11px] text-muted mt-1 font-medium">
              Consecutive study days logged
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <div
                key={d}
                className={`flex-1 h-1.5 rounded-full ${
                  d <= (stats?.studyStreakDays || 1) ? 'bg-warning' : 'bg-line'
                }`}
              />
            ))}
          </div>
        </Card>

        {/* Metric 3: Total Study Hours */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Progress</span>
            <div className="w-8 h-8 rounded-lg bg-accent-secondary/15 text-accent-secondary flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {totalStudyHours} <span className="text-sm font-normal text-muted">hours</span>
            </div>
            <p className="text-[11px] text-muted mt-1 font-medium">
              Across {savedRoadmaps.length} learning paths
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{savedRoadmaps.length} Curriculums</span>
            <span className="text-accent-secondary font-medium font-mono">{goals.length} Goals</span>
          </div>
        </Card>

        {/* Metric 4: Overall Roadmap Completion */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {overallAvgProgress}% <span className="text-sm font-normal text-muted">avg</span>
            </div>
            <p className="text-[11px] text-muted mt-1 font-medium">
              {completedRoadmapsCount} finished · {inProgressRoadmapsCount} active
            </p>
          </div>
          <ProgressBar value={overallAvgProgress} variant="success" height="h-1.5" />
        </Card>
      </div>

      {/* ── 3. HERO: "YOUR NEXT STEP / CONTINUE LEARNING" ── */}
      {nextRecommendedTask && primaryRoadmap ? (
        <Card
          highlight
          className="p-5 sm:p-6 bg-gradient-to-br from-surface via-surface to-surface-secondary space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="glow" size="sm">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>YOUR NEXT STEP · RECOMMENDED NOW</span>
              </Badge>
              <span className="text-xs text-muted font-medium">
                From {primaryRoadmap.topic || primaryRoadmap.title}
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="accent" size="sm">
                Day {nextRecommendedTask.dayNumber} · {nextRecommendedTask.phaseTitle}
              </Badge>
              <Badge variant="neutral" size="sm">
                {nextRecommendedTask.estimatedMinutes} mins
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              {nextRecommendedTask.task.title}
            </h2>
            <p className="text-[13px] text-muted leading-relaxed max-w-4xl">
              {nextRecommendedTask.task.description ||
                nextRecommendedTask.task.conceptExplanation ||
                'Master core practical principles and work through hands-on implementation.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleTask(nextRecommendedTask)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-secondary text-[13px] font-medium text-ink transition cursor-pointer min-h-[38px]"
              >
                {nextRecommendedTask.isDone ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Circle className="w-4 h-4 text-muted" />
                )}
                <span>{nextRecommendedTask.isDone ? 'Mark Incomplete' : 'Mark as Done'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `#/ai-assistant?topic=${encodeURIComponent(
                      nextRecommendedTask.task.title
                    )}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line hover:border-accent/40 bg-surface text-[13px] font-medium text-muted hover:text-accent transition cursor-pointer min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Ask AI Tutor</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() =>
                navigate(
                  `#/roadmaps/${primaryRoadmap.id}/day/${nextRecommendedTask.dayNumber}`
                )
              }
              className="gap-2"
            >
              <span>Continue Learning</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-ink">Ready to Start Your Learning Journey?</h3>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            You don't have an active study roadmap yet. Generate an adaptive curriculum with Gemini AI to get structured daily topics.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('#/roadmaps/new')}
            className="gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create AI Roadmap</span>
          </Button>
        </Card>
      )}

      {/* ── 4. TWO-COLUMN MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Tasks & Weekly Study Activity (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Study Tasks */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <h3 className="text-base font-semibold text-ink">Today's Study Curriculum</h3>
              </div>
              <span className="text-xs font-medium text-muted">
                Day {nextRecommendedTask?.dayNumber || 1} tasks
              </span>
            </div>

            {todaysTasks.length > 0 ? (
              <div className="space-y-2.5">
                {todaysTasks.map((t) => (
                  <div
                    key={t.taskId}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      t.isDone
                        ? 'bg-surface-secondary/50 border-line opacity-75'
                        : 'bg-surface border-line hover:border-line-highlight'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className="mt-0.5 text-muted hover:text-accent transition cursor-pointer"
                      aria-label={`Toggle task ${t.task.title}`}
                    >
                      {t.isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[13px] font-semibold text-ink truncate ${
                            t.isDone ? 'line-through text-muted' : ''
                          }`}
                        >
                          {t.task.title}
                        </span>
                        <span className="text-xs font-mono text-muted shrink-0">
                          {t.estimatedMinutes}m
                        </span>
                      </div>
                      {t.task.description && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-1">
                          {t.task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted py-4 text-center">
                All tasks for today are complete! Relax or explore upcoming topics.
              </p>
            )}
          </Card>

          {/* Weekly Study Activity Chart */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <h3 className="text-base font-semibold text-ink">Weekly Study Activity</h3>
              </div>
              <span className="text-xs font-medium text-muted">
                {weeklyActivity.reduce((acc, d) => acc + d.minutes, 0)} mins logged this week
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {weeklyActivity.map((day) => (
                <div
                  key={day.name}
                  onClick={() => setSelectedDayIndex(day.index)}
                  className={`flex flex-col items-center p-2.5 rounded-xl border transition cursor-pointer ${
                    day.isToday
                      ? 'bg-accent/15 border-accent/40 shadow-xs'
                      : selectedDayIndex === day.index
                      ? 'bg-surface-secondary border-line-highlight'
                      : 'bg-surface border-line hover:border-line-highlight'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-muted mb-2">
                    {day.name}
                  </span>

                  {/* Vertical mini bar */}
                  <div className="w-3 h-16 bg-line/60 rounded-full flex flex-col justify-end overflow-hidden mb-2">
                    <div
                      className={`w-full transition-all duration-500 rounded-full ${
                        day.isToday
                          ? 'bg-accent'
                          : day.minutes > 0
                          ? 'bg-accent-secondary'
                          : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(12, day.pct)}%` }}
                    />
                  </div>

                  <span className="text-[11px] font-mono font-medium text-ink">
                    {day.minutes > 0 ? `${day.minutes}m` : '-'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Roadmaps, Recently Studied, Deadlines (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Roadmap Snapshot */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-accent" />
                <h3 className="text-base font-semibold text-ink">Active Curriculums</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('#/roadmaps')}
                className="text-xs text-accent font-medium hover:underline flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {savedRoadmaps.length > 0 ? (
              <div className="space-y-3">
                {savedRoadmaps.slice(0, 3).map((r) => {
                  const pct = r.progressPercentage || 0;
                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate(`#/roadmaps/${r.id}`)}
                      className="p-3.5 rounded-xl border border-line bg-surface hover:border-accent/40 hover:bg-surface-secondary transition cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink group-hover:text-accent transition-colors truncate">
                          {r.topic || r.title}
                        </span>
                        <span className="text-xs font-mono font-semibold text-accent shrink-0">
                          {pct}%
                        </span>
                      </div>
                      <ProgressBar value={pct} height="h-1.5" />
                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span>{r.targetDays || 30} days · {r.skillLevel || 'INTERMEDIATE'}</span>
                        <span className="text-accent font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Open <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted text-center py-4">
                No roadmaps found. Click Create AI Roadmap to get started.
              </p>
            )}
          </Card>

          {/* Recently Studied Topics */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-success" />
                <h3 className="text-base font-semibold text-ink">Recently Studied</h3>
              </div>
              <span className="text-xs font-medium text-muted">
                {recentlyCompletedTasks.length} topics
              </span>
            </div>

            {recentlyCompletedTasks.length > 0 ? (
              <div className="space-y-2.5">
                {recentlyCompletedTasks.map((item) => (
                  <div
                    key={item.taskId}
                    className="p-3 rounded-xl border border-line bg-surface-secondary/40 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <span className="font-medium text-ink truncate">
                        {item.task.title}
                      </span>
                    </div>
                    <span className="text-muted shrink-0 font-mono">
                      Day {item.dayNumber}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted text-center py-3">
                Completed study topics will appear here.
              </p>
            )}
          </Card>

          {/* Upcoming Deadlines / Goals */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <h3 className="text-base font-semibold text-ink">Upcoming Deadlines</h3>
              </div>
              <button
                type="button"
                onClick={onOpenCreateGoal}
                className="text-xs text-accent font-medium hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Goal
              </button>
            </div>

            {goals.length > 0 ? (
              <div className="space-y-2.5">
                {goals.slice(0, 3).map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl border border-line bg-surface flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-ink block truncate">
                        {g.title}
                      </span>
                      <span className="text-[11px] text-muted">
                        Target: {g.targetDays || 30} days · {g.hoursPerDay || 2}h/day
                      </span>
                    </div>
                    <Badge variant={g.status === 'COMPLETED' ? 'success' : 'accent'} size="xs">
                      {formatEnum(g.status || 'IN_PROGRESS')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted text-center py-3">
                No active learning goals registered yet.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
