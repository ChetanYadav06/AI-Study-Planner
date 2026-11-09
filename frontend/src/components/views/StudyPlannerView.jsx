import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, PlusCircle, Target, CheckCircle2, ChevronRight, Sparkles, BookOpen, Coffee, Zap } from 'lucide-react';
import { getGoals, getSavedRoadmaps, getStudentProfile, getStudySessions } from '../../services/api';
import { computeGoalStats } from '../../utils/goalStats';
import { formatEnum } from '../../utils/formatters';
import { getCanonicalTaskId } from '../../utils/studyQueue';

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
  // Mapping day of week (0..6) to Monday-based index (0=Mon .. 6=Sun)
  const isStudyDayIndex = (dayIndex) => {
    // Convert 0 (Sun) to 6, 1 (Mon) to 0, 2 (Tue) to 1 ...
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

    // Find the next study days in chronological order starting today
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

    // Approximate study days elapsed based on weekly pace
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
        color: 'text-emerald-600',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        detail: `+${delta} ${delta === 1 ? 'day' : 'days'} ahead (${completedCount} completed vs ${expectedStudyDays} expected)`
      };
    } else if (Math.abs(delta) <= 1) {
      return {
        label: 'On Track',
        color: 'text-teal-600',
        badge: 'bg-teal-50 text-teal-800 border-teal-200',
        detail: `On pace (${completedCount} completed of ~${expectedStudyDays} expected study days)`
      };
    } else {
      const behindDays = Math.abs(delta);
      return {
        label: 'Behind Schedule',
        color: 'text-amber-600',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        detail: `${behindDays} ${behindDays === 1 ? 'day' : 'days'} behind (${completedCount} completed vs ${expectedStudyDays} expected)`
      };
    }
  }, [primaryRoadmap, availableDaysCount]);

  const selectedDayInfo = weeklySchedule[selectedDay] || { isStudyDay: false, roadmapDay: null, plannedMinutes: 0 };
  const selectedLoggedMinutes = loggedMinutesByWeekday[selectedDay] || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-slide">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Weekly Study Schedule ({availableDaysCount} Days/Week)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Study Planner & Timetable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Sequential roadmap pacing aligned with your target study days and logged deep work sessions.
          </p>
        </div>

        <button
          onClick={onOpenCreateGoal}
          className="inline-flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-teal-500/20 transition cursor-pointer shrink-0 self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Study Goal</span>
        </button>
      </div>

      {/* Days Selector Strip */}
      <div className="grid grid-cols-7 gap-2 bg-white rounded-3xl border border-slate-200/80 p-3 shadow-xs">
        {daysOfWeek.map((dayName, idx) => {
          const isSelected = selectedDay === idx;
          const isToday = new Date().getDay() === idx;
          const daySchedule = weeklySchedule[idx];
          const isRest = !daySchedule?.isStudyDay;

          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              className={`p-3 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center relative ${
                isSelected
                  ? 'bg-teal-500 text-white shadow-sm font-bold'
                  : isRest
                  ? 'bg-slate-50/60 text-slate-400 hover:bg-slate-100'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                {shortDays[idx]}
              </span>
              <span className="text-sm font-black mt-0.5">
                {isToday ? 'Today' : `D${idx + 1}`}
              </span>
              <span className={`text-[9px] mt-1 font-semibold ${isSelected ? 'text-teal-100' : isRest ? 'text-slate-400 italic' : 'text-teal-600'}`}>
                {isRest ? 'Rest' : 'Study'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Overview Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selected Day Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Day</span>
          <div className="flex items-center space-x-2 mt-1">
            <h3 className="text-xl font-black text-slate-900">{daysOfWeek[selectedDay]}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              selectedDayInfo.isStudyDay ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {selectedDayInfo.isStudyDay ? 'Study Day' : 'Rest Day'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {selectedDayInfo.isStudyDay
              ? `Scheduled focus pacing for ${daysOfWeek[selectedDay]}`
              : `Recovery day based on your ${availableDaysCount}-day study schedule`}
          </p>
        </div>

        {/* Planned vs Logged Minutes */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Focus Minutes</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <h3 className="text-xl font-black text-teal-600">{selectedLoggedMinutes}m</h3>
            <span className="text-xs font-bold text-slate-400">/ {selectedDayInfo.plannedMinutes}m planned</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {selectedLoggedMinutes > 0
              ? `${Math.round((selectedLoggedMinutes / (selectedDayInfo.plannedMinutes || 1)) * 100)}% of planned focus logged`
              : 'No focus sessions logged for this day yet'}
          </p>
        </div>

        {/* Computed Schedule Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curriculum Pacing</span>
          {scheduleStatus ? (
            <div className="mt-1">
              <div className="flex items-center space-x-2">
                <h3 className={`text-xl font-black ${scheduleStatus.color}`}>
                  {scheduleStatus.label}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {scheduleStatus.detail}
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <h3 className="text-xl font-black text-slate-700">Pacing Active</h3>
              <p className="text-xs text-slate-500 mt-1">Roadmap pacing active</p>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Study Slots */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Planned Tasks & Modules for {daysOfWeek[selectedDay]}</span>
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {selectedDayInfo.isStudyDay && selectedDayInfo.roadmapDay
              ? `${selectedDayInfo.roadmapDay.tasks.length} Daily ${selectedDayInfo.roadmapDay.tasks.length === 1 ? 'Task' : 'Tasks'}`
              : selectedDayInfo.isStudyDay
              ? 'No tasks queued'
              : 'Rest Period'}
          </span>
        </div>

        {selectedDayInfo.isStudyDay ? (
          selectedDayInfo.roadmapDay && selectedDayInfo.roadmapDay.tasks.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 font-mono">
                  Roadmap Day {selectedDayInfo.roadmapDay.dayNumber} Focus
                </span>
                <span className="text-xs text-teal-700 font-semibold">
                  {selectedDayInfo.plannedMinutes} mins estimated
                </span>
              </div>

              {selectedDayInfo.roadmapDay.tasks.map((taskItem, idx) => (
                <div
                  key={taskItem.taskId}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-100/70 text-teal-800">
                          {formatEnum(taskItem.task.activityType || 'Study')}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {taskItem.phaseTitle}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-teal-700 transition">
                        {taskItem.task.title}
                      </h4>
                      {taskItem.task.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{taskItem.task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">{taskItem.estimatedMinutes}m planned</span>
                      <span className="text-[10px] text-teal-700 font-mono">Day {taskItem.dayNumber}</span>
                    </div>
                    {primaryRoadmap && (
                      <button
                        onClick={() => onNavigateRoadmap && onNavigateRoadmap(primaryRoadmap)}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-teal-600 transition cursor-pointer shadow-2xs"
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
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">All planned roadmap tasks completed!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You have finished all queued tasks for your active curriculum.
              </p>
            </div>
          )
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Coffee className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Scheduled Rest & Recovery Day</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your profile is configured for {availableDaysCount} study days per week. Use this day to rest, reflect, or review past notes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlannerView;
