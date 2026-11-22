import React from 'react';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Code,
  BookOpen,
  HelpCircle,
  FolderGit2
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatEnum } from '../../utils/formatters';

export const TopicNodeCard = ({
  taskItem,
  state = 'available', // 'completed' | 'current' | 'available' | 'locked'
  prerequisiteTitle = null,
  onSelectTopic,
  onToggleComplete
}) => {
  const { task, dayNumber, estimatedMinutes } = taskItem;

  // Determine topic type category & icon
  const kind = (task.activityType || 'STUDY').toUpperCase();
  const isPractice = kind === 'PRACTICE' || kind === 'CODING_PRACTICE';
  const isProject = kind === 'PROJECT' || kind === 'MINI_PROJECT';
  const isAssessment = kind === 'QUIZ' || kind === 'ASSESSMENT' || kind === 'REVIEW';

  const typeConfig = isPractice
    ? { label: 'Practice', variant: 'accentSecondary', icon: Code }
    : isProject
    ? { label: 'Project', variant: 'warning', icon: FolderGit2 }
    : isAssessment
    ? { label: 'Assessment', variant: 'danger', icon: HelpCircle }
    : { label: 'Concept', variant: 'accent', icon: BookOpen };

  const TypeIcon = typeConfig.icon;

  // Visual card styles based on 4 distinct states
  const cardStyles = {
    completed: 'bg-surface-1 border-border hover:border-border-strong',
    current: 'bg-surface-2 border-accent ring-1 ring-accent',
    available: 'bg-surface-1 border-border hover:border-border-strong hover:bg-surface-2',
    locked: 'bg-surface-1/40 border-border opacity-50 cursor-not-allowed'
  }[state] || 'bg-surface-1 border-border';

  const isCurrent = state === 'current';
  const isCompleted = state === 'completed';
  const isLocked = state === 'locked';

  return (
    <div
      onClick={() => onSelectTopic(taskItem)}
      className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group select-none ${cardStyles}`}
    >
      {/* Top Meta Line: Day & Type Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-secondary border border-line text-muted">
            Day {dayNumber}
          </span>

          <Badge variant={typeConfig.variant} size="xs" icon={TypeIcon}>
            {typeConfig.label}
          </Badge>

          {isCurrent && (
            <Badge variant="glow" size="xs">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>Recommended Next</span>
            </Badge>
          )}
        </div>

        {/* Completion status checkbox / lock */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isLocked ? (
            <div className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-muted" title={`Locked. Complete ${prerequisiteTitle || 'prior topic'} first.`}>
              <Lock className="w-3.5 h-3.5" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onToggleComplete(taskItem.taskId, !isCompleted)}
              className="p-1 rounded-full text-muted hover:text-accent transition cursor-pointer"
              aria-label={isCompleted ? `Mark Day ${dayNumber} incomplete` : `Mark Day ${dayNumber} complete`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted group-hover:text-ink" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1">
        <h4 className={`text-[14px] font-semibold tracking-tight transition-colors ${
          isCompleted ? 'line-through text-muted' : isCurrent ? 'text-ink font-bold group-hover:text-accent' : 'text-ink group-hover:text-accent'
        }`}>
          {task.title}
        </h4>

        {task.description && (
          <p className="text-[12px] text-muted line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom Meta & Prerequisite Info */}
      <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-muted" />
            {estimatedMinutes || 30}m
          </span>
          <span>·</span>
          <span>{task.difficulty || 'Intermediate'}</span>
        </div>

        {isLocked && prerequisiteTitle ? (
          <span className="text-muted/80 truncate max-w-[140px] italic">
            Requires: {prerequisiteTitle}
          </span>
        ) : (
          <span className="text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            Details <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
};

export default TopicNodeCard;
