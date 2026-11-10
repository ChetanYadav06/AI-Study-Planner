import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Clock, FileText, Check } from 'lucide-react';
import { getSavedRoadmaps, updateRoadmapProgress, createStudySession } from '../../services/api';
import { computeStudyQueue } from '../../utils/studyQueue';
import { formatEnum } from '../../utils/formatters';
import { PageHeader, Card, Button } from '../ui';

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
      setSessionSavedMsg(`Logged ${Math.round(durationSec / 60)}m ${type} session.`);
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

      await loadRoadmaps();
      setSessionSavedMsg(`Completed "${currentTask.task.title}". Next task queued.`);
      setTimeout(() => setSessionSavedMsg(null), 4000);
    } catch (err) {
      console.error('Failed to mark task complete:', err);
    } finally {
      setMarkingDone(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Focus session"
        subtitle="Pick a task and start the timer."
      />

      {sessionSavedMsg && (
        <div className="p-2.5 rounded-[6px] bg-accent-soft border border-line text-accent text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{sessionSavedMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pomodoro Focus Timer */}
        <Card className="lg:col-span-6 p-6 flex flex-col items-center justify-between space-y-6 text-center">
          <div className="flex items-center gap-1 bg-page p-1 rounded-[6px] border border-line">
            <button
              type="button"
              onClick={() => handleSetMode('focus')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition cursor-pointer ${
                timerState.mode === 'focus' ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink'
              }`}
            >
              Focus (25m)
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('shortBreak')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition cursor-pointer ${
                timerState.mode === 'shortBreak' ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink'
              }`}
            >
              Break (5m)
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('longBreak')}
              className={`px-3 py-1 rounded-[4px] text-xs font-medium transition cursor-pointer ${
                timerState.mode === 'longBreak' ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink'
              }`}
            >
              Long (15m)
            </button>
          </div>

          {/* Clock Display */}
          <div className="my-2">
            <div className="w-52 h-52 rounded-full border-2 border-accent flex flex-col items-center justify-center bg-surface">
              <span className="font-mono text-4xl font-semibold text-ink tracking-tight">
                {formatTimer(timerState.remainingSeconds)}
              </span>
              <span className="text-xs text-muted mt-1">
                {timerState.running ? 'Focusing' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-2">
            {timerState.running ? (
              <Button
                variant="outline"
                size="md"
                onClick={handlePauseTimer}
                icon={Pause}
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleStartTimer}
                icon={Play}
              >
                Start focus
              </Button>
            )}

            <Button
              variant="outline"
              size="md"
              onClick={handleResetTimer}
              icon={RotateCcw}
              aria-label="Reset Timer"
            />
          </div>
        </Card>

        {/* Right Column: Active Task & Session Notes */}
        <div className="lg:col-span-6 space-y-4">
          {/* Current Focus Task */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-line">
              <span className="text-xs font-medium text-accent">
                Current task
              </span>
              {activeRoadmap && (
                <span className="text-xs text-muted truncate max-w-[180px]">
                  {activeRoadmap.title}
                </span>
              )}
            </div>

            {currentTask ? (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-accent">
                    Day {currentTask.task.dayNumber}
                  </span>
                  <span className="text-xs text-muted">
                    · {formatEnum(currentTask.task.activityType || 'Study')}
                  </span>
                  <span className="text-xs text-muted">
                    · {currentTask.task.estimatedMinutes != null ? `${currentTask.task.estimatedMinutes}m` : '90m'}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-ink leading-snug">
                  {currentTask.task.title}
                </h3>
                {currentTask.task.description && (
                  <p className="text-xs text-muted leading-relaxed">
                    {currentTask.task.description}
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleMarkTaskComplete}
                    disabled={markingDone}
                    icon={Check}
                  >
                    {markingDone ? 'Saving...' : 'Mark Task Complete'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted">
                <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-1" />
                <p className="text-xs font-medium text-ink">All tasks completed</p>
                <p className="text-xs text-muted mt-0.5">Explore new roadmap curricula in the Studio.</p>
              </div>
            )}
          </Card>

          {/* Session Notes Scratchpad */}
          <Card className="p-5 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <h3 className="text-xs font-medium text-ink">Task scratchpad</h3>
              </div>
              <span className="text-xs text-muted">Autosaved</span>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={handleNotesChange}
              placeholder="Jot down quick code snippets, questions, or key takeaways..."
              className="w-full p-2.5 rounded-[6px] border border-line bg-surface text-xs text-ink placeholder:text-muted focus:border-accent outline-none transition resize-none"
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ActiveStudyView;
