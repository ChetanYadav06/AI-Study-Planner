import React from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '../ui/Button';

export const DayFooter = ({
  isCurrentDayDone = false,
  nextTaskItem = null,
  isEntireRoadmapCompleted = false,
  onMarkDayDone,
  onGoToNextDay
}) => {
  return (
    <div className="pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Up Next Text / All Days Done */}
      <div className="flex-1 min-w-0">
        {isEntireRoadmapCompleted ? (
          <div className="flex items-center gap-2 text-accent font-semibold text-[13px]">
            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
            <span>All days done</span>
          </div>
        ) : nextTaskItem ? (
          <div className="space-y-0.5 truncate">
            <span className="text-[13px] font-medium text-muted block">
              Up next
            </span>
            <p className="text-[13px] font-medium text-ink truncate">
              Day {nextTaskItem.task.dayNumber} · {nextTaskItem.task.title}
            </p>
          </div>
        ) : (
          <div className="text-[13px] text-muted font-medium">
            Final day of this roadmap
          </div>
        )}
      </div>

      {/* Completion or Navigation Button */}
      <div className="shrink-0 flex items-center gap-2">
        {!isCurrentDayDone ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onMarkDayDone}
            className="gap-2 min-h-[40px] px-4 text-[13px] rounded-md w-full sm:w-auto"
            aria-label="Mark current day done"
          >
            <Circle className="w-4 h-4" />
            <span>Mark day done</span>
          </Button>
        ) : (
          nextTaskItem && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onGoToNextDay}
              className="gap-2 min-h-[40px] px-4 text-[13px] rounded-md w-full sm:w-auto"
              aria-label={`Go to Day ${nextTaskItem.task.dayNumber}`}
            >
              <span>Go to next day</span>
              <ArrowRight className="w-4 h-4 text-muted" />
            </Button>
          )
        )}
      </div>
    </div>
  );
};
