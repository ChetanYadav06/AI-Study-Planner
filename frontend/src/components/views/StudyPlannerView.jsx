import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, PlusCircle, CheckCircle2, Coffee } from 'lucide-react';
import { getGoals, getSavedRoadmaps, getStudentProfile, getStudySessions } from '../../services/api';
import { computeGoalStats } from '../../utils/goalStats';
import { formatEnum } from '../../utils/formatters';
import { getCanonicalTaskId } from '../../utils/studyQueue';
import { PageHeader, Card, Button, EmptyState } from '../ui';

export const StudyPlannerView = ({ onOpenCreateGoal, onNavigateRoadmap }) => {
  const [goals, setGoals] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    Promise.all([
      getGoals().catch(() => []),
      getSavedRoadmaps().catch(() => []),
      getStudentProfile().catch(() => null),
      getStudySessions().catch(() => [])
    ])
      .then(([goalsData, roadmapsData, profileData, sessionsData]) => {
        setGoals(Array.isArray(goalsData) ? goalsData : []);
        setRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : []);
        setProfile(profileData || null);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const goalStats = useMemo(() => computeGoalStats(goals), [goals]);
  const activeGoals = goalStats.activeGoalsList;

  // Study schedule preference (default: 5 days/week -> Mon-Fri)
  const availableDaysCount = Math.max(1, Math.min(7, profile?.availableDaysPerWeek ?? 5));

  // Determine study vs rest days based on availableDaysCount (Monday-based: 1=Mon, 2=Tue, ... 5=Fri, 6=Sat, 0=Sun)
  const isStudyDayIndex = (dayIndex) => {
    const mondayBased = (dayIndex + 6) % 7;
    return mondayBased < availableDaysCount;
  };

  // Extract incomplete roadmap tasks in chronological order
  const { allIncompleteTasks, primaryRoadmap } = useMemo(() => {
    const activeRoadmap = roadmaps[0] || null;
    if (!activeRoadmap) return { allIncompleteTasks: [], primaryRoadmap: null };

    let parsed = activeRoadmap;
    if (activeRoadmap.roadmapJson) {
      try {
        parsed = typeof activeRoadmap.roadmapJson === 'string'
          ? JSON.parse(activeRoadmap.roadmapJson)
          : activeRoadmap.roadmapJson;
      } catch {
        parsed = activeRoadmap;
      }
    }

    let completedSet = new Set();
    if (activeRoadmap.completedTasksJson) {
      try {
        const arr = JSON.parse(activeRoadmap.completedTasksJson);
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

        if (!isDone) {
          tasks.push({
            taskId,
            dayNumber,
            phaseIdx: pIdx,
            phaseTitle: phase.phaseTitle || phase.phase || `Phase ${pIdx + 1}`,
            task,
            isDone: false,
            estimatedMinutes: task.estimatedMinutes != null && !isNaN(task.estimatedMinutes) ? Number(task.estimatedMinutes) : 90
          });
        }
      });
    });

    return { allIncompleteTasks: tasks, primaryRoadmap: activeRoadmap };
  }, [roadmaps]);

  // Group incomplete tasks by roadmap dayNumber
  const incompleteTasksByDayNumber = useMemo(() => {
    const map = new Map();
    allIncompleteTasks.forEach(t => {
      if (!map.has(t.dayNumber)) {
        map.set(t.dayNumber, []);
      }
      map.get(t.dayNumber).push(t);
    });
    return Array.from(map.entries()).map(([dayNum, tasks]) => ({
      dayNumber: dayNum,
      tasks,
      totalMinutes: tasks.reduce((sum, item) => sum + item.estimatedMinutes, 0)
    }));
  }, [allIncompleteTasks]);

  // Map upcoming study days to roadmap days starting from today
  const weeklySchedule = useMemo(() => {
    const todayIndex = new Date().getDay();
    const scheduleByDay = {};

    let studyDaySlotCounter = 0;

    for (let offset = 0; offset < 7; offset++) {
      const currentDayIdx = (todayIndex + offset) % 7;
      const isStudy = isStudyDayIndex(currentDayIdx);

      if (isStudy) {
        const assignedRoadmapDay = incompleteTasksByDayNumber[studyDaySlotCounter] || null;
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
  }, [incompleteTasksByDayNumber, availableDaysCount]);

  // Compute logged session minutes per weekday (Sunday..Saturday)
  const loggedMinutesByWeekday = useMemo(() => {
    const map = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    sessions.forEach(s => {
      if (s.startedAt) {
        const d = new Date(s.startedAt);
        const weekday = d.getDay();
        const mins = Math.round((s.durationSeconds || 0) / 60);
        map[weekday] = (map[weekday] || 0) + mins;
      }
    });
    return map;
  }, [sessions]);

  // Computed Schedule Status: compares completed task count vs expected based on days elapsed
  const scheduleStatus = useMemo(() => {
    if (!primaryRoadmap || !primaryRoadmap.createdAt) return null;

    const createdDate = new Date(primaryRoadmap.createdAt);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - createdDate.getTime());
    const calendarDaysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const expectedStudyDays = Math.max(1, Math.round((calendarDaysElapsed * availableDaysCount) / 7));

    let completedCount = 0;
    if (primaryRoadmap.completedTasksJson) {
      try {
        const arr = JSON.parse(primaryRoadmap.completedTasksJson);
        if (Array.isArray(arr)) completedCount = arr.length;
      } catch {}
    }

    const delta = completedCount - expectedStudyDays;

    if (delta >= 1) {
      return {
        label: 'Ahead of Schedule',
        detail: `+${delta} ${delta === 1 ? 'day' : 'days'} ahead (${completedCount} completed vs ${expectedStudyDays} expected)`
      };
    } else if (Math.abs(delta) <= 1) {
      return {
        label: 'On Track',
        detail: `On pace (${completedCount} completed of ~${expectedStudyDays} expected study days)`
      };
    } else {
      const behindDays = Math.abs(delta);
      return {
        label: 'Behind Schedule',
        detail: `${behindDays} ${behindDays === 1 ? 'day' : 'days'} behind (${completedCount} completed vs ${expectedStudyDays} expected)`
      };
    }
  }, [primaryRoadmap, availableDaysCount]);

  const selectedDayInfo = weeklySchedule[selectedDay] || { isStudyDay: false, roadmapDay: null, plannedMinutes: 0 };
  const selectedLoggedMinutes = loggedMinutesByWeekday[selectedDay] || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Study planner"
        subtitle="What's scheduled this week."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateGoal}
            icon={PlusCircle}
          >
            Add goal
          </Button>
        }
      />

      {/* Days Selector Strip */}
      <Card className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map((dayName, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = new Date().getDay() === idx;
            const daySchedule = weeklySchedule[idx];
            const isRest = !daySchedule?.isStudyDay;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDay(idx)}
                className={`p-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-accent text-surface font-medium'
                    : isRest
                    ? 'bg-page text-muted hover:bg-slate-100'
                    : 'hover:bg-page text-ink'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-surface/80' : 'text-muted'}`}>
                  {shortDays[idx]}
                </span>
                <span className="text-xs font-semibold mt-0.5">
                  {isToday ? 'Today' : `D${idx + 1}`}
                </span>
                <span className={`text-xs mt-0.5 ${isSelected ? 'text-surface/90' : isRest ? 'text-muted' : 'text-accent'}`}>
                  {isRest ? 'Rest' : 'Study'}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day Overview Summary */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
          {/* Selected Day Status */}
          <div className="p-3 text-center md:text-left">
            <span className="text-xs text-muted block">Selected day</span>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
              <span className="text-base font-semibold text-ink">{daysOfWeek[selectedDay]}</span>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-page border border-line text-muted">
                {selectedDayInfo.isStudyDay ? 'Study' : 'Rest'}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              {selectedDayInfo.isStudyDay
                ? `Focus pacing for ${daysOfWeek[selectedDay]}`
                : `Rest day based on ${availableDaysCount}d schedule`}
            </p>
          </div>

          {/* Planned vs Logged Minutes */}
          <div className="p-3 text-center md:text-left">
            <span className="text-xs text-muted block">Focus minutes</span>
            <div className="flex items-baseline justify-center md:justify-start gap-1.5 mt-1">
              <span className="text-base font-semibold text-accent font-mono">{selectedLoggedMinutes}m</span>
              <span className="text-xs text-muted">/ {selectedDayInfo.plannedMinutes}m planned</span>
            </div>
            <p className="text-xs text-muted mt-1">
              {selectedLoggedMinutes > 0
                ? `${Math.round((selectedLoggedMinutes / (selectedDayInfo.plannedMinutes || 1)) * 100)}% of planned focus logged`
                : 'No sessions logged today'}
            </p>
          </div>

          {/* Computed Schedule Status */}
          <div className="p-3 text-center md:text-left">
            <span className="text-xs text-muted block">Curriculum pacing</span>
            {scheduleStatus ? (
              <div className="mt-1">
                <span className="text-base font-semibold text-ink block">
                  {scheduleStatus.label}
                </span>
                <p className="text-xs text-muted mt-1">
                  {scheduleStatus.detail}
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <span className="text-base font-semibold text-ink block">Pacing Active</span>
                <p className="text-xs text-muted mt-1">Roadmap pacing active</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Scheduled Study Slots */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-sm font-semibold text-ink">Planned tasks for {daysOfWeek[selectedDay]}</h2>
            <p className="text-xs text-muted mt-0.5">Tasks scheduled for this study day</p>
          </div>
          <span className="text-xs font-mono text-muted">
            {selectedDayInfo.isStudyDay && selectedDayInfo.roadmapDay
              ? `${selectedDayInfo.roadmapDay.tasks.length} tasks`
              : selectedDayInfo.isStudyDay
              ? '0 tasks'
              : 'Rest'}
          </span>
        </div>

        {selectedDayInfo.isStudyDay ? (
          selectedDayInfo.roadmapDay && selectedDayInfo.roadmapDay.tasks.length > 0 ? (
            <div className="space-y-2">
              <div className="p-2.5 bg-page rounded-md border border-line flex items-center justify-between text-xs">
                <span className="font-medium text-ink">
                  Roadmap Day {selectedDayInfo.roadmapDay.dayNumber} focus
                </span>
                <span className="text-muted font-mono">
                  {selectedDayInfo.plannedMinutes} mins estimated
                </span>
              </div>

              {selectedDayInfo.roadmapDay.tasks.map((taskItem, idx) => (
                <div
                  key={taskItem.taskId}
                  className="p-3 rounded-md border border-line bg-surface hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-sm bg-page border border-line text-ink flex items-center justify-center font-mono text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-accent">
                          {formatEnum(taskItem.task.activityType || 'Study')}
                        </span>
                        <span className="text-xs text-muted">
                          · {taskItem.phaseTitle}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-ink mt-0.5">
                        {taskItem.task.title}
                      </h4>
                      {taskItem.task.description && (
                        <p className="text-xs text-muted line-clamp-1 mt-0.5">{taskItem.task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-xs font-mono text-ink block">{taskItem.estimatedMinutes}m</span>
                      <span className="text-xs text-muted">Day {taskItem.dayNumber}</span>
                    </div>
                    {primaryRoadmap && (
                      <button
                        type="button"
                        onClick={() => onNavigateRoadmap && onNavigateRoadmap(primaryRoadmap)}
                        className="p-1.5 rounded-sm border border-line hover:border-slate-300 text-muted hover:text-ink transition cursor-pointer"
                        title="Open Roadmap"
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
              <CheckCircle2 className="w-6 h-6 mx-auto text-success mb-1" />
              <p className="text-xs font-medium text-ink">All planned roadmap tasks completed</p>
              <p className="text-xs text-muted">You have finished all queued tasks for your active curriculum.</p>
            </div>
          )
        ) : (
          <div className="py-8 text-center text-muted space-y-1 bg-page rounded-md border border-line">
            <Coffee className="w-6 h-6 mx-auto text-muted mb-1" />
            <p className="text-xs font-medium text-ink">Rest & recovery day</p>
            <p className="text-xs text-muted">
              Configured for {availableDaysCount} study days per week. Take time to rest or review past notes.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudyPlannerView;
