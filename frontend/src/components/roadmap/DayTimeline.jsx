import React from 'react';
import { Clock, CheckCircle2, Circle } from 'lucide-react';

const KIND_LABELS = {
  WARMUP: 'Warm-up',
  LEARN: 'Concept Study',
  PRACTICE: 'Hands-on Practice',
  REVIEW: 'Review & Quiz',
  ASSESSMENT: 'Assessment',
  BREAK: 'Rest Break'
};

const KIND_COLORS = {
  WARMUP: 'bg-page text-muted border-line',
  LEARN: 'bg-accent-soft text-accent border-line',
  PRACTICE: 'bg-accent-soft text-accent border-line',
  REVIEW: 'bg-page text-ink border-line',
  ASSESSMENT: 'bg-page text-accent border-line',
  BREAK: 'bg-page text-muted border-line'
};

export const DayTimeline = ({
  blocks = [],
  totalMinutes = 0,
  loading = false,
  completedBlocks = {},
  onToggleBlock
}) => {
  if (loading) {
    return (
      <div className="p-6 rounded-md border border-line bg-page text-center space-y-2">
        <Clock className="w-5 h-5 text-accent animate-spin mx-auto" />
        <p className="text-[13px] text-muted">Loading schedule time blocks...</p>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="p-4 rounded-md border border-line bg-page text-muted text-sm">
        No schedule blocks available for this day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
          Structured Time Plan
        </h4>
        <div className="flex items-center gap-1.5 text-[13px] text-muted font-medium">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>{totalMinutes} mins total</span>
        </div>
      </div>

      <div className="relative pl-6 space-y-3 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-line">
        {blocks.map((block, idx) => {
          const isDone = !!completedBlocks[idx];
          const kindLabel = KIND_LABELS[block.kind] || block.kind;
          const badgeClass = KIND_COLORS[block.kind] || 'bg-page text-ink border-line';

          return (
            <div
              key={idx}
              className={`relative p-3.5 rounded-md border transition-colors duration-150 ${
                isDone
                  ? 'bg-page/60 border-line text-muted'
                  : 'bg-surface border-line text-ink'
              }`}
            >
              {/* Timeline marker / checkbox */}
              <button
                type="button"
                onClick={() => onToggleBlock && onToggleBlock(idx)}
                className="absolute -left-[27px] top-4 p-0.5 rounded-full bg-surface text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
                aria-label={`Mark ${kindLabel} block ${isDone ? 'incomplete' : 'complete'}`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                ) : (
                  <Circle className="w-4 h-4 text-muted hover:text-accent" />
                )}
              </button>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[13px] font-medium border ${badgeClass}`}>
                      {kindLabel}
                    </span>
                    <span className="text-[13px] text-muted font-medium">
                      {block.minutes} min
                    </span>
                  </div>
                  {block.description && (
                    <p className={`text-[13px] leading-relaxed ${isDone ? 'line-through text-muted' : 'text-muted'}`}>
                      {block.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
