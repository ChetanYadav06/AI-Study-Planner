import React, { useState, useEffect, useMemo } from 'react';
import {
  getGoals,
  getTopicKnowledge,
  getProgressOverview,
  getWeeklyReview
} from '../../services/api';
import { computeGoalStats } from '../../utils/goalStats';
import { PageHeader, Card, ProgressBar, StatusText, EmptyState } from '../ui';
import { Flame, AlertTriangle, Calendar, Clock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export const ProgressView = () => {
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [overview, setOverview] = useState(null);
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Timezone of user's browser
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsData, skillsData, overviewData, reviewData] = await Promise.all([
        getGoals().catch(() => []),
        getTopicKnowledge().catch(() => []),
        getProgressOverview(userTimezone).catch(() => null),
        getWeeklyReview(userTimezone).catch(() => null)
      ]);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setOverview(overviewData);
      setWeeklyReview(reviewData);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError('Unable to load progress data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userTimezone]);

  const goalStats = useMemo(() => computeGoalStats(goals), [goals]);
  const totalGoals = goalStats.totalGoals;
  const completedGoals = goalStats.completedGoals;
  const inProgressGoals = goalStats.inProgressGoals;
  const overallGoalProgress = totalGoals > 0
    ? Math.round(goals.reduce((acc, g) => acc + (g.progressPercentage || 0), 0) / totalGoals)
    : 0;

  // 14-day chart helpers
  const studyHistory = overview?.studyHistory14Days || [];
  const maxStudyMinutes = Math.max(60, ...studyHistory.map((d) => d.minutes || 0));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Progress & Review"
        subtitle="14-day study activity, streak, roadmap phases, and weekly review."
      />

      {/* 1. TOP STATS STRIP: Streak, Schedule Status, Overall Progress, Total Completed */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line">
          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Current streak</span>
            <div className="text-2xl font-semibold text-accent font-mono mt-1 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-accent inline" />
              <span>{overview?.currentStreakDays ?? 0} {overview?.currentStreakDays === 1 ? 'day' : 'days'}</span>
            </div>
            <p className="text-xs text-muted mt-0.5">≥ 20m focus study daily</p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Schedule pace</span>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                overview?.scheduleStatus?.status === 'AHEAD'
                  ? 'bg-accent-soft text-accent border border-accent/20'
                  : overview?.scheduleStatus?.status === 'BEHIND'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-page text-ink border border-line'
              }`}>
                {overview?.scheduleStatus?.label || 'On Track'}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 truncate" title={overview?.scheduleStatus?.detail}>
              {overview?.scheduleStatus?.detail || 'On pace'}
            </p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Overall goal progress</span>
            <div className="text-2xl font-semibold text-ink font-mono mt-1">{overallGoalProgress}%</div>
            <p className="text-xs text-muted mt-0.5">{completedGoals} of {totalGoals} goals done</p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Weekly focus</span>
            <div className="text-2xl font-semibold text-ink font-mono mt-1">
              {weeklyReview?.hoursStudied ?? 0}h
            </div>
            <p className="text-xs text-muted mt-0.5">Planned: {weeklyReview?.hoursPlanned ?? 0}h</p>
          </div>
        </div>
      </Card>

      {/* 2. 14-DAY STUDY ACTIVITY BAR CHART */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-sm font-semibold text-ink">14-Day Study Activity</h2>
            <p className="text-xs text-muted mt-0.5">Daily focus study minutes recorded via timer sessions</p>
          </div>
          <span className="text-xs font-mono text-muted">Max: {maxStudyMinutes} min</span>
        </div>

        {studyHistory.length > 0 ? (
          <div className="pt-2">
            <div className="flex items-end justify-between gap-1.5 h-36 border-b border-line pb-2">
              {studyHistory.map((item, idx) => {
                const heightPct = Math.max(4, Math.round((item.minutes / maxStudyMinutes) * 100));
                const dayLabel = item.date.slice(5); // MM-DD
                const meetsThreshold = item.minutes >= 20;
                return (
                  <div key={item.date || idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-mono text-muted opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      {item.minutes}m
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[28px] rounded-t-sm transition-all ${
                        meetsThreshold ? 'bg-accent' : item.minutes > 0 ? 'bg-accent/40' : 'bg-page'
                      }`}
                      title={`${item.date}: ${item.minutes} min`}
                    />
                    <span className="text-[11px] font-mono text-muted mt-1 truncate">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-muted">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No study activity recorded"
            description="Start focus timer sessions to visualize your daily study minutes."
          />
        )}
      </Card>

      {/* 3. ROADMAP PHASE PROGRESS BREAKDOWN */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-sm font-semibold text-ink">Active Roadmap Phase Progress</h2>
            <p className="text-xs text-muted mt-0.5">Completion breakdown by phase</p>
          </div>
          <span className="text-xs text-muted">
            {overview?.phaseProgress?.length || 0} {overview?.phaseProgress?.length === 1 ? 'phase' : 'phases'}
          </span>
        </div>

        {overview?.phaseProgress && overview.phaseProgress.length > 0 ? (
          <div className="space-y-3">
            {overview.phaseProgress.map((phase) => (
              <div key={phase.phaseIndex} className="p-3 rounded-md bg-page border border-line space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{phase.phaseTitle}</span>
                    <span className="text-muted">
                      ({phase.completedTasks}/{phase.totalTasks} tasks)
                    </span>
                  </div>
                  <span className="font-mono font-medium text-accent">{phase.progressPercentage}%</span>
                </div>
                <ProgressBar value={phase.progressPercentage} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active roadmap phases"
            description="Generate a study roadmap to view phase-by-phase completion progress."
          />
        )}
      </Card>

      {/* 4. NEEDS-ATTENTION SECTION (Pure Explainable Rule-Based) */}
      {overview?.needsAttention && overview.needsAttention.length > 0 && (
        <Card className="p-6 space-y-4 border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2 pb-3 border-b border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Needs Attention</h2>
              <p className="text-xs text-muted mt-0.5">Tasks or phases requiring revision based on your feedback and study time</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {overview.needsAttention.map((item, idx) => (
              <div key={idx} className="p-3 rounded-md bg-white border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                    {item.phaseTitle}
                  </span>
                </div>
                <p className="text-muted leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. WEEKLY REVIEW CARD & SUGGESTIONS */}
      {weeklyReview && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-sm font-semibold text-ink">Weekly Review</h2>
              <p className="text-xs text-muted mt-0.5">
                Window: {weeklyReview.weekStartDate} to {weeklyReview.weekEndDate}
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded ${
              weeklyReview.scheduleStatus?.status === 'AHEAD'
                ? 'bg-accent-soft text-accent border border-accent/20'
                : weeklyReview.scheduleStatus?.status === 'BEHIND'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-page text-ink border border-line'
            }`}>
              {weeklyReview.scheduleStatus?.label || 'On Track'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-md bg-page border border-line">
              <span className="text-xs text-muted block">Tasks completed</span>
              <p className="text-lg font-semibold text-ink mt-0.5">{weeklyReview.completedTasksCount}</p>
            </div>
            <div className="p-3 rounded-md bg-page border border-line">
              <span className="text-xs text-muted block">Hours studied</span>
              <p className="text-lg font-semibold text-accent mt-0.5">{weeklyReview.hoursStudied}h</p>
            </div>
            <div className="p-3 rounded-md bg-page border border-line">
              <span className="text-xs text-muted block">Planned hours</span>
              <p className="text-lg font-semibold text-ink mt-0.5">{weeklyReview.hoursPlanned}h</p>
            </div>
          </div>

          {/* Hardest Tasks / Phases */}
          {(weeklyReview.hardestTasks?.length > 0 || weeklyReview.hardestPhases?.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-line text-xs">
              <span className="font-semibold text-ink block">Identified Challenge Areas</span>
              {weeklyReview.hardestTasks?.length > 0 && (
                <p className="text-muted">
                  <strong className="text-ink font-medium">Tasks rated hard:</strong> {weeklyReview.hardestTasks.join(', ')}
                </p>
              )}
              {weeklyReview.hardestPhases?.length > 0 && (
                <p className="text-muted">
                  <strong className="text-ink font-medium">Phases with challenges:</strong> {weeklyReview.hardestPhases.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Computed Suggestions if behind schedule */}
          {weeklyReview.suggestions && weeklyReview.suggestions.length > 0 && (
            <div className="p-3.5 rounded-md bg-page border border-line space-y-2 text-xs">
              <span className="font-semibold text-ink block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Schedule Adjustment Suggestions
              </span>
              <ul className="list-disc list-inside space-y-1 text-muted">
                {weeklyReview.suggestions.map((sug, sIdx) => (
                  <li key={sIdx} className="leading-relaxed">{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* 6. GOALS OVERVIEW LIST */}
      <Card className="p-6 space-y-4">
        <div className="pb-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Active goals</h2>
          <p className="text-xs text-muted mt-0.5">Progress toward each defined syllabus target</p>
        </div>

        {goals.length > 0 ? (
          <div className="space-y-2.5">
            {goals.map((g) => (
              <div key={g.id} className="p-3 rounded-md bg-page border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">{g.title}</span>
                  <span className="text-xs font-mono font-medium text-accent">{g.progressPercentage || 0}%</span>
                </div>
                <ProgressBar value={g.progressPercentage || 0} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No goals tracked yet"
            description="Create a learning goal to track your milestone progress."
          />
        )}
      </Card>
    </div>
  );
};

export default ProgressView;
