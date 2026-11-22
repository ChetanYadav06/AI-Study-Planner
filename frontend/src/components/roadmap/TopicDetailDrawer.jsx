import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Clock,
  BookOpen,
  Code,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Layers,
  Lock,
  Check
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SafeMarkdown } from './SafeMarkdown';
import { formatEnum } from '../../utils/formatters';
import { useRouter } from '../../context/RouterContext';

export const TopicDetailDrawer = ({
  isOpen = false,
  onClose,
  taskItem,
  isCompleted = false,
  prerequisiteItem = null,
  nextItem = null,
  prevItem = null,
  onToggleComplete,
  onSelectTopic,
  roadmapId = null,
  onExpandTopic,
  expansions = {},
  loadingExpansion = null
}) => {
  const { navigate } = useRouter();
  const [activeExpLevel, setActiveExpLevel] = useState(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !taskItem) return null;

  const { task, dayNumber, phaseTitle, phaseIdx, estimatedMinutes } = taskItem;

  const taskTitle = task.title || 'Topic Details';
  const explanation = task.conceptExplanation || task.description || '';
  const objectives = task.learningObjectives || [];
  const practiceTasks = task.practiceTasks || [];
  const quiz = task.quizQuestion || null;
  const isPrereqDone = !prerequisiteItem || prerequisiteItem.isDone;

  const topicExp = expansions[taskTitle] || {};
  const hasL1 = Boolean(topicExp[1]);
  const hasL2 = Boolean(topicExp[2]);
  const isExpandingL1 = loadingExpansion === `${taskTitle}_1`;
  const isExpandingL2 = loadingExpansion === `${taskTitle}_2`;
  const currentMarkdown = topicExp[activeExpLevel] || topicExp[1] || '';

  const handleAskAi = () => {
    navigate(`#/ai-assistant?topic=${encodeURIComponent(taskTitle)}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full sm:w-[520px] md:w-[600px] h-full bg-surface-1 border-l border-border flex flex-col z-10 select-none">
        {/* ── DRAWER HEADER ── */}
        <div className="p-5 sm:p-6 border-b border-line bg-surface-secondary/70 flex items-center justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">
              Phase {phaseIdx + 1}: {phaseTitle} · Day {dayNumber}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-ink truncate">
              {taskTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── DRAWER BODY (SCROLLABLE) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-ink">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" size="sm">
              {formatEnum(task.activityType || 'Concept')}
            </Badge>
            <Badge variant="neutral" size="sm">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span>{estimatedMinutes || 30} mins</span>
            </Badge>
            <Badge variant="accentSecondary" size="sm">
              {task.difficulty || 'Intermediate'}
            </Badge>
            {isCompleted ? (
              <Badge variant="success" size="sm" icon={CheckCircle2}>
                Completed
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Incomplete
              </Badge>
            )}
          </div>

          {/* Why This Topic Matters (Key Context) */}
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/25 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Why This Topic Matters</span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              {task.conceptExplanation ||
                task.description ||
                `Mastering ${taskTitle} establishes critical foundations for this module and prepares you for upcoming advanced engineering drills.`}
            </p>
          </div>

          {/* Prerequisites Section */}
          {prerequisiteItem && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Prerequisites & Sequence
              </span>
              <div className="p-3 rounded-lg border border-line bg-surface-secondary/50 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {isPrereqDone ? (
                    <Check className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-warning shrink-0" />
                  )}
                  <span className="font-medium text-ink truncate">
                    {prerequisiteItem.task?.title}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold shrink-0 ${isPrereqDone ? 'text-success' : 'text-warning'}`}>
                  {isPrereqDone ? 'Completed' : 'Recommended Prior'}
                </span>
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {objectives.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                What You Will Learn
              </span>
              <ul className="space-y-2 pl-4 list-disc text-[13px] text-muted">
                {objectives.map((obj, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="text-ink">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concept Foundation & Deep Dive */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Concept Foundation
              </span>

              {!hasL1 && onExpandTopic && (
                <button
                  type="button"
                  onClick={() => onExpandTopic(taskTitle, 1)}
                  disabled={isExpandingL1}
                  className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isExpandingL1 ? 'Generating deep dive...' : 'Generate AI Deep Dive'}</span>
                </button>
              )}
            </div>

            {hasL1 ? (
              <div className="p-4 rounded-xl border border-line bg-surface-secondary/40 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveExpLevel(1)}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        activeExpLevel === 1 ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Core Concepts
                    </button>
                    {hasL2 && (
                      <button
                        type="button"
                        onClick={() => setActiveExpLevel(2)}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          activeExpLevel === 2 ? 'bg-surface text-ink border border-line' : 'text-muted hover:text-ink'
                        }`}
                      >
                        Advanced Details
                      </button>
                    )}
                  </div>

                  {!hasL2 && onExpandTopic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExpandTopic(taskTitle, 2)}
                      disabled={isExpandingL2}
                      className="text-xs text-accent"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isExpandingL2 ? 'Exploring...' : 'Go deeper (L2)'}</span>
                    </Button>
                  )}
                </div>

                <div className="text-[13px] text-ink leading-relaxed">
                  <SafeMarkdown content={currentMarkdown} />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-line bg-surface-secondary/30 text-[13px] text-muted leading-relaxed">
                {explanation || 'Read through the curriculum specifications above to prepare for practice drills.'}
              </div>
            )}
          </div>

          {/* Hands-on Practice Tasks */}
          {practiceTasks.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-accent" /> Practice Problems & Implementation
              </span>
              <div className="space-y-2">
                {practiceTasks.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-line bg-surface-secondary/40 text-[13px] text-ink flex items-start gap-2.5"
                  >
                    <Code className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {typeof pt === 'string' ? pt : pt.title || pt.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Question / Self Check */}
          {quiz && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-accent" /> Knowledge Check Drill
              </span>
              <div className="p-4 rounded-xl border border-line bg-surface-secondary/50 space-y-3 text-[13px]">
                <p className="font-semibold text-ink leading-relaxed">
                  {typeof quiz === 'string' ? quiz : quiz.question}
                </p>
                {quiz.options && Array.isArray(quiz.options) && (
                  <div className="space-y-1.5 pt-1">
                    {quiz.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-2.5 rounded-lg border border-line bg-surface text-muted text-xs flex items-center gap-2"
                      >
                        <span className="font-bold text-ink">{String.fromCharCode(65 + oIdx)}.</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── DRAWER FOOTER: COMPLETION & PREV/NEXT NAVIGATION ── */}
        <div className="p-4 sm:p-5 border-t border-line bg-surface-secondary/80 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="md"
              onClick={() => onToggleComplete(taskItem.taskId, !isCompleted)}
              className="flex-1 gap-2"
            >
              {isCompleted ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <span>Completed (Click to Undo)</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleAskAi}
              className="gap-1.5"
              title="Discuss this topic with your AI Tutor"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Ask AI Tutor</span>
            </Button>
          </div>

          {/* Prev / Next Topic Navigation */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60 text-xs text-muted">
            {prevItem ? (
              <button
                type="button"
                onClick={() => onSelectTopic(prevItem)}
                className="flex items-center gap-1.5 hover:text-ink truncate max-w-[45%] transition cursor-pointer"
                title={`Previous: ${prevItem.task.title}`}
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Prev: {prevItem.task.title}</span>
              </button>
            ) : <div />}

            {nextItem ? (
              !isCompleted ? (
                <div
                  className="flex items-center gap-1.5 text-text-muted/60 truncate max-w-[45%] text-right ml-auto cursor-not-allowed select-none"
                  title={`Complete current topic first to unlock: ${nextItem.task.title}`}
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                  <span className="truncate">Next: {nextItem.task.title}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectTopic(nextItem)}
                  className="flex items-center gap-1.5 hover:text-text truncate max-w-[45%] transition cursor-pointer text-right ml-auto"
                  title={`Next: ${nextItem.task.title}`}
                >
                  <span className="truncate">Next: {nextItem.task.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetailDrawer;
