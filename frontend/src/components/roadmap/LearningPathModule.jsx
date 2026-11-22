import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { TopicNodeCard } from './TopicNodeCard';
import { PhaseExtrasAccordion } from './PhaseExtrasAccordion';

export const LearningPathModule = ({
  phase,
  phaseIndex,
  tasks = [],
  completedTasks = {},
  currentRecommendedTaskId = null,
  allSequentialTasks = [],
  onSelectTopic,
  onToggleComplete,
  id
}) => {
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isModuleComplete = totalTasks > 0 && completedCount === totalTasks;

  // Collapse completed modules by default; keep incomplete modules expanded
  const [isExpanded, setIsExpanded] = useState(!isModuleComplete);

  // If a module finishes, sync collapse state unless manually opened
  useEffect(() => {
    if (isModuleComplete) {
      setIsExpanded(false);
    }
  }, [isModuleComplete]);

  return (
    <div id={id} className="scroll-mt-6">
      <Card className="overflow-hidden border border-border bg-surface-1/90 space-y-0">
        {/* ── MODULE HEADER ── */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-5 sm:p-6 bg-surface-2 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-2/90 transition select-none"
        >
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="xs">
                MODULE {phaseIndex + 1}
              </Badge>

              {isModuleComplete ? (
                <Badge variant="success" size="xs" icon={CheckCircle2}>
                  Module Completed ({completedCount}/{totalTasks})
                </Badge>
              ) : (
                <span className="text-xs text-text-muted font-mono font-medium">
                  {completedCount} of {totalTasks} topics completed
                </span>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-text tracking-tight">
                {phase.phaseTitle || phase.phase || `Phase ${phaseIndex + 1}`}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-1 border border-border transition sm:hidden"
                aria-label={isExpanded ? 'Collapse module' : 'Expand module'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {phase.description && (
              <p className="text-[13px] text-text-muted leading-relaxed max-w-3xl">
                {phase.description}
              </p>
            )}
          </div>

          {/* Module Progress Metric & Toggle Chevron */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-36 sm:w-44 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted font-medium">Progress</span>
                <span className="text-accent font-mono font-semibold">{progressPct}%</span>
              </div>
              <ProgressBar value={progressPct} height="h-1.5" />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text transition cursor-pointer"
              aria-label={isExpanded ? 'Collapse module' : 'Expand module'}
              title={isExpanded ? 'Collapse module' : 'Expand module'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── EXPANDED CONTENT: TOPICS LEARNING SEQUENCE ── */}
        {isExpanded && (
          <div className="p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Learning Sequence & Dependencies
              </span>
              <span className="text-[11px] text-text-muted">
                Complete topics in order to unlock prerequisites
              </span>
            </div>

            {/* Responsive Connected Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((taskItem) => {
                const isCompleted = Boolean(completedTasks[taskItem.taskId]);
                const isUpNext = taskItem.taskId === currentRecommendedTaskId;

                // Determine prerequisite across sequence
                const seqIdx = taskItem.sequenceIndex;
                const prevSeqTask = seqIdx > 0 && allSequentialTasks[seqIdx - 1]
                  ? allSequentialTasks[seqIdx - 1]
                  : null;
                const isPrereqMet = !prevSeqTask || Boolean(completedTasks[prevSeqTask.taskId]);

                let state = 'ready';
                if (isCompleted) {
                  state = 'done';
                } else if (isUpNext) {
                  state = 'up-next';
                } else if (!isPrereqMet) {
                  state = 'locked';
                } else {
                  state = 'ready';
                }

                return (
                  <TopicNodeCard
                    key={taskItem.taskId}
                    taskItem={taskItem}
                    state={state}
                    prerequisiteTitle={prevSeqTask?.task?.title || null}
                    onSelectTopic={onSelectTopic}
                    onToggleComplete={onToggleComplete}
                  />
                );
              })}
            </div>

            {/* Optional Phase Extras */}
            <div className="pt-2">
              <PhaseExtrasAccordion phase={phase} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LearningPathModule;
