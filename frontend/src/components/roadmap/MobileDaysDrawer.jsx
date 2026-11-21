import React, { useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { PhaseDayList } from './PhaseDayList';

export const MobileDaysDrawer = ({
  isOpen = false,
  onClose,
  phases = [],
  selectedPhaseIndex = 0,
  selectedDayNumber = 1,
  onSelectPhase,
  onSelectDay,
  completedTasks = {},
  nextUnfinishedDayNumber = null
}) => {
  const closeButtonRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex lg:hidden bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="All days curriculum list"
    >
      <div className="bg-surface w-full max-w-xs h-full flex flex-col border-r border-line shadow-none">
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-line flex items-center justify-between bg-page">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Calendar className="w-4 h-4 text-accent" />
            <span>All days</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-ink rounded-md focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
            aria-label="Close all days panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <PhaseDayList
            phases={phases}
            selectedPhaseIndex={selectedPhaseIndex}
            selectedDayNumber={selectedDayNumber}
            onSelectPhase={(pIdx, firstDay) => {
              onSelectPhase(pIdx, firstDay);
              onClose();
            }}
            onSelectDay={(dayNum) => {
              onSelectDay(dayNum);
              onClose();
            }}
            completedTasks={completedTasks}
            nextUnfinishedDayNumber={nextUnfinishedDayNumber}
          />
        </div>
      </div>

      {/* Backdrop click to dismiss */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />
    </div>
  );
};
