import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react';
import { Card, Button } from '../ui';

export const LearningPreferencesSection = ({
  initialProfile,
  onSavePreferences,
  isSaving = false
}) => {
  const {
    roadmaps = [],
    activeRoadmapId,
    activeRoadmap,
    activeRoadmapStats,
    setActiveRoadmapId
  } = useData();

  const [additionalNotes, setAdditionalNotes] = useState(() => {
    const raw = initialProfile?.additionalContext || '';
    return raw.replace(/\[Revision:\s*[A-Z_]+\]\s*/g, '').trim();
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    await onSavePreferences({
      dailyStudyHours: initialProfile?.dailyStudyHours || 2.0,
      availableDaysPerWeek: initialProfile?.availableDaysPerWeek || 5,
      preferredStudyTime: initialProfile?.preferredStudyTime || 'EVENING',
      learningMethods: initialProfile?.learningMethods || 'VIDEO,CODING_PRACTICE',
      explanationStyle: initialProfile?.explanationStyle || 'STEP_BY_STEP',
      practiceStyle: initialProfile?.practiceStyle || 'CODING_PROBLEMS',
      additionalContext: additionalNotes.trim()
    });

    setHasChanges(false);
  };

  return (
    <Card className="p-6 sm:p-7 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-line">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Personalized Delivery
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight">
            Learning Preferences
          </h2>
          <p className="text-xs sm:text-[13px] text-muted leading-relaxed">
            Set your active roadmap and provide context so Gemini can personalize your study experience.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving}
          className="gap-1.5 self-start sm:self-center shrink-0"
        >
          {isSaving ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save preferences</span>
            </>
          )}
        </Button>
      </div>

      {/* ── ACTIVE ROADMAP ── */}
      <div className="p-4 rounded-[12px] bg-surface-2 border border-border space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <label htmlFor="active-roadmap-select" className="text-sm font-semibold text-text block">
              Active Roadmap
            </label>
            <span className="text-xs text-text-muted">
              Synchronized across your sidebar, dashboard, and AI study tutor.
            </span>
          </div>
          {activeRoadmap && (
            <span className="text-xs font-mono font-medium text-accent">
              {activeRoadmapStats?.percent || 0}% complete ({activeRoadmapStats?.completedHours || 0}h / {activeRoadmapStats?.totalHours || 0}h)
            </span>
          )}
        </div>
        <select
          id="active-roadmap-select"
          value={activeRoadmapId || (activeRoadmap?.id ? String(activeRoadmap.id) : '')}
          onChange={(e) => setActiveRoadmapId(e.target.value)}
          className="w-full p-2.5 rounded-[10px] bg-surface-1 border border-border text-text font-medium text-sm focus:border-accent outline-none cursor-pointer"
        >
          {roadmaps.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.topic || r.title} ({r.progressPercentage || 0}%)
            </option>
          ))}
        </select>
      </div>

      {/* ── ADDITIONAL CONTEXT ── */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-ink">
          What else should your AI Study Planner know about you?
        </label>
        <p className="text-xs text-muted">
          Mention target companies, weak areas, or anything that helps Gemini tailor your roadmap.
        </p>
        <textarea
          rows={3}
          value={additionalNotes}
          onChange={(e) => {
            setHasChanges(true);
            setAdditionalNotes(e.target.value);
          }}
          placeholder="e.g. Target companies: Google & Atlassian. Weak in dynamic programming and graph DFS. Strong in relational databases."
          className="w-full p-3 rounded-[10px] bg-surface-2 border border-border text-sm text-text placeholder:text-text-muted focus:border-accent outline-none resize-y transition"
        />
      </div>

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-line">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>
            {hasChanges
              ? 'Unsaved changes. Click Save to update.'
              : 'All preferences are synchronized with Gemini.'}
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save preferences</span>
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
