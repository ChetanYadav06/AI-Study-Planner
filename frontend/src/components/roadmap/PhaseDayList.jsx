import React from 'react';
import { formatEnum } from '../../utils/formatters';

export const PhaseDayList = ({
  phases = [],
  selectedPhaseIndex = 0,
  selectedDayNumber = 1,
  onSelectPhase,
  onSelectDay,
  completedTasks = {},
  nextUnfinishedDayNumber = null
}) => {
  const currentPhase = phases[selectedPhaseIndex] || phases[0];
  const currentTasks = currentPhase?.tasks || [];

  return (
    <nav
      className="rounded-lg border border-line bg-surface overflow-hidden sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col"
      aria-label="Roadmap curriculum schedule"
    >
      <div className="p-3 bg-page border-b border-line">
        <h2 className="text-[13px] font-semibold text-ink">
          Days in phase
        </h2>
        <span className="text-[13px] text-muted truncate block">
          {currentPhase?.cleanTitle}
        </span>
      </div>

      <div className="overflow-y-auto divide-y divide-line flex-1">
        {/* Days in Selected Phase */}
        {currentTasks.map((item) => {
          const dayNum = item.task.dayNumber;
          const isSelected = dayNum === selectedDayNumber;
          const isDone = Boolean(completedTasks[item.id]);
          const isUpNext = !isDone && dayNum === nextUnfinishedDayNumber;

          // State text: Done · Day N / Up next · Day N / Day N · Activity
          let stateLabel = `Day ${dayNum} · ${formatEnum(item.task.activityType || 'Study')}`;
          if (isDone) {
            stateLabel = `Done · Day ${dayNum}`;
          } else if (isUpNext) {
            stateLabel = `Up next · Day ${dayNum}`;
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDay(dayNum)}
              aria-current={isSelected ? 'page' : undefined}
              className={`w-full text-left p-3 min-h-[44px] transition-colors cursor-pointer flex flex-col justify-center focus-visible:outline-2 focus-visible:outline-accent ${
                isSelected
                  ? 'bg-page border-l-4 border-l-accent text-ink font-medium'
                  : 'hover:bg-page/60 text-muted hover:text-ink'
              }`}
            >
              <span
                className={`text-[13px] font-semibold block ${
                  isUpNext ? 'text-accent' : isDone ? 'text-muted' : 'text-ink'
                }`}
              >
                {stateLabel}
              </span>
              <span
                className={`text-[13px] leading-snug line-clamp-2 block ${
                  isDone ? 'line-through text-muted' : 'text-ink'
                }`}
              >
                {item.task.title}
              </span>
            </button>
          );
        })}

        {/* Other Phases as One-line Rows */}
        {phases
          .filter((p) => p.phaseIndex !== selectedPhaseIndex)
          .map((phase) => (
            <button
              key={phase.phaseIndex}
              type="button"
              onClick={() => onSelectPhase(phase.phaseIndex, phase.firstUnfinishedDay)}
              className="w-full text-left px-3 py-3 min-h-[44px] bg-page/40 hover:bg-page transition-colors cursor-pointer flex items-center justify-between gap-2 border-t border-line focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`Select ${phase.cleanTitle}, ${phase.completedDays} of ${phase.totalDays} done`}
            >
              <span className="text-[13px] font-medium text-ink truncate">
                {phase.cleanTitle}
              </span>
              <span className="text-[13px] text-muted shrink-0 font-medium">
                {phase.completedDays} of {phase.totalDays}
              </span>
            </button>
          ))}
      </div>
    </nav>
  );
};
