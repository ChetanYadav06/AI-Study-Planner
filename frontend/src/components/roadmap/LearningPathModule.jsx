import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
  Code,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { TopicNodeCard } from './TopicNodeCard';
import { PhaseExtrasAccordion } from './PhaseExtrasAccordion';
import { formatEnum } from '../../utils/formatters';

export const LearningPathModule = ({
  phase,
  phaseIndex,
  tasks = [],
  completedTasks = {},
  currentRecommendedTaskId = null,
  onSelectTopic,
  onToggleComplete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isModuleComplete = totalTasks > 0 && completedCount === totalTasks;

  return (
    <Card className="overflow-hidden border border-line bg-surface/60 space-y-0">
      {/* ── MODULE HEADER ── */}
      <div className="p-5 sm:p-6 bg-surface-secondary/70 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" size="xs">
              MODULE {phaseIndex + 1}
            </Badge>

            {isModuleComplete ? (
              <Badge variant="success" size="xs" icon={CheckCircle2}>
                Module Completed
              </Badge>
            ) : (
              <span className="text-xs text-muted font-mono font-medium">
                {completedCount} of {totalTasks} topics completed
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
            {phase.phaseTitle || phase.phase || `Phase ${phaseIndex + 1}`}
          </h3>

          {phase.description && (
            <p className="text-[13px] text-muted leading-relaxed max-w-3xl">
              {phase.description}
            </p>
          )}
        </div>

        {/* Module Progress Metric */}
        <div className="sm:w-48 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">Progress</span>
            <span className="text-accent font-mono font-semibold">{progressPct}%</span>
          </div>
          <ProgressBar value={progressPct} height="h-1.5" />
        </div>
      </div>

      {/* ── TOPICS LEARNING SEQUENCE ── */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Learning Sequence & Dependencies
          </span>
          <span className="text-[11px] text-muted">
            Click any topic to explore concepts, drills & AI tutoring
          </span>
        </div>

        {/* Responsive Connected Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((taskItem, idx) => {
            const isCompleted = Boolean(completedTasks[taskItem.taskId]);
            const isCurrent = taskItem.taskId === currentRecommendedTaskId;

            // Compute prerequisite: previous task in sequence
            const prevTaskItem = idx > 0 ? tasks[idx - 1] : null;
            const isPrereqCompleted = !prevTaskItem || Boolean(completedTasks[prevTaskItem.taskId]);

            let state = 'available';
            if (isCompleted) {
              state = 'completed';
            } else if (isCurrent) {
              state = 'current';
            } else if (!isPrereqCompleted) {
              state = 'locked';
            }

            return (
              <TopicNodeCard
                key={taskItem.taskId}
                taskItem={taskItem}
                state={state}
                prerequisiteTitle={prevTaskItem?.task?.title || null}
                onSelectTopic={onSelectTopic}
                onToggleComplete={onToggleComplete}
              />
            );
          })}
        </div>

        {/* Optional Phase Extras (assessment, practical exercises, resources) */}
        <div className="pt-2">
          <PhaseExtrasAccordion phase={phase} />
        </div>
      </div>
    </Card>
  );
};

export default LearningPathModule;
