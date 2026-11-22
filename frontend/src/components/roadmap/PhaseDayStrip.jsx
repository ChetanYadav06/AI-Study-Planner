import React, { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export const PhaseDayStrip = ({
  phases = [],
  selectedPhaseIndex = 0,
  selectedDayNumber = 1,
  onSelectPhase,
  onSelectDay,
  completedTasks = {},
  progressPercent = 0,
  completedCount = 0,
  totalCount = 0
}) => {
  const chipsContainerRef = useRef(null);

  const selectedPhase = phases[selectedPhaseIndex] || phases[0];
  const selectedPhaseTasks = selectedPhase?.tasks || [];

  // Roving focus with ArrowLeft / ArrowRight between day chips
  const handleChipKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % selectedPhaseTasks.length;
      const nextTask = selectedPhaseTasks[nextIndex];
      if (nextTask) {
        onSelectDay(nextTask.task.dayNumber);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + selectedPhaseTasks.length) % selectedPhaseTasks.length;
      const prevTask = selectedPhaseTasks[prevIndex];
      if (prevTask) {
        onSelectDay(prevTask.task.dayNumber);
      }
    }
  };

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      {/* Overall Progress Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2 font-medium text-ink shrink-0">
          <span>{completedCount} of {totalCount} days done</span>
        </div>

        <div className="flex-1 max-w-xl w-full">
          <ProgressBar
            value={progressPercent}
            ariaLabel="Curriculum progress bar"
          />
        </div>

        <div className="font-semibold text-accent shrink-0 text-right">
          {progressPercent}%
        </div>
      </div>

      {/* Phase Tabs with Horizontal Scroll */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none"
        role="tablist"
        aria-label="Curriculum phases"
      >
        {phases.map((phase) => {
          const isSelected = phase.phaseIndex === selectedPhaseIndex;

          return (
            <button
              key={phase.phaseIndex}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectPhase(phase.phaseIndex, phase.firstUnfinishedDay)}
              className={`flex flex-col items-start p-2.5 rounded-lg border text-left shrink-0 transition-colors cursor-pointer min-w-[150px] sm:min-w-[180px] max-w-[240px] min-h-[44px] focus-visible:outline-2 focus-visible:outline-accent ${
                isSelected
                  ? 'bg-page border-accent text-ink ring-1 ring-accent/30'
                  : 'bg-surface border-line text-muted hover:text-ink hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-semibold text-[13px] truncate text-ink">
                  {phase.cleanTitle}
                </span>
                <span className="text-[13px] text-muted shrink-0">
                  {phase.completedDays}/{phase.totalDays}
                </span>
              </div>

              {/* Mini Segmented Progress Bar */}
              <div
                className="flex items-center gap-0.5 w-full mt-2 h-1.5 rounded-full overflow-hidden bg-slate-100"
                aria-hidden="true"
              >
                {phase.tasks.map((item, dIdx) => {
                  const isDone = Boolean(completedTasks[item.id]);
                  return (
                    <div
                      key={dIdx}
                      className={`flex-1 h-full transition-colors ${
                        isDone ? 'bg-accent' : 'bg-slate-200'
                      }`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Days of the Selected Phase */}
      <div className="space-y-2 pt-1 border-t border-line">
        <span className="text-[13px] font-medium text-muted block">
          Days of the selected phase:
        </span>

        <div
          ref={chipsContainerRef}
          className="flex items-center gap-2 flex-wrap"
          role="group"
          aria-label={`Days of ${selectedPhase?.cleanTitle || 'current phase'}`}
        >
          {selectedPhaseTasks.map((item, idx) => {
            const dayNum = item.task.dayNumber;
            const isSelected = dayNum === selectedDayNumber;
            const isDone = Boolean(completedTasks[item.id]);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectDay(dayNum)}
                onKeyDown={(e) => handleChipKeyDown(e, idx)}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={`Day ${dayNum}: ${item.task.title}${isDone ? ', completed' : ''}`}
                className={`relative inline-flex items-center justify-center min-w-[40px] min-h-[40px] px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : isDone
                      ? 'bg-page border-line text-ink hover:border-slate-300'
                      : 'bg-surface border-line text-ink hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  {dayNum}
                  {isDone && !isSelected && (
                    <Check className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  )}
                  {isDone && isSelected && (
                    <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
