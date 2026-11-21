import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Copy, Check, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const RoadmapHeader = ({
  roadmap,
  progressPercent = 0,
  completedCount = 0,
  totalCount = 0,
  onBack,
  onRegenerate,
  regenerating = false,
  onCopyMarkdown
}) => {
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!roadmap) return null;

  const targetDays = roadmap.targetDays || totalCount || 30;
  const hoursPerDay = roadmap.hoursPerDay || 2;
  const minutesPerDay = Math.round(hoursPerDay * 60);
  const totalStudyHours = roadmap.totalStudyHours || Math.round(targetDays * hoursPerDay);

  const handleExport = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Nav and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {onBack ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="gap-2 self-start min-h-[40px] text-[13px] rounded-md"
            aria-label="Back to roadmaps"
          >
            <ArrowLeft className="w-4 h-4 text-muted" />
            <span>Back to roadmaps</span>
          </Button>
        ) : <div />}

        <div className="flex items-center gap-2 self-end">
          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRegenModal(true)}
              disabled={regenerating}
              className="gap-1.5 min-h-[40px] text-[13px] text-danger hover:text-danger rounded-md"
              aria-label="Regenerate roadmap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Regenerate</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="gap-1.5 min-h-[40px] text-[13px] rounded-md"
            aria-label="Export roadmap markdown"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-accent" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-muted" />
                <span>Export</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Roadmap Title and Meta Line */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          {roadmap.topic}
        </h1>
        <p className="text-[13px] text-muted font-medium">
          {targetDays} days, {minutesPerDay} minutes a day, {totalStudyHours} hours in total
        </p>
      </div>

      {/* Pacing Advice if provided */}
      {roadmap.feasibilityNote && (
        <div className="p-3 rounded-lg border border-line bg-page text-[13px] text-muted flex items-start gap-2">
          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
          <span>{roadmap.feasibilityNote}</span>
        </div>
      )}

      {/* Confirm Regeneration Dialog */}
      <ConfirmDialog
        isOpen={showRegenModal}
        title="Regenerate Roadmap?"
        message="Regenerating this roadmap will create a fresh set of curriculum phases and tasks. Your current completion checkboxes will be reset."
        confirmText="Regenerate"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowRegenModal(false);
          if (onRegenerate) {
            await onRegenerate();
          }
        }}
        onCancel={() => setShowRegenModal(false)}
      />
    </div>
  );
};
