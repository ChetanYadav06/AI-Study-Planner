import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Zap, Clock, BookOpen, Sparkles, FileText, ArrowRight, Check } from 'lucide-react';
import { getSavedRoadmaps, updateRoadmapProgress, createStudySession } from '../../services/api';
import { computeStudyQueue } from '../../utils/studyQueue';
import { formatEnum } from '../../utils/formatters';

const DURATION_BY_MODE = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

export const ActiveStudyView = ({ onNavigateRoadmap }) => {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [sessionSavedMsg, setSessionSavedMsg] = useState(null);

  // Retrieve current user ID from localStorage for isolated user timer & notes
  const currentUserId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.id || 'guest';
    } catch {
      return 'guest';
    }
  }, []);

  const timerStorageKey = `ai_study_timer_${currentUserId}`;

  // Read saved timer state on mount
  const getInitialTimerState = () => {
    try {
      const raw = localStorage.getItem(timerStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.mode) {
          const mode = parsed.mode;
          const totalSecs = parsed.durationSeconds || DURATION_BY_MODE[mode] || 25 * 60;
          if (parsed.running && parsed.startedAt) {
            const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
            const remaining = Math.max(0, totalSecs - elapsed);
            return {
              mode,
              durationSeconds: totalSecs,
              startedAt: parsed.startedAt,
              running: remaining > 0,
              remainingSeconds: remaining,
              sessionStartTime: parsed.sessionStartTime || parsed.startedAt
            };
          } else {
            return {
              mode,
              durationSeconds: totalSecs,
              startedAt: null,
              running: false,
              remainingSeconds: parsed.remainingSeconds ?? totalSecs,
              sessionStartTime: null
            };
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse timer state from localStorage:', e);
    }
    return {
      mode: 'focus',
      durationSeconds: 25 * 60,
      startedAt: null,
      running: false,
      remainingSeconds: 25 * 60,
      sessionStartTime: null
    };
  };

  const [timerState, setTimerState] = useState(getInitialTimerState);

  const loadRoadmaps = useCallback(async () => {
    try {
      const data = await getSavedRoadmaps();
      setRoadmaps(Array.isArray(data) ? data : []);
    } catch (e) {
      setRoadmaps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  // Active roadmap & study queue
  const activeRoadmap = roadmaps[0] || null;
  const studyQueue = useMemo(() => {
    if (!activeRoadmap) return null;
    return computeStudyQueue(activeRoadmap);
  }, [activeRoadmap]);

  const currentTask = studyQueue?.currentFocusTask || null;
  const taskId = currentTask?.taskId || 'general';

  // Task-scoped scratchpad note
  const noteStorageKey = `ai_study_notes_${currentUserId}_${taskId}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(noteStorageKey) || '');

  // Update notes when current task changes
  useEffect(() => {
    setNotes(localStorage.getItem(noteStorageKey) || '');
  }, [noteStorageKey]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    try {
      localStorage.setItem(noteStorageKey, val);
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  // Helper to persist session to backend
  const recordSession = useCallback(async (durationSec, type, completedFlag) => {
    if (durationSec < 60) return; // Skip under 1 minute
    try {
      const now = new Date();
      const started = new Date(now.getTime() - durationSec * 1000);
      await createStudySession({
        goalId: activeRoadmap?.goalId || null,
        roadmapId: activeRoadmap?.id || null,
        taskId: currentTask?.taskId || null,
        startedAt: started.toISOString(),
        endedAt: now.toISOString(),
        durationSeconds: durationSec,
        sessionType: type === 'focus' ? 'FOCUS' : 'BREAK',
        completed: completedFlag
      });
      setSessionSavedMsg(`Logged ${Math.round(durationSec / 60)} min ${type} session!`);
      setTimeout(() => setSessionSavedMsg(null), 4000);
    } catch (err) {
      console.error('Failed to record study session:', err);
    }
  }, [activeRoadmap, currentTask]);

  // Persist timer state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(timerStorageKey, JSON.stringify(timerState));
    } catch (e) {
      console.error('Failed to write timer state:', e);
    }
  }, [timerState, timerStorageKey]);

  // Timer tick effect: recalculates remaining from Date.now()
  useEffect(() => {
    if (!timerState.running || !timerState.startedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
      const remaining = Math.max(0, timerState.durationSeconds - elapsed);

      if (remaining === 0) {
        clearInterval(interval);
        // Completed session!
        const totalDuration = timerState.durationSeconds;
        recordSession(totalDuration, timerState.mode, true);

        setTimerState(prev => ({
          ...prev,
          running: false,
          startedAt: null,
          remainingSeconds: 0,
          sessionStartTime: null
        }));
      } else {
        setTimerState(prev => ({
          ...prev,
          remainingSeconds: remaining
        }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timerState.running, timerState.startedAt, timerState.durationSeconds, timerState.mode, recordSession]);

  const handleStartTimer = () => {
    const now = Date.now();
    const duration = timerState.remainingSeconds > 0
      ? timerState.remainingSeconds
      : (DURATION_BY_MODE[timerState.mode] || 25 * 60);

    setTimerState(prev => ({
      ...prev,
      running: true,
      durationSeconds: duration,
      startedAt: now,
      sessionStartTime: prev.sessionStartTime || now,
      remainingSeconds: duration
    }));
  };

  const handlePauseTimer = () => {
    // If paused, record partial session if >= 60s
    if (timerState.startedAt && timerState.sessionStartTime) {
      const sessionSeconds = Math.floor((Date.now() - timerState.startedAt) / 1000);
      if (sessionSeconds >= 60) {
        recordSession(sessionSeconds, timerState.mode, false);
      }
    }

    setTimerState(prev => ({
      ...prev,
      running: false,
      startedAt: null,
      sessionStartTime: null
    }));
  };

  const handleResetTimer = () => {
    if (timerState.running && timerState.startedAt) {
      const sessionSeconds = Math.floor((Date.now() - timerState.startedAt) / 1000);
      if (sessionSeconds >= 60) {
        recordSession(sessionSeconds, timerState.mode, false);
      }
    }
    const defaultSecs = DURATION_BY_MODE[timerState.mode] || 25 * 60;
    setTimerState({
      mode: timerState.mode,
      durationSeconds: defaultSecs,
      startedAt: null,
      running: false,
      remainingSeconds: defaultSecs,
      sessionStartTime: null
    });
  };

  const handleSetMode = (newMode) => {
    if (timerState.running && timerState.startedAt) {
      const sessionSeconds = Math.floor((Date.now() - timerState.startedAt) / 1000);
      if (sessionSeconds >= 60) {
        recordSession(sessionSeconds, timerState.mode, false);
      }
    }
    const totalSecs = DURATION_BY_MODE[newMode] || 25 * 60;
    setTimerState({
      mode: newMode,
      durationSeconds: totalSecs,
      startedAt: null,
      running: false,
      remainingSeconds: totalSecs,
      sessionStartTime: null
    });
  };

  const formatTimer = (totalSecs) => {
    const safeSecs = Math.max(0, totalSecs || 0);
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Mark current task complete
  const handleMarkTaskComplete = async () => {
    if (!activeRoadmap || !currentTask) return;
    setMarkingDone(true);
    try {
      const currentCompleted = activeRoadmap.completedTasksJson
        ? JSON.parse(activeRoadmap.completedTasksJson)
        : [];

      const updated = currentCompleted.includes(currentTask.taskId)
        ? currentCompleted
        : [...currentCompleted, currentTask.taskId];

      await updateRoadmapProgress(activeRoadmap.id, {
        completedTasksJson: JSON.stringify(updated),
        completedMilestonesJson: activeRoadmap.completedMilestonesJson || '[]',
        progressPercentage: activeRoadmap.progressPercentage || 0
      });

      // Reload roadmaps to re-evaluate the queue
      await loadRoadmaps();
      setSessionSavedMsg(`Completed "${currentTask.task.title}"! Next task loaded.`);
      setTimeout(() => setSessionSavedMsg(null), 4000);
    } catch (err) {
      console.error('Failed to mark task complete:', err);
    } finally {
      setMarkingDone(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-slide">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 text-xs font-bold uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 text-teal-600" />
            <span>Deep Work & Study Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Active Study Mode
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Timestamp-synced focus pacing linked directly to your active curriculum.
          </p>
        </div>

        {sessionSavedMsg && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-slide">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{sessionSavedMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pomodoro Focus Timer */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col items-center justify-between space-y-6 text-center">
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => handleSetMode('focus')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timerState.mode === 'focus' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => handleSetMode('shortBreak')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timerState.mode === 'shortBreak' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => handleSetMode('longBreak')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timerState.mode === 'longBreak' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Clock Display */}
          <div className="relative my-4">
            <div className="w-56 h-56 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white shadow-inner">
              <span className="font-mono text-5xl font-black text-slate-900 tracking-tight">
                {formatTimer(timerState.remainingSeconds)}
              </span>
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mt-2">
                {timerState.running ? 'Timer Active' : 'Ready to Focus'}
              </span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center space-x-3">
            {timerState.running ? (
              <button
                onClick={handlePauseTimer}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Session</span>
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Focus</span>
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Active Task & Session Notes */}
        <div className="lg:col-span-6 space-y-6">
          {/* Current Focus Task */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
                Current Learning Focus
              </span>
              {activeRoadmap && (
                <span className="text-xs text-slate-400 font-semibold truncate max-w-[180px]">
                  {activeRoadmap.title}
                </span>
              )}
            </div>

            {currentTask ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Day {currentTask.task.dayNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {formatEnum(currentTask.task.activityType || 'Study')}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{currentTask.task.estimatedMinutes != null ? `${currentTask.task.estimatedMinutes}m` : 'Flexible duration'}</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {currentTask.task.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentTask.task.description}
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleMarkTaskComplete}
                    disabled={markingDone}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{markingDone ? 'Syncing...' : 'Mark Task Complete'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">All current tasks completed!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Explore new roadmap curricula in the Studio.</p>
              </div>
            )}
          </div>

          {/* Session Notes Scratchpad */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900">Task Scratchpad</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Autosaved locally</span>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={handleNotesChange}
              placeholder="Jot down quick code snippets, questions, or key takeaways for this task..."
              className="w-full p-3 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition resize-none bg-slate-50/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveStudyView;
