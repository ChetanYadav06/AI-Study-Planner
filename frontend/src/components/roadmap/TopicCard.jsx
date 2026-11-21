import React, { useState } from 'react';
import { BookOpen, Layers, X, ChevronUp, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { isPlaceholderSummary } from '../../utils/dayPlanHelpers';
import { Button } from '../ui/Button';
import { SafeMarkdown } from './SafeMarkdown';

export const TopicCard = ({
  topic,
  isExtra = false,
  extraId = null,
  expansions = {},
  loadingExpansion = null,
  onExpandTopic,
  onDeleteExpansion,
  onDeleteExtraTopic,
  isTicked = false,
  onToggleTick,
  canMutate = true,
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState(1);

  const title = typeof topic === 'string' ? topic : topic?.title || '';
  const rawSummary = typeof topic === 'string' ? '' : topic?.summary || '';
  const minutes = typeof topic === 'object' && topic?.minutes != null ? topic.minutes : null;

  const showSummary = !isPlaceholderSummary(rawSummary, title);

  const topicExp = expansions[title] || {};
  const hasL1 = Boolean(topicExp[1]);
  const hasL2 = Boolean(topicExp[2]);

  const isExpandingL1 = loadingExpansion === `${title}_1`;
  const isExpandingL2 = loadingExpansion === `${title}_2`;

  const handleExplain = async () => {
    if (!hasL1 && onExpandTopic) {
      await onExpandTopic(title, 1);
      setIsOpen(true);
      setActiveLevel(1);
    } else {
      setIsOpen(true);
    }
  };

  const handleGoDeeper = async () => {
    if (!hasL2 && onExpandTopic) {
      await onExpandTopic(title, 2);
    }
    setActiveLevel(2);
    setIsOpen(true);
  };

  const currentMarkdown = topicExp[activeLevel] || topicExp[1] || '';

  return (
    <div
      className={`p-3.5 rounded-lg border transition-colors ${
        isTicked ? 'bg-page/70 border-line' : 'bg-surface border-line'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Checkbox and Topic Details */}
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Topic Checkbox Slot (Wired in 9C) */}
          <button
            type="button"
            onClick={onToggleTick}
            className="shrink-0 p-1 mt-0.5 text-muted hover:text-accent rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={`Mark topic "${title}" ${isTicked ? 'incomplete' : 'complete'}`}
          >
            {isTicked ? (
              <CheckCircle2 className="w-4 h-4 text-accent" />
            ) : (
              <Circle className="w-4 h-4 text-muted" />
            )}
          </button>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[13px] font-semibold text-ink ${
                  isTicked ? 'line-through text-muted' : ''
                }`}
              >
                {title}
              </span>

              {minutes != null && (
                <span className="text-[12px] font-medium px-2 py-0.5 rounded border border-line bg-page text-muted">
                  {minutes} min
                </span>
              )}

              {isExtra && (
                <span className="text-[11px] font-medium px-1.5 py-0.2 rounded border border-line bg-page text-accent">
                  Optional
                </span>
              )}
            </div>

            {showSummary && (
              <p className={`text-[13px] text-muted leading-relaxed ${isTicked ? 'text-muted/70' : ''}`}>
                {rawSummary}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          {isExtra && onDeleteExtraTopic && extraId != null && (
            <button
              type="button"
              onClick={() => onDeleteExtraTopic(extraId)}
              className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-muted hover:text-danger rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`Remove optional topic ${title}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {!hasL1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExplain}
              disabled={isExpandingL1}
              className="text-[13px] min-h-[40px] px-3 gap-1.5 rounded-md"
              aria-expanded={false}
              aria-label={`Explain topic: ${title}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>{isExpandingL1 ? 'Explaining...' : 'Explain this topic'}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="text-[13px] min-h-[40px] px-3 gap-1 rounded-md"
                aria-expanded={isOpen}
                aria-controls={`topic-expansion-${title.replace(/\s+/g, '-')}`}
                aria-label={isOpen ? `Hide details for ${title}` : `Show details for ${title}`}
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-muted" />
                    <span>Hide details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                    <span>View details</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error state if expansion fails */}
      {error && (
        <div className="mt-2 text-[13px] text-danger" aria-live="polite">
          {error}
        </div>
      )}

      {/* Expanded Details Section */}
      {hasL1 && isOpen && (
        <div
          id={`topic-expansion-${title.replace(/\s+/g, '-')}`}
          className="mt-3 pt-3 border-t border-line space-y-3"
          aria-live="polite"
        >
          {/* Level Switcher (Level 1 / Level 2) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-page p-1 rounded-md border border-line text-[13px]">
              <button
                type="button"
                onClick={() => setActiveLevel(1)}
                className={`px-2.5 py-1 rounded text-[13px] font-medium transition cursor-pointer min-h-[32px] ${
                  activeLevel === 1
                    ? 'bg-surface text-ink border border-line'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Core concepts
              </button>
              {hasL2 && (
                <button
                  type="button"
                  onClick={() => setActiveLevel(2)}
                  className={`px-2.5 py-1 rounded text-[13px] font-medium transition cursor-pointer min-h-[32px] ${
                    activeLevel === 2
                      ? 'bg-surface text-ink border border-line'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Advanced details
                </button>
              )}
            </div>

            {!hasL2 && canMutate && onExpandTopic && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGoDeeper}
                disabled={isExpandingL2}
                className="text-[13px] min-h-[36px] px-2.5 gap-1 rounded-md"
                aria-label={`Go deeper into ${title}`}
              >
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>{isExpandingL2 ? 'Exploring...' : 'Go deeper'}</span>
              </Button>
            )}
          </div>

          {/* Render Safe Markdown for Topic Expansion */}
          <div className="p-3.5 rounded-md border border-line bg-page text-[13px] text-ink leading-relaxed">
            <SafeMarkdown content={currentMarkdown} />
          </div>
        </div>
      )}
    </div>
  );
};
