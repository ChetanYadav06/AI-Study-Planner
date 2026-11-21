import React from 'react';
import { Sparkles, Code, HelpCircle } from 'lucide-react';
import { computeTimeRanges } from '../../utils/dayPlanHelpers';
import { formatEnum } from '../../utils/formatters';
import { TopicCard } from './TopicCard';
import { Button } from '../ui/Button';

export const DayTimeline = ({
  blocks = [],
  totalMinutes = 0,
  topics = [],
  extraTopics = [],
  practiceTasks = [],
  quizQuestion = null,
  expansions = {},
  loadingExpansion = null,
  suggestingExtra = false,
  onExpandTopic,
  onDeleteExpansion,
  onSuggestExtraTopics,
  onDeleteExtraTopic,
  topicTicks = {},
  onToggleTopicTick,
  onMarkDayDone,
  isDayDone = false,
  canMutate = true,
  topicError = null
}) => {
  const timedBlocks = computeTimeRanges(blocks);
  const allDayTopics = [...topics, ...extraTopics];
  const hasTopics = allDayTopics.length > 0;

  // Compute ticked topic count
  const tickedCount = allDayTopics.filter((t) => {
    const key = (typeof t === 'string' ? t : t?.title || '').trim().toLowerCase();
    return Boolean(topicTicks[key]);
  }).length;
  const allTopicsTicked = hasTopics && tickedCount === allDayTopics.length;

  return (
    <div className="space-y-4">
      {/* Timeline Section Header */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">
          Your {totalMinutes} minutes
        </h3>
        <p className="text-[13px] text-muted">
          A suggested split. Tick a topic when you finish it.
        </p>
      </div>

      {/* Structured Time Blocks */}
      <div className="space-y-4 pt-1">
        {timedBlocks.map((block, idx) => {
          const kind = (block.kind || 'STUDY').toUpperCase();
          const isLearn = kind === 'STUDY' || kind === 'LEARN';
          const isPractice = kind === 'PRACTICE' || kind === 'CODING_PRACTICE' || kind === 'PROJECT';
          const isQuiz = kind === 'QUIZ' || kind === 'ASSESSMENT' || kind === 'REVIEW';

          return (
            <div
              key={block.id || idx}
              className="flex flex-col md:flex-row md:items-start gap-3 md:gap-5 p-3.5 sm:p-4 rounded-lg border border-line bg-surface"
            >
              {/* Time Column (computed range: 0 to 12 minutes) */}
              <div className="md:w-32 shrink-0 flex md:flex-col items-baseline md:items-start justify-between gap-1 pb-2 md:pb-0 border-b md:border-b-0 border-line">
                <span className="text-sm font-semibold text-accent font-mono">
                  {block.timeRangeLabel}
                </span>
                <span className="text-[13px] text-muted font-medium">
                  minutes ({block.minutes}m)
                </span>
              </div>

              {/* Content Slot by Block Kind */}
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">
                    {formatEnum(block.kind)}
                  </span>
                  {block.title && (
                    <span className="text-[13px] text-muted truncate">
                      · {block.title}
                    </span>
                  )}
                </div>

                {/* 1. Learn-type Block: Topic Cards */}
                {isLearn && (
                  <div className="space-y-3 pt-1">
                    {hasTopics ? (
                      <>
                        {/* Topic Ticks Progress (Sub-step 9C) */}
                        <div className="flex items-center justify-between text-[13px] text-muted font-medium">
                          <span>{tickedCount} of {allDayTopics.length} topics done</span>
                        </div>

                        {/* Main Curriculum Topics */}
                        <div className="space-y-2.5">
                          {topics.map((top, tIdx) => {
                            const topTitle = typeof top === 'string' ? top : top?.title || '';
                            const topicKey = topTitle.trim().toLowerCase();
                            const isTicked = Boolean(topicTicks[topicKey]);

                            return (
                              <TopicCard
                                key={top.id || tIdx}
                                topic={top}
                                isExtra={false}
                                expansions={expansions}
                                loadingExpansion={loadingExpansion}
                                onExpandTopic={onExpandTopic}
                                onDeleteExpansion={onDeleteExpansion}
                                isTicked={isTicked}
                                onToggleTick={() => onToggleTopicTick && onToggleTopicTick(topicKey)}
                                canMutate={canMutate}
                                error={topicError}
                              />
                            );
                          })}

                          {/* Extra Optional Topics */}
                          {extraTopics.map((extra) => {
                            const extraTitle = extra.title || '';
                            const topicKey = extraTitle.trim().toLowerCase();
                            const isTicked = Boolean(topicTicks[topicKey]);

                            return (
                              <TopicCard
                                key={extra.id}
                                topic={extra}
                                isExtra={true}
                                extraId={extra.id}
                                expansions={expansions}
                                loadingExpansion={loadingExpansion}
                                onExpandTopic={onExpandTopic}
                                onDeleteExpansion={onDeleteExpansion}
                                onDeleteExtraTopic={onDeleteExtraTopic}
                                isTicked={isTicked}
                                onToggleTick={() => onToggleTopicTick && onToggleTopicTick(topicKey)}
                                canMutate={canMutate}
                                error={topicError}
                              />
                            );
                          })}
                        </div>

                        {/* All Topics Done Prompt (Sub-step 9C) */}
                        {allTopicsTicked && !isDayDone && (
                          <div
                            className="p-3 rounded-md bg-page border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]"
                            aria-live="polite"
                          >
                            <span className="text-ink font-medium">
                              All topics done. Mark the day done?
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={onMarkDayDone}
                              className="text-[13px] min-h-[40px] px-3 self-start sm:self-auto rounded-md"
                              aria-label="Mark day done now"
                            >
                              Mark day done
                            </Button>
                          </div>
                        )}

                        {/* Suggest More Topics Button */}
                        {canMutate && onSuggestExtraTopics && (
                          <div className="pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={onSuggestExtraTopics}
                              disabled={suggestingExtra}
                              className="text-[13px] min-h-[40px] px-3 gap-1.5 rounded-md"
                              aria-label="Suggest more topics for this day"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-accent" />
                              <span>{suggestingExtra ? 'Suggesting...' : 'Suggest more topics'}</span>
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[13px] text-muted">
                        No specific subtopics specified for this study block.
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Practice-type Block: Hands-on Practice Tasks */}
                {isPractice && (
                  <div className="space-y-2 pt-1">
                    {practiceTasks && practiceTasks.length > 0 ? (
                      practiceTasks.map((pt, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-3 rounded-md border border-line bg-page text-[13px] text-ink flex items-start gap-2.5"
                        >
                          <Code className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            {typeof pt === 'string' ? pt : pt.title || pt.description}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[13px] text-muted leading-relaxed">
                        {block.description || 'Hands-on practice exercises and implementation drills.'}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Check/Quiz-type Block: Quiz Question (Question only, no answer button) */}
                {isQuiz && (
                  <div className="space-y-2 pt-1">
                    {quizQuestion ? (
                      <div className="p-3.5 rounded-md border border-line bg-page space-y-2 text-[13px]">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <p className="font-medium text-ink leading-relaxed">
                            {typeof quizQuestion === 'string' ? quizQuestion : quizQuestion.question}
                          </p>
                        </div>

                        {quizQuestion.options && Array.isArray(quizQuestion.options) && (
                          <div className="space-y-1.5 pl-6 pt-1">
                            {quizQuestion.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="p-2 rounded border border-line bg-surface text-[13px] text-muted flex items-center gap-2"
                              >
                                <span className="font-semibold text-ink">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted leading-relaxed">
                        {block.description || 'Review the core ideas learned today and test your understanding.'}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Any Other Kind (Generic fallback, never crashes) */}
                {!isLearn && !isPractice && !isQuiz && (
                  <div className="p-3 rounded-md border border-line bg-page text-[13px] text-muted">
                    {block.description || 'Scheduled learning activity.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
