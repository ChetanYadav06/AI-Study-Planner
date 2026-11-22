import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Check,
  Circle,
  Clock,
  Compass,
  CheckCircle2,
  Lock,
  BookOpen
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatEnum } from '../../utils/formatters';

export const NextStepHero = ({
  task,
  phaseTitle,
  phaseIndex = 0,
  isCompleted = false,
  prerequisiteTask = null,
  isPrerequisiteMet = true,
  onStartLearning,
  onToggleCompleted,
  onAskAi
}) => {
  if (!task) return null;

  const activityType = formatEnum(task.activityType || 'Concept');
  const estimatedMins = task.estimatedMinutes || 30;

  return (
    <Card
      highlight
      className="p-5 sm:p-6 bg-gradient-to-br from-surface via-surface to-surface-secondary space-y-4 border-accent/40 shadow-lg shadow-accent/5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="glow" size="sm">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>YOUR NEXT STEP</span>
          </Badge>
          <span className="text-xs text-muted font-medium">
            Calibrated to your current study sequence
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="accent" size="sm">
            Phase {phaseIndex + 1}: {phaseTitle} · Day {task.dayNumber}
          </Badge>
          <Badge variant="neutral" size="sm">
            <Clock className="w-3 h-3 text-muted" />
            <span>{estimatedMins} min</span>
          </Badge>
          <Badge variant="accentSecondary" size="sm">
            {activityType}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight flex items-center gap-2">
          {task.title}
          {isCompleted && (
            <CheckCircle2 className="w-5 h-5 text-success inline-block" />
          )}
        </h2>
        <p className="text-[13px] text-muted leading-relaxed max-w-4xl">
          {task.description ||
            task.conceptExplanation ||
            'Master core concepts and complete structured practical exercises for this topic.'}
        </p>
      </div>

      {/* Prerequisite status notice */}
      {prerequisiteTask && (
        <div className="flex items-center gap-2 text-xs text-muted pt-1">
          {isPrerequisiteMet ? (
            <span className="text-success flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" /> Prerequisite fulfilled: {prerequisiteTask.title}
            </span>
          ) : (
            <span className="text-warning flex items-center gap-1 font-medium">
              <Lock className="w-3.5 h-3.5" /> Recommended to finish {prerequisiteTask.title} first
            </span>
          )}
        </div>
      )}

      {/* Action Row */}
      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleCompleted}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-secondary text-[13px] font-medium text-ink transition cursor-pointer min-h-[40px]"
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Circle className="w-4 h-4 text-muted" />
            )}
            <span>{isCompleted ? 'Completed' : 'Mark as Done'}</span>
          </button>

          {onAskAi && (
            <button
              type="button"
              onClick={onAskAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line hover:border-accent/40 bg-surface text-[13px] font-medium text-muted hover:text-accent transition cursor-pointer min-h-[40px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Ask AI Tutor</span>
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onStartLearning}
          className="gap-2 shadow-md shadow-accent/25"
        >
          <span>{isCompleted ? 'Review Topic' : 'Start Learning'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default NextStepHero;
