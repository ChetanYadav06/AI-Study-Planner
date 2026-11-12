import React from 'react';
import { BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';

export const TopicList = ({
  topics = [],
  dayNumber,
  onExpandTopic,
  expansions = {},
  loadingExpansion = null
}) => {
  if (!topics || topics.length === 0) {
    return (
      <div className="p-4 rounded-md border border-line bg-page text-muted text-sm">
        No specific topics listed for this day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
          Key Topics ({topics.length})
        </h4>
      </div>

      <div className="space-y-2.5">
        {topics.map((topic, idx) => {
          const title = typeof topic === 'string' ? topic : topic.title;
          const summary = typeof topic === 'string' ? '' : topic.summary;
          const topicExpansions = expansions[title] || {};
          const isExpanding = loadingExpansion === title;

          return (
            <div
              key={idx}
              className="p-3.5 rounded-md border border-line bg-surface space-y-2 transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-medium text-ink">
                      {title}
                    </span>
                  </div>
                  {summary && (
                    <p className="text-[13px] text-muted leading-relaxed pl-3.5">
                      {summary}
                    </p>
                  )}
                </div>

                {onExpandTopic && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onExpandTopic(title, topicExpansions[1] ? 2 : 1)}
                    disabled={isExpanding}
                    className="shrink-0 text-[13px] h-8 px-2.5 gap-1.5"
                    aria-label={`Expand topic ${title}`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    <span>{isExpanding ? 'Expanding...' : (topicExpansions[1] ? 'Level 2' : 'Expand')}</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
