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

export const TopicNodeCard = ({
  taskItem,
  state = 'ready', // 'done' | 'up-next' | 'ready' | 'locked' (or aliases 'completed', 'current', 'available')
  prerequisiteTitle = null,
  onSelectTopic,
  onToggleComplete
}) => {
  const { task, dayNumber, estimatedMinutes } = taskItem;

  // Normalize state to one of the 4 canonical states
  const normalizedState = (() => {
    if (state === 'done' || state === 'completed') return 'done';
    if (state === 'up-next' || state === 'current') return 'up-next';
    if (state === 'locked') return 'locked';
    return 'ready';
  })();

  const isDone = normalizedState === 'done';
  const isUpNext = normalizedState === 'up-next';
  const isReady = normalizedState === 'ready';
  const isLocked = normalizedState === 'locked';

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

  // State-specific visual styling
  const cardClasses = (() => {
    if (isDone) {
      return 'bg-surface-1/90 border-border opacity-85 hover:border-border-strong cursor-pointer';
    }
    if (isUpNext) {
      return 'bg-surface-2 border-[var(--next)] ring-2 ring-[var(--next)]/40 shadow-sm cursor-pointer';
    }
    if (isReady) {
      return 'bg-surface-1 border-border hover:border-accent/60 hover:bg-surface-2 cursor-pointer';
    }
    // locked
    return 'bg-surface-1/40 border-border/60 opacity-55 cursor-not-allowed select-none';
  })();

  const handleCardClick = () => {
    if (isLocked) {
      // Locked topics CANNOT be opened
      return;
    }
    if (onSelectTopic) {
      onSelectTopic(taskItem);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 group ${cardClasses}`}
      title={isLocked ? `Complete ${prerequisiteTitle || 'prior topic'} to unlock` : undefined}
    >
      {/* Top Meta Line: Day & Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">
            Day {dayNumber}
          </span>

          <Badge variant={typeConfig.variant} size="xs" icon={TypeIcon}>
            {typeConfig.label}
          </Badge>

          {/* EXACTLY ONE OF FOUR STATE BADGES */}
          {isDone && (
            <Badge variant="success" size="xs" icon={CheckCircle2}>
              Done
            </Badge>
          )}

          {isUpNext && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--next)]/15 text-[var(--next)] border border-[var(--next)]/30">
              <Sparkles className="w-3 h-3" />
              <span>Up next</span>
            </span>
          )}

          {isReady && (
            <Badge variant="accent" size="xs">
              Ready
            </Badge>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-2 text-text-muted border border-border">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          )}
        </div>

        {/* Completion status checkbox / lock */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isLocked ? (
            <div
              className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted cursor-not-allowed"
              title={`Complete ${prerequisiteTitle || 'prior topic'} to unlock`}
            >
              <Lock className="w-3.5 h-3.5" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onToggleComplete(taskItem.taskId, !isDone)}
              className="p-1 rounded-full text-text-muted hover:text-accent transition cursor-pointer"
              aria-label={isDone ? `Mark Day ${dayNumber} incomplete` : `Mark Day ${dayNumber} complete`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-done" />
              ) : (
                <Circle className="w-5 h-5 text-text-muted group-hover:text-text" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1">
        <h4 className={`text-[14px] font-semibold tracking-tight transition-colors ${
          isDone
            ? 'line-through text-text-muted'
            : isUpNext
            ? 'text-text font-bold group-hover:text-accent'
            : isReady
            ? 'text-text group-hover:text-accent'
            : 'text-text-muted'
        }`}>
          {task.title}
        </h4>

        {task.description && (
          <p className="text-[12px] text-text-muted line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom Meta & Prerequisite Info */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-muted">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-text-muted" />
            {estimatedMinutes || 30}m
          </span>
          <span>·</span>
          <span>{task.difficulty || 'Intermediate'}</span>
        </div>

        {isLocked ? (
          <span className="text-text-muted truncate max-w-[170px] italic" title={`Complete ${prerequisiteTitle || 'prior topic'} to unlock`}>
            Complete {prerequisiteTitle ? `"${prerequisiteTitle}"` : 'prior topic'} to unlock
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
