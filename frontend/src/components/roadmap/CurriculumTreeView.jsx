import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Lock,
  Sparkles,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { ProgressBar } from '../ui/ProgressBar';

export const CurriculumTreeView = ({
  modules = [],
  allSequentialTasks = [],
  completedTasks = {},
  currentRecommendedTaskId = null,
  roadmapId = null,
  onToggleComplete
}) => {
  const { navigate } = useRouter();

  // Keep track of which phases are expanded (default all or first incomplete)
  const [expandedPhases, setExpandedPhases] = useState(() => {
    const map = {};
    modules.forEach((mod, idx) => {
      const isDone = mod.tasks.every((t) => Boolean(completedTasks[t.taskId]));
      map[idx] = !isDone || idx === 0;
    });
    return map;
  });

  const togglePhase = (idx) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleOpenDay = (dayNumber) => {
    if (roadmapId && dayNumber) {
      navigate(`#/roadmaps/${roadmapId}/day/${dayNumber}`);
    }
  };

  return (
    <div className="space-y-4">
      {modules.map(({ phase, phaseIndex, tasks }) => {
        const total = tasks.length;
        const doneCount = tasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
        const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        const isPhaseDone = total > 0 && doneCount === total;
        const isExpanded = Boolean(expandedPhases[phaseIndex]);

        return (
          <div
            key={`tree-phase-${phaseIndex}`}
            className="rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-xs transition"
          >
            {/* Phase Header */}
            <div
              onClick={() => togglePhase(phaseIndex)}
              className="p-4 sm:p-5 bg-surface-2/80 hover:bg-surface-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-accent/15 text-accent border border-accent/20">
                    PHASE {phaseIndex + 1}
                  </span>
                  {isPhaseDone ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-done/15 text-done border border-done/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Phase Completed
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-text-muted">
                      {doneCount} of {total} Days Completed
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-text truncate">
                  {phase.phaseTitle || phase.phase || `Phase ${phaseIndex + 1}`}
                </h3>

                {phase.description && (
                  <p className="text-xs text-text-muted line-clamp-2">
                    {phase.description}
                  </p>
                )}
              </div>

              {/* Progress & Chevron */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-32 sm:w-40 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-accent font-semibold">{progressPct}%</span>
                  </div>
                  <ProgressBar value={progressPct} height="h-1.5" />
                </div>

                <div className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-1">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Phase Tasks Tree */}
            {isExpanded && (
              <div className="p-4 sm:p-5 space-y-3 border-t border-border bg-surface-1/50">
                <div className="relative pl-4 sm:pl-6 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                  {tasks.map((taskItem) => {
                    const isDone = Boolean(completedTasks[taskItem.taskId]);
                    const isActive = taskItem.taskId === currentRecommendedTaskId;
                    const prevDone =
                      taskItem.sequenceIndex === 0 ||
                      Boolean(completedTasks[allSequentialTasks[taskItem.sequenceIndex - 1]?.taskId]);
                    const isLocked = !isDone && !prevDone;

                    return (
                      <div
                        key={taskItem.taskId}
                        className={`relative p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isDone
                            ? 'bg-surface-2/60 border-done/30'
                            : isActive
                            ? 'bg-surface-2 border-2 border-accent shadow-xs'
                            : isLocked
                            ? 'bg-surface-1/40 border-border/40 opacity-70'
                            : 'bg-surface-2 border-border hover:border-border-strong'
                        }`}
                      >
                        {/* Connecting Dot to Tree Line */}
                        <span
                          className={`absolute -left-[23px] sm:-left-[31px] top-5 w-3 h-3 rounded-full border-2 ${
                            isDone
                              ? 'bg-done border-surface-1'
                              : isActive
                              ? 'bg-accent border-surface-1 animate-pulse'
                              : 'bg-surface-2 border-border-strong'
                          }`}
                        />

                        {/* Task Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                isDone
                                  ? 'bg-done/15 text-done'
                                  : isActive
                                  ? 'bg-accent-solid text-white'
                                  : 'bg-surface-1 text-text-muted border border-border'
                              }`}
                            >
                              Day {taskItem.dayNumber}
                            </span>

                            {isDone ? (
                              <span className="text-xs font-semibold text-done flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                            ) : isActive ? (
                              <span className="text-xs font-bold text-accent flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> Currently Learning
                              </span>
                            ) : isLocked ? (
                              <span className="text-xs text-text-muted/70 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">Available</span>
                            )}

                            <span className="text-xs text-text-muted flex items-center gap-1 ml-auto sm:ml-0">
                              <Clock className="w-3 h-3" /> {taskItem.estimatedMinutes || 60}m
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-text">
                            {taskItem.task.title}
                          </h4>

                          {taskItem.task.description && (
                            <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                              {taskItem.task.description}
                            </p>
                          )}

                          {taskItem.task.topics && Array.isArray(taskItem.task.topics) && taskItem.task.topics.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {taskItem.task.topics.slice(0, 4).map((top, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-2 py-0.5 rounded text-[11px] bg-surface-1 border border-border text-text-muted"
                                >
                                  {typeof top === 'string' ? top : top.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions: Open Day & Toggle */}
                        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                          {onToggleComplete && (
                            <button
                              type="button"
                              onClick={() => onToggleComplete(taskItem.taskId, !isDone)}
                              className={`p-2 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                isDone
                                  ? 'bg-done/15 border-done/30 text-done hover:bg-done/25'
                                  : 'bg-surface-1 border-border text-text-muted hover:text-text'
                              }`}
                              title={isDone ? 'Mark Incomplete' : 'Mark Completed'}
                            >
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                              <span className="hidden sm:inline">{isDone ? 'Done' : 'Mark Done'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDay(taskItem.dayNumber)}
                            disabled={isLocked}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                              isLocked
                                ? 'bg-surface-1 text-text-muted/50 border border-border/50 cursor-not-allowed'
                                : isActive
                                ? 'bg-accent-solid text-white hover:opacity-90 shadow-xs'
                                : 'bg-surface-1 hover:bg-surface-2 border border-border text-text hover:border-border-strong'
                            }`}
                          >
                            <span>Study Day {taskItem.dayNumber}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CurriculumTreeView;
