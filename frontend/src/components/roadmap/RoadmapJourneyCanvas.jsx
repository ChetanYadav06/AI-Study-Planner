import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  CheckCircle2,
  Lock,
  Sparkles,
  Clock,
  BookOpen,
  ArrowRight,
  Compass,
  Check
} from 'lucide-react';
import { useRouter } from '../../context/RouterContext';

export const RoadmapJourneyCanvas = ({
  modules = [],
  allSequentialTasks = [],
  completedTasks = {},
  currentRecommendedTaskId = null,
  roadmapId = null,
  roadmapTitle = 'Curriculum',
  onSelectDay
}) => {
  const { navigate } = useRouter();

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Phase layout coordinates calculation
  // We arrange phases horizontally or in a snake/grid layout on the canvas
  const phaseLayouts = useMemo(() => {
    let currentX = 80;
    const PHASE_GAP = 90;
    const CARD_WIDTH = 260;
    const CARD_GAP = 40;

    return modules.map((mod, pIdx) => {
      const taskCount = mod.tasks.length;
      const phaseWidth = Math.max(340, taskCount * (CARD_WIDTH + CARD_GAP) + 60);
      const startX = currentX;
      currentX += phaseWidth + PHASE_GAP;

      // Layout each day node along this phase
      const positionedTasks = mod.tasks.map((taskItem, tIdx) => {
        const x = startX + 40 + tIdx * (CARD_WIDTH + CARD_GAP);
        // Alternate slightly up/down for a dynamic organic subway/roadmap.sh curve feel
        const yOffset = (tIdx % 2 === 0 ? 0 : 36);
        const y = 140 + yOffset;

        return {
          ...taskItem,
          coord: { x, y }
        };
      });

      return {
        ...mod,
        startX,
        phaseWidth,
        positionedTasks
      };
    });
  }, [modules]);

  // Flattened list of positioned tasks for easy connector generation
  const allPositionedTasks = useMemo(() => {
    const list = [];
    phaseLayouts.forEach((p) => {
      p.positionedTasks.forEach((t) => list.push(t));
    });
    return list;
  }, [phaseLayouts]);

  // Center on active or current day
  const handleCenterOnActiveDay = () => {
    if (allPositionedTasks.length === 0) return;
    const target = allPositionedTasks.find((t) => t.taskId === currentRecommendedTaskId) || allPositionedTasks[0];
    if (target && canvasRef.current) {
      const containerWidth = canvasRef.current.clientWidth || 900;
      const containerHeight = canvasRef.current.clientHeight || 500;
      setZoom(1);
      setPan({
        x: containerWidth / 2 - target.coord.x - 130,
        y: containerHeight / 2 - target.coord.y - 70
      });
    }
  };

  // Reset to initial view
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(1.4, Math.round((prev + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, Math.round((prev - 0.15) * 100) / 100));

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(1.4, Math.max(0.6, Math.round((prev + delta) * 100) / 100)));
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e) => {
    // Only drag with left click and not on a button/card
    if (e.button !== 0) return;
    if (e.target.closest('button, a, [data-interactive="true"]')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Center view on active day on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterOnActiveDay();
    }, 200);
    return () => clearTimeout(timer);
  }, [currentRecommendedTaskId]);

  const handleDayClick = (taskItem) => {
    if (onSelectDay) {
      onSelectDay(taskItem);
    } else if (roadmapId && taskItem.dayNumber) {
      navigate(`#/roadmaps/${roadmapId}/day/${taskItem.dayNumber}`);
    }
  };

  // Phase color accents for subway lines
  const phaseColors = [
    { border: 'border-accent', bg: 'bg-accent/10', stroke: '#7C83FF', label: 'bg-accent' },
    { border: 'border-info', bg: 'bg-info/10', stroke: '#60A5FA', label: 'bg-info' },
    { border: 'border-next', bg: 'bg-next/10', stroke: '#FBBF24', label: 'bg-next' },
    { border: 'border-done', bg: 'bg-done/10', stroke: '#4ADE9A', label: 'bg-done' },
    { border: 'border-purple-400', bg: 'bg-purple-500/10', stroke: '#A78BFA', label: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-4">
      {/* ── DESKTOP & TABLET: INTERACTIVE ROADMAP CANVAS ── */}
      <div className="hidden sm:block relative rounded-2xl bg-surface-1 border border-border overflow-hidden shadow-lg select-none">
        {/* Canvas Toolbar Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-2/95 backdrop-blur-md border border-border shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-1 flex items-center justify-center transition cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-1 flex items-center justify-center transition cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button
            type="button"
            onClick={handleCenterOnActiveDay}
            className="px-2.5 h-8 rounded-lg text-xs font-medium text-accent hover:bg-accent/15 flex items-center gap-1.5 transition cursor-pointer"
            title="Center on Up Next Day"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Active Day</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-1 flex items-center justify-center transition cursor-pointer"
            title="Reset Fit View"
            aria-label="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-1 border border-border">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Canvas Legend & Helper */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-4 px-3.5 py-2 rounded-xl bg-surface-2/95 backdrop-blur-md border border-border text-xs text-text-muted shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-done shadow-[0_0_8px_rgba(74,222,154,0.5)]" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(124,131,255,0.6)]" />
            <span>Currently Learning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-text-muted/60" />
            <span>Locked</span>
          </div>
          <span className="text-[11px] text-text-muted/70 pl-2 border-l border-border">
            Drag to pan · Scroll to zoom
          </span>
        </div>

        {/* Viewport Canvas Container */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full h-[520px] lg:h-[580px] overflow-hidden relative cursor-grab active:cursor-grabbing ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
            backgroundSize: '28px 28px'
          }}
        >
          {/* Transform Layer */}
          <div
            className="absolute origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* SVG Subway Track Layer */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: `${Math.max(2800, allPositionedTasks.length * 300 + 400)}px`,
                height: '600px'
              }}
            >
              <defs>
                <linearGradient id="trackGradientDone" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4ADE9A" />
                  <stop offset="100%" stopColor="#4ADE9A" />
                </linearGradient>
                <linearGradient id="trackGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4ADE9A" />
                  <stop offset="100%" stopColor="#7C83FF" />
                </linearGradient>
              </defs>

              {/* Connecting Paths Between Sequential Days */}
              {allPositionedTasks.map((taskItem, idx) => {
                if (idx === allPositionedTasks.length - 1) return null;
                const nextItem = allPositionedTasks[idx + 1];

                const startX = taskItem.coord.x + 260; // Right side of current card
                const startY = taskItem.coord.y + 60; // Center Y of card
                const endX = nextItem.coord.x; // Left side of next card
                const endY = nextItem.coord.y + 60;

                const isStartDone = Boolean(completedTasks[taskItem.taskId]);
                const isNextDone = Boolean(completedTasks[nextItem.taskId]);
                const isNextActive = nextItem.taskId === currentRecommendedTaskId;

                let strokeColor = 'var(--border)';
                let strokeWidth = 3;
                let strokeDasharray = 'none';

                if (isStartDone && isNextDone) {
                  strokeColor = '#4ADE9A';
                  strokeWidth = 3.5;
                } else if (isStartDone && isNextActive) {
                  strokeColor = '#7C83FF';
                  strokeWidth = 3.5;
                  strokeDasharray = '4 3';
                }

                // Smooth cubic bezier connector
                const controlX1 = startX + (endX - startX) * 0.5;
                const controlX2 = startX + (endX - startX) * 0.5;
                const pathData = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${endY}, ${endX} ${endY}`;

                return (
                  <path
                    key={`track-${idx}`}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Phases Stations & Cards */}
            {phaseLayouts.map((phaseGroup, pIdx) => {
              const theme = phaseColors[pIdx % phaseColors.length];
              const phaseTotal = phaseGroup.tasks.length;
              const phaseCompleted = phaseGroup.tasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
              const isPhaseDone = phaseTotal > 0 && phaseCompleted === phaseTotal;

              return (
                <div
                  key={`phase-station-${pIdx}`}
                  className="absolute top-8"
                  style={{ left: `${phaseGroup.startX}px`, width: `${phaseGroup.phaseWidth}px` }}
                >
                  {/* Phase Station Header Banner */}
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2/90 border border-border shadow-xs backdrop-blur-sm mb-4 inline-flex">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.label}`} />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                        Phase {pIdx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-text truncate max-w-xs">
                        {phaseGroup.phase.phaseTitle || phaseGroup.phase.phase || `Phase ${pIdx + 1}`}
                      </h4>
                    </div>
                    <div className="ml-4 pl-3 border-l border-border flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-text-muted">
                        {phaseCompleted}/{phaseTotal} Days
                      </span>
                      {isPhaseDone && (
                        <span className="p-1 rounded-full bg-done/20 text-done">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Nodes */}
                  {phaseGroup.positionedTasks.map((taskItem) => {
                    const isDone = Boolean(completedTasks[taskItem.taskId]);
                    const isActive = taskItem.taskId === currentRecommendedTaskId;
                    const prevDone =
                      taskItem.sequenceIndex === 0 ||
                      Boolean(completedTasks[allSequentialTasks[taskItem.sequenceIndex - 1]?.taskId]);
                    const isLocked = !isDone && !prevDone;

                    return (
                      <div
                        key={taskItem.taskId}
                        data-interactive="true"
                        onClick={() => !isLocked && handleDayClick(taskItem)}
                        className={`absolute w-[260px] p-4 rounded-xl transition-all duration-200 select-none ${
                          isDone
                            ? 'bg-surface-2 border border-done/40 shadow-xs hover:border-done cursor-pointer'
                            : isActive
                            ? 'bg-surface-2 border-2 border-accent shadow-[0_0_24px_rgba(124,131,255,0.25)] hover:scale-[1.02] cursor-pointer'
                            : isLocked
                            ? 'bg-surface-1/60 border border-border/50 opacity-60 cursor-not-allowed'
                            : 'bg-surface-2 border border-border hover:border-border-strong hover:scale-[1.01] cursor-pointer'
                        }`}
                        style={{
                          left: `${taskItem.coord.x - phaseGroup.startX}px`,
                          top: `${taskItem.coord.y}px`
                        }}
                      >
                        {/* Card Header: Day Badge & Status Indicator */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isDone
                                ? 'bg-done/15 text-done'
                                : isActive
                                ? 'bg-accent-solid text-white shadow-xs'
                                : 'bg-surface-1 text-text-muted border border-border'
                            }`}
                          >
                            Day {taskItem.dayNumber}
                          </span>

                          {isDone ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-done">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          ) : isActive ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-accent animate-pulse">
                              <Sparkles className="w-3.5 h-3.5" /> Up Next
                            </span>
                          ) : isLocked ? (
                            <span className="flex items-center gap-1 text-[11px] text-text-muted/60">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted font-medium">Ready</span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h5 className="text-[13px] font-bold text-text line-clamp-2 leading-snug mb-1.5">
                          {taskItem.task.title}
                        </h5>

                        {taskItem.task.topics && Array.isArray(taskItem.task.topics) && taskItem.task.topics.length > 0 && (
                          <p className="text-[11px] text-text-muted line-clamp-1 mb-2">
                            {taskItem.task.topics.length} topics: {taskItem.task.topics.map(t => typeof t === 'string' ? t : t.title).slice(0, 2).join(', ')}...
                          </p>
                        )}

                        {/* Footer: Duration & CTA */}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-text-muted flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {taskItem.estimatedMinutes || 60}m
                          </span>

                          {!isLocked && (
                            <span className="text-accent hover:underline flex items-center gap-0.5 font-medium text-[11px]">
                              Study <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW: VERTICAL SUBWAY ROADMAP (OPTIMIZED FOR TOUCH) ── */}
      <div className="sm:hidden space-y-6">
        {modules.map((mod, pIdx) => {
          const phaseTotal = mod.tasks.length;
          const phaseCompleted = mod.tasks.filter((t) => Boolean(completedTasks[t.taskId])).length;
          const isPhaseDone = phaseTotal > 0 && phaseCompleted === phaseTotal;

          return (
            <div key={`mobile-phase-${pIdx}`} className="space-y-3">
              {/* Phase Header */}
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                    Phase {pIdx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-text">
                    {mod.phase.phaseTitle || mod.phase.phase || `Phase ${pIdx + 1}`}
                  </h4>
                </div>
                <span className="text-xs font-mono font-medium text-text-muted">
                  {phaseCompleted}/{phaseTotal} Days
                </span>
              </div>

              {/* Vertical Connected Track */}
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                {mod.tasks.map((taskItem) => {
                  const isDone = Boolean(completedTasks[taskItem.taskId]);
                  const isActive = taskItem.taskId === currentRecommendedTaskId;
                  const prevDone =
                    taskItem.sequenceIndex === 0 ||
                    Boolean(completedTasks[allSequentialTasks[taskItem.sequenceIndex - 1]?.taskId]);
                  const isLocked = !isDone && !prevDone;

                  return (
                    <div
                      key={`mob-${taskItem.taskId}`}
                      onClick={() => !isLocked && handleDayClick(taskItem)}
                      className={`relative p-3.5 rounded-xl transition border select-none ${
                        isDone
                          ? 'bg-surface-2 border-done/40 cursor-pointer'
                          : isActive
                          ? 'bg-surface-2 border-2 border-accent shadow-md cursor-pointer'
                          : isLocked
                          ? 'bg-surface-1 border-border/50 opacity-60 cursor-not-allowed'
                          : 'bg-surface-2 border-border cursor-pointer'
                      }`}
                    >
                      {/* Node circle on vertical line */}
                      <span
                        className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                          isDone
                            ? 'bg-done border-surface-1'
                            : isActive
                            ? 'bg-accent border-surface-1 animate-pulse'
                            : 'bg-surface-2 border-border-strong'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                            isDone ? 'bg-done/15 text-done' : isActive ? 'bg-accent-solid text-white' : 'bg-surface-1 text-text-muted'
                          }`}
                        >
                          Day {taskItem.dayNumber}
                        </span>
                        {isDone ? (
                          <span className="text-[11px] font-semibold text-done flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : isActive ? (
                          <span className="text-[11px] font-bold text-accent flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Up Next
                          </span>
                        ) : isLocked ? (
                          <span className="text-[11px] text-text-muted flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-muted">Ready</span>
                        )}
                      </div>

                      <h5 className="text-[13px] font-bold text-text mb-1">
                        {taskItem.task.title}
                      </h5>

                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border">
                        <span>{taskItem.estimatedMinutes || 60} mins</span>
                        {!isLocked && (
                          <span className="text-accent font-medium flex items-center gap-0.5">
                            Open Day <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapJourneyCanvas;
