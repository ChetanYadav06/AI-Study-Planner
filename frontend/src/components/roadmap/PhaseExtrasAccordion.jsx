import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Award, Code, BookOpen } from 'lucide-react';
import { formatEnum } from '../../utils/formatters';

export const PhaseExtrasAccordion = ({ phase }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!phase) return null;

  const hasAssessment = Boolean(phase.assessment && (phase.assessment.title || phase.assessment.description));
  const hasExercises = Boolean(phase.practicalExercises && phase.practicalExercises.length > 0);
  const hasResources = Boolean(phase.learningResources && phase.learningResources.length > 0);

  if (!hasAssessment && !hasExercises && !hasResources) {
    return null;
  }

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-page/60 hover:bg-page transition-colors text-left cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-accent"
        aria-expanded={isOpen}
        aria-controls="phase-extras-content"
      >
        <span className="text-[13px] font-semibold text-ink">
          More for this phase
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {isOpen && (
        <div id="phase-extras-content" className="p-4 space-y-4 border-t border-line divide-y divide-line">
          {/* Phase Assessment */}
          {hasAssessment && (
            <div className="space-y-2 pt-2 first:pt-0">
              <div className="flex items-center gap-2 text-ink text-[13px] font-semibold">
                <Award className="w-4 h-4 text-accent" />
                <span>Phase Assessment: {phase.assessment.title || 'Mastery Evaluation'}</span>
                {phase.assessment.type && (
                  <span className="text-[13px] font-medium px-2 py-0.5 rounded border border-line bg-page text-muted">
                    {formatEnum(phase.assessment.type)}
                  </span>
                )}
              </div>
              {phase.assessment.description && (
                <p className="text-[13px] text-muted leading-relaxed">
                  {phase.assessment.description}
                </p>
              )}
              {phase.assessment.passingCriteria && (
                <div className="text-[13px] text-muted bg-page p-2.5 rounded border border-line">
                  <span className="font-semibold text-ink">Passing criteria: </span>
                  <span>{phase.assessment.passingCriteria}</span>
                </div>
              )}
            </div>
          )}

          {/* Phase Practical Exercises */}
          {hasExercises && (
            <div className="space-y-2.5 pt-4">
              <div className="flex items-center gap-2 text-ink text-[13px] font-semibold">
                <Code className="w-4 h-4 text-accent" />
                <span>Phase Practical Exercises</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {phase.practicalExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-md border border-line bg-page space-y-1 text-[13px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink truncate">
                        {ex.title || `Exercise ${idx + 1}`}
                      </span>
                      {ex.difficulty && (
                        <span className="text-[13px] font-medium px-1.5 py-0.2 rounded border border-line bg-surface text-muted">
                          {formatEnum(ex.difficulty)}
                        </span>
                      )}
                    </div>
                    {ex.instructions && (
                      <p className="text-muted leading-relaxed text-[13px]">
                        {ex.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase Learning Resources */}
          {hasResources && (
            <div className="space-y-2.5 pt-4">
              <div className="flex items-center gap-2 text-ink text-[13px] font-semibold">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Phase Learning Resources</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {phase.learningResources.map((res, rIdx) => (
                  <a
                    key={rIdx}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-md border border-line bg-page hover:bg-surface text-[13px] text-ink flex items-center justify-between gap-2 transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <div className="space-y-0.5 truncate">
                      <span className="font-medium block truncate text-ink">
                        {res.title || res.name}
                      </span>
                      <span className="text-[13px] text-muted block">
                        {formatEnum(res.type || 'Resource')}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
