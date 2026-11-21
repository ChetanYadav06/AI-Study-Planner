import React, { useState } from 'react';
import { Check, CheckCircle2, Circle } from 'lucide-react';
import { formatEnum } from '../../utils/formatters';
import { Button } from '../ui/Button';

export const DayHeader = ({
  dayNumber,
  totalDays,
  task,
  estimatedMinutes,
  isCompleted = false,
  onToggleCompleted,
  onRateTask,
  ratingRecorded = false
}) => {
  const [feedbackPromptVisible, setFeedbackPromptVisible] = useState(false);
  const [ratedRating, setRatedRating] = useState(null);

  if (!task) return null;

  const activity = formatEnum(task.activityType || 'Study');
  const summary = task.description || '';
  const concept = task.conceptExplanation || '';

  // Omit "The idea in short" if conceptExplanation is empty or identical to summary
  const shouldShowIdea = Boolean(
    concept &&
    concept.trim().toLowerCase() !== summary.trim().toLowerCase()
  );

  const handleToggle = () => {
    const nextCompleted = !isCompleted;
    onToggleCompleted();
    if (nextCompleted) {
      setFeedbackPromptVisible(true);
      setRatedRating(null);
    } else {
      setFeedbackPromptVisible(false);
      setRatedRating(null);
    }
  };

  const handleRate = async (rating) => {
    setRatedRating(rating);
    if (onRateTask) {
      await onRateTask(rating);
    }
    setTimeout(() => {
      setFeedbackPromptVisible(false);
    }, 2000);
  };

  return (
    <div className="space-y-4 pb-4 border-b border-line">
      {/* Meta Line */}
      <div className="text-[13px] text-muted font-medium">
        Day {dayNumber} of {totalDays} · {activity} · {estimatedMinutes} minutes
      </div>

      {/* Title and Completion Button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight flex-1">
          {task.title}
        </h2>

        <div className="shrink-0 flex items-center gap-2">
          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-page text-[13px] font-medium text-accent">
                <Check className="w-4 h-4 text-accent" />
                <span>Done</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggle}
                className="text-[13px] min-h-[40px] px-3 rounded-md"
                aria-label={`Undo completion for Day ${dayNumber}`}
              >
                Undo
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleToggle}
              className="gap-2 min-h-[40px] px-4 text-[13px] rounded-md"
              aria-label={`Mark Day ${dayNumber} done`}
            >
              <Circle className="w-4 h-4" />
              <span>Mark day done</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-[13px] text-muted leading-relaxed">
          {summary}
        </p>
      )}

      {/* The Idea in Short */}
      {shouldShowIdea && (
        <div className="p-3.5 rounded-lg border border-line bg-page space-y-1">
          <span className="text-[13px] font-semibold text-ink block">
            The idea in short
          </span>
          <p className="text-[13px] text-muted leading-relaxed">
            {concept}
          </p>
        </div>
      )}

      {/* Phase 5 Task Feedback Prompt */}
      {isCompleted && feedbackPromptVisible && (
        <div
          className="p-3 rounded-lg border border-line bg-page flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]"
          aria-live="polite"
        >
          {ratedRating ? (
            <span className="text-accent font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Feedback recorded ({ratedRating.toLowerCase()}). Thank you!
            </span>
          ) : (
            <>
              <span className="text-muted">How was this day?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRate('EASY')}
                  className="min-h-[40px] px-3 py-1.5 rounded-md border border-line bg-surface hover:border-slate-300 text-[13px] font-medium text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Easy
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('OK')}
                  className="min-h-[40px] px-3 py-1.5 rounded-md border border-line bg-surface hover:border-slate-300 text-[13px] font-medium text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => handleRate('HARD')}
                  className="min-h-[40px] px-3 py-1.5 rounded-md border border-line bg-surface hover:border-slate-300 text-[13px] font-medium text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Hard
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackPromptVisible(false)}
                  className="min-h-[40px] px-2 text-[13px] text-muted hover:text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-accent rounded"
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
