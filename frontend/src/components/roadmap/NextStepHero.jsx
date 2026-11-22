import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Check,
  Circle,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  Rocket,
  Compass
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatEnum } from '../../utils/formatters';

export const NextStepHero = ({
  task,
  taskItem = null,
  phaseTitle = '',
  phaseIndex = 0,
  isCompleted = false,
  prerequisiteTask = null,
  isPrerequisiteMet = true,
  dailyPaceHours = 2,
  upcomingTasks = [],
  isZeroProgress = false,
  onStartLearning,
  onToggleCompleted,
  onAskAi
}) => {
  if (!task) return null;

  const activityType = formatEnum(task.activityType || 'Concept');
  const estimatedMins = task.estimatedMinutes || 30;
  const estimatedHours = Math.round((estimatedMins / 60) * 10) / 10;
  const pace = dailyPaceHours > 0 ? dailyPaceHours : 2;
  const daysAtPace = Math.max(0.1, Math.round((estimatedMins / (60 * pace)) * 10) / 10);

  // 1-2 sentences on why this topic matters
  const whyItMatters = (() => {
    if (task.whyItMatters) return task.whyItMatters;
    if (task.learningObjectives && task.learningObjectives.length > 0) {
      return `Key goal: ${task.learningObjectives[0]}. Builds direct prerequisite mastery for subsequent topics.`;
    }
    if (task.conceptExplanation) {
      const firstSentence = task.conceptExplanation.split('. ')[0];
      return `${firstSentence}. Essential foundation for this phase.`;
    }
    if (task.description) return task.description;
    return 'Master the core mechanics, practical patterns, and fundamental concepts required for this study journey.';
  })();

  return (
    <Card className="p-5 sm:p-6 bg-surface-2 border-2 border-[var(--next)]/40 ring-1 ring-[var(--next)]/20 space-y-5">
      {/* ── TOP HEADER: "DO THIS NEXT" BADGE & PACING ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--next)]/20 text-[var(--next)] border border-[var(--next)]/40 shadow-xs">
            {isZeroProgress ? <Rocket className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isZeroProgress ? 'START YOUR ROADMAP' : 'DO THIS NEXT'}</span>
          </span>
          <span className="text-xs text-text-muted font-medium">
            {isZeroProgress ? 'Kickstart Day 1 of your adaptive learning journey' : 'Top recommended topic calibrated to your progress'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Badge variant="accent" size="sm">
            Phase {phaseIndex + 1}: {phaseTitle} · Day {task.dayNumber || 1}
          </Badge>
          <Badge variant="neutral" size="sm">
            <Clock className="w-3 h-3 text-text-muted" />
            <span>{estimatedMins} min ({estimatedHours}h · {daysAtPace}d at {pace}h/d)</span>
          </Badge>
          <Badge variant="accentSecondary" size="sm">
            {activityType}
          </Badge>
        </div>
      </div>

      {/* ── TOPIC TITLE & WHY IT MATTERS ── */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
          {task.title}
          {isCompleted && (
            <CheckCircle2 className="w-5 h-5 text-done inline-block" />
          )}
        </h2>

        <div className="p-3 rounded-xl bg-surface-1/80 border border-border space-y-1">
          <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
            Why It Matters
          </span>
          <p className="text-[13px] text-text-2 leading-relaxed">
            {whyItMatters}
          </p>
        </div>
      </div>

      {/* Prerequisite status notice if applicable */}
      {prerequisiteTask && !isPrerequisiteMet && (
        <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 p-2.5 rounded-lg border border-warning/20">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Note: You have not completed prerequisite "{prerequisiteTask.title}" yet.</span>
        </div>
      )}

      {/* ── UPCOMING IN SEQUENCE HORIZON (NEXT 1-2 TOPICS) ── */}
      {upcomingTasks && upcomingTasks.length > 0 && (
        <div className="pt-2 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>Upcoming in sequence:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {upcomingTasks.slice(0, 2).map((nextItem, idx) => (
              <div
                key={nextItem.taskId || idx}
                className="p-2.5 rounded-lg bg-surface-1 border border-border flex items-center justify-between text-xs text-text-muted"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-text shrink-0">
                    Day {nextItem.dayNumber}:
                  </span>
                  <span className="text-text font-medium truncate">
                    {nextItem.task?.title}
                  </span>
                </div>
                <span className="font-mono text-[11px] shrink-0 text-text-muted ml-2">
                  {nextItem.estimatedMinutes || 30}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIMARY ACTIONS ROW ── */}
      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleCompleted}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-surface-1 hover:bg-surface-2 text-[13px] font-medium text-text transition cursor-pointer min-h-[44px]"
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted ? (
              <Check className="w-4 h-4 text-done" />
            ) : (
              <Circle className="w-4 h-4 text-text-muted" />
            )}
            <span>{isCompleted ? 'Done' : 'Mark as Done'}</span>
          </button>

          {onAskAi && (
            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-accent/40 bg-surface-1 text-[13px] font-medium text-text-muted hover:text-accent transition cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Ask AI Tutor</span>
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onStartLearning}
          className="gap-2 font-semibold min-h-[44px]"
        >
          {isZeroProgress ? (
            <>
              <span>Start roadmap</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : isCompleted ? (
            <>
              <span>Review Topic</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Open Topic Details</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default NextStepHero;
