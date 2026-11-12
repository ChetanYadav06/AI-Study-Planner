import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock } from 'lucide-react';

export const PhaseList = ({
  phases = [],
  tasksByPhase = {},
  selectedDayNumber,
  onSelectDay,
  completedTasks = {},
  onToggleTask
}) => {
  // By default, open all phases or the phase containing selectedDayNumber
  const [collapsedPhases, setCollapsedPhases] = useState({});

  const togglePhaseCollapse = (pIdx) => {
    setCollapsedPhases(prev => ({
      ...prev,
      [pIdx]: !prev[pIdx]
    }));
  };

  return (
    <div className="space-y-3" role="navigation" aria-label="Roadmap Curriculum Days">
      {phases.map((phase, pIdx) => {
        const phaseTasks = tasksByPhase[pIdx] || [];
        const isCollapsed = !!collapsedPhases[pIdx];
        const completedInPhase = phaseTasks.filter(item => completedTasks[item.id]).length;
        const totalInPhase = phaseTasks.length;
        const phaseDone = totalInPhase > 0 && completedInPhase === totalInPhase;

        return (
          <div
            key={pIdx}
            className="rounded-md border border-line bg-surface overflow-hidden"
          >
            {/* Collapsible Phase Header */}
            <button
              type="button"
              onClick={() => togglePhaseCollapse(pIdx)}
              className="w-full flex items-center justify-between p-3.5 bg-page/70 hover:bg-page transition-colors text-left cursor-pointer border-b border-line"
              aria-expanded={!isCollapsed}
            >
              <div className="space-y-0.5 truncate pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Phase {pIdx + 1}
                  </span>
                  {phaseDone && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium bg-accent-soft text-accent">
                      Complete
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-ink truncate">
                  {phase.phaseTitle || phase.phase || `Phase ${pIdx + 1}`}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-muted">
                <span className="text-[13px] font-medium">
                  {completedInPhase}/{totalInPhase}
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Days in Phase */}
            {!isCollapsed && (
              <div className="divide-y divide-line" role="list">
                {phaseTasks.map((item) => {
                  const dayNum = item.task.dayNumber;
                  const isSelected = dayNum === selectedDayNumber;
                  const isDone = !!completedTasks[item.id];

                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => onSelectDay(dayNum)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectDay(dayNum);
                        }
                      }}
                      className={`flex items-center justify-between p-3 transition-colors cursor-pointer outline-none focus-visible:bg-page ${
                        isSelected
                          ? 'bg-accent-soft/80 border-l-4 border-l-accent'
                          : 'hover:bg-page/50'
                      }`}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <div className="flex items-center gap-2.5 truncate mr-2">
                        {/* Task toggle button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(item.id);
                          }}
                          className="shrink-0 p-1 text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent rounded cursor-pointer"
                          aria-label={`Mark Day ${dayNum} ${isDone ? 'incomplete' : 'complete'}`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted" />
                          )}
                        </button>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-accent">
                              D{dayNum}
                            </span>
                            <span className={`text-[13px] font-medium truncate ${isDone ? 'line-through text-muted' : 'text-ink'}`}>
                              {item.task.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted">
                        <span className="px-1.5 py-0.5 rounded border border-line bg-page text-[11px] font-medium uppercase">
                          {item.task.activityType || 'Study'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
