import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  BookOpen,
  Code,
  HelpCircle,
  ExternalLink,
  Target
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TopicList } from './TopicList';
import { DayTimeline } from './DayTimeline';

export const DayDetail = ({
  dayNumber,
  totalDays,
  taskItem,
  isCompleted = false,
  onToggleCompleted,
  dayPlan = null,
  loadingPlan = false,
  completedBlocks = {},
  onToggleBlock,
  onExpandTopic,
  onDeleteExpansion,
  onSuggestExtraTopics,
  onDeleteExtraTopic,
  topicExpansions = {},
  extraTopics = [],
  loadingExpansion = null,
  suggestingExtra = false,
  canMutate = true,
  phase = null
}) => {
  if (!taskItem) {
    return (
      <Card className="p-8 text-center text-muted">
        Select a day from the pathway to view its structured learning plan.
      </Card>
    );
  }

  const { task } = taskItem;
  const estimatedMinutes = task.estimatedMinutes || (dayPlan?.dailyMinutes) || 60;
  const activityType = task.activityType || dayPlan?.activityType || 'LEARNING';
  const topics = dayPlan?.topics && dayPlan.topics.length > 0
    ? dayPlan.topics
    : (task.topics && task.topics.length > 0
        ? task.topics
        : (task.subtopics || []).map(st => ({ title: typeof st === 'string' ? st : st.title, summary: typeof st === 'string' ? '' : st.summary })));

  const blocks = dayPlan?.blocks || [];

  return (
    <div className="space-y-6">
      {/* Day Header Card */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-line">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-[13px] text-muted">
              <span className="font-semibold text-accent uppercase tracking-wide">
                Day {dayNumber} of {totalDays}
              </span>
              <span>•</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded border border-line bg-page font-medium text-ink">
                {activityType}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-ink">
                <Clock className="w-3.5 h-3.5 text-muted" />
                {estimatedMinutes} mins
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              {task.title}
            </h2>

            {task.description && (
              <p className="text-sm text-muted leading-relaxed max-w-2xl">
                {task.description}
              </p>
            )}
          </div>

          <div className="shrink-0 self-start sm:self-center">
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              onClick={onToggleCompleted}
              className="gap-2"
              aria-label={isCompleted ? `Mark Day ${dayNumber} incomplete` : `Mark Day ${dayNumber} complete`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Mark Day Done</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Concept Explanation */}
        {task.conceptExplanation && (
          <div className="p-4 rounded-md border border-line bg-page space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Concept Foundation</span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              {task.conceptExplanation}
            </p>
          </div>
        )}

        {/* Learning Objectives */}
        {task.learningObjectives && task.learningObjectives.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-1.5">
              <Target className="w-4 h-4 text-accent" />
              <span>Learning Objectives</span>
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.learningObjectives.map((obj, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded border border-line bg-page text-[13px] text-ink leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Topics & Expansions Card */}
      <Card className="p-5 sm:p-6">
        <TopicList
          topics={topics}
          extraTopics={extraTopics}
          dayNumber={dayNumber}
          onExpandTopic={onExpandTopic}
          onDeleteExpansion={onDeleteExpansion}
          onSuggestExtraTopics={onSuggestExtraTopics}
          onDeleteExtraTopic={onDeleteExtraTopic}
          expansions={topicExpansions}
          loadingExpansion={loadingExpansion}
          suggestingExtra={suggestingExtra}
          canMutate={canMutate}
        />
      </Card>

      {/* Structured Time Plan Card */}
      <Card className="p-5 sm:p-6">
        <DayTimeline
          blocks={blocks}
          totalMinutes={estimatedMinutes}
          loading={loadingPlan}
          completedBlocks={completedBlocks}
          onToggleBlock={onToggleBlock}
        />
      </Card>

      {/* Hands-on Practice Tasks */}
      {task.practiceTasks && task.practiceTasks.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-line">
            <Code className="w-4 h-4 text-accent" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
              Hands-on Exercises ({task.practiceTasks.length})
            </h4>
          </div>
          <div className="space-y-2">
            {task.practiceTasks.map((pt, pIdx) => (
              <div
                key={pIdx}
                className="p-3 rounded-md border border-line bg-page text-[13px] text-ink flex items-start gap-2.5"
              >
                <span className="font-semibold text-accent shrink-0">{pIdx + 1}.</span>
                <span className="leading-relaxed">{typeof pt === 'string' ? pt : pt.title || pt.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mastery Check / Quiz Question */}
      {task.quizQuestion && (
        <Card className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-line">
            <HelpCircle className="w-4 h-4 text-accent" />
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
              Mastery Verification Quiz
            </h4>
          </div>
          <div className="p-4 rounded-md border border-line bg-page space-y-2">
            <p className="text-[13px] font-medium text-ink leading-relaxed">
              {typeof task.quizQuestion === 'string' ? task.quizQuestion : task.quizQuestion.question}
            </p>
            {task.quizQuestion.options && (
              <div className="space-y-1.5 pt-2">
                {task.quizQuestion.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className="p-2 rounded border border-line bg-surface text-[13px] text-muted flex items-center gap-2"
                  >
                    <span className="font-medium text-ink">{String.fromCharCode(65 + oIdx)}.</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Resources for this Phase / Day */}
      {phase?.learningResources && phase.learningResources.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-3">
          <h4 className="text-sm font-semibold text-ink uppercase tracking-wide pb-2 border-b border-line">
            Phase Learning Resources
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {phase.learningResources.map((res, rIdx) => (
              <a
                key={rIdx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-md border border-line bg-page hover:bg-surface text-[13px] text-ink flex items-center justify-between gap-2 group transition-colors duration-150"
              >
                <div className="space-y-0.5 truncate">
                  <span className="font-medium block truncate group-hover:text-accent">
                    {res.title || res.name}
                  </span>
                  <span className="text-[12px] text-muted block uppercase">
                    {res.type || 'Resource'}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0 group-hover:text-accent" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
