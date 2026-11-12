import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Layers
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SafeMarkdown } from './SafeMarkdown';

export const TopicList = ({
  topics = [],
  extraTopics = [],
  dayNumber,
  onExpandTopic,
  onDeleteExpansion,
  onSuggestExtraTopics,
  onDeleteExtraTopic,
  expansions = {},
  loadingExpansion = null,
  suggestingExtra = false,
  canMutate = true
}) => {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (topicTitle, level) => {
    const key = `${topicTitle}_lvl_${level}`;
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSectionOpen = (topicTitle, level) => {
    const key = `${topicTitle}_lvl_${level}`;
    // If not set, open by default when expansion exists
    return openSections[key] !== undefined ? openSections[key] : true;
  };

  return (
    <div className="space-y-5">
      {/* Header and Suggest Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-line">
        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-accent" />
          <span>Curriculum Topics</span>
        </h4>

        {canMutate && onSuggestExtraTopics && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSuggestExtraTopics}
            disabled={suggestingExtra}
            className="text-[13px] h-8 px-2.5 gap-1.5 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>{suggestingExtra ? 'Suggesting...' : 'Suggest Extra Topics'}</span>
          </Button>
        )}
      </div>

      {/* Base Topics */}
      <div className="space-y-3">
        {topics.map((topic, idx) => {
          const title = typeof topic === 'string' ? topic : topic.title;
          const summary = typeof topic === 'string' ? '' : topic.summary;
          const topicExp = expansions[title] || {};
          const hasL1 = Boolean(topicExp[1]);
          const hasL2 = Boolean(topicExp[2]);
          const isExpandingL1 = loadingExpansion === `${title}_1`;
          const isExpandingL2 = loadingExpansion === `${title}_2`;

          return (
            <div
              key={idx}
              className="p-4 rounded-md border border-line bg-surface space-y-3 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-semibold text-ink">
                      {title}
                    </span>
                  </div>
                  {summary && (
                    <p className="text-[13px] text-muted leading-relaxed pl-4">
                      {summary}
                    </p>
                  )}
                </div>

                {canMutate && onExpandTopic && (
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                    {!hasL1 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onExpandTopic(title, 1)}
                        disabled={isExpandingL1}
                        className="text-[13px] h-8 px-2.5 gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-accent" />
                        <span>{isExpandingL1 ? 'Expanding...' : 'Deep Dive (L1)'}</span>
                      </Button>
                    ) : (
                      !hasL2 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onExpandTopic(title, 2)}
                          disabled={isExpandingL2}
                          className="text-[13px] h-8 px-2.5 gap-1"
                        >
                          <Layers className="w-3.5 h-3.5 text-accent" />
                          <span>{isExpandingL2 ? 'Expanding...' : 'Advanced (L2)'}</span>
                        </Button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Render Level 1 Expansion if present */}
              {hasL1 && (
                <div className="pt-2 border-t border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleSection(title, 1)}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:text-accent-hover cursor-pointer"
                    >
                      {isSectionOpen(title, 1) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>Level 1: Deep Dive</span>
                    </button>

                    {canMutate && onDeleteExpansion && (
                      <button
                        type="button"
                        onClick={() => onDeleteExpansion(title, 1)}
                        className="p-1 text-muted hover:text-danger rounded cursor-pointer"
                        aria-label={`Delete Level 1 expansion for ${title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isSectionOpen(title, 1) && (
                    <div className="p-3.5 rounded-md border border-line bg-page text-ink text-[13px]">
                      <SafeMarkdown content={topicExp[1]} />
                    </div>
                  )}
                </div>
              )}

              {/* Render Level 2 Expansion if present */}
              {hasL2 && (
                <div className="pt-2 border-t border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleSection(title, 2)}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:text-accent-hover cursor-pointer"
                    >
                      {isSectionOpen(title, 2) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>Level 2: Advanced & Edge Cases</span>
                    </button>

                    {canMutate && onDeleteExpansion && (
                      <button
                        type="button"
                        onClick={() => onDeleteExpansion(title, 2)}
                        className="p-1 text-muted hover:text-danger rounded cursor-pointer"
                        aria-label={`Delete Level 2 expansion for ${title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isSectionOpen(title, 2) && (
                    <div className="p-3.5 rounded-md border border-line bg-page text-ink text-[13px]">
                      <SafeMarkdown content={topicExp[2]} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Extra Topics Section */}
      {extraTopics && extraTopics.length > 0 && (
        <div className="pt-3 border-t border-line space-y-3">
          <h5 className="text-[13px] font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Extra Suggested Topics ({extraTopics.length})</span>
          </h5>

          <div className="space-y-2.5">
            {extraTopics.map((extra) => (
              <div
                key={extra.id}
                className="p-3.5 rounded-md border border-line bg-surface flex items-start justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border border-line bg-page text-muted uppercase">
                      Elective
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {extra.title}
                    </span>
                  </div>
                  {extra.summary && (
                    <p className="text-[13px] text-muted leading-relaxed pl-1">
                      {extra.summary}
                    </p>
                  )}
                </div>

                {canMutate && onDeleteExtraTopic && (
                  <button
                    type="button"
                    onClick={() => onDeleteExtraTopic(extra.id)}
                    className="p-1 text-muted hover:text-danger rounded cursor-pointer shrink-0"
                    aria-label={`Delete extra topic ${extra.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
