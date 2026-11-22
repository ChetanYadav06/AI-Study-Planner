import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Clock,
  Layers,
  BookOpen,
  Target,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatEnum } from '../../utils/formatters';

export const RoadmapOverview = ({
  roadmap,
  totalModules = 0,
  totalTopics = 0,
  completedTopicsCount = 0,
  progressPercentage = 0,
  currentPhaseTitle = null,
  onBack,
  onRegenerate,
  regenerating = false,
  onCopyMarkdown
}) => {
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!roadmap) return null;

  const targetDays = roadmap.targetDays || totalTopics || 30;
  const hoursPerDay = roadmap.hoursPerDay || 2;
  const minutesPerDay = Math.round(hoursPerDay * 60);
  const totalStudyHours = roadmap.totalStudyHours || Math.round(targetDays * hoursPerDay);
  const remainingHours = Math.max(0, Math.round((totalStudyHours * (1 - (progressPercentage / 100))) * 10) / 10);

  const handleExport = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {onBack ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="gap-2 self-start"
            aria-label="Back to roadmaps"
          >
            <ArrowLeft className="w-4 h-4 text-muted" />
            <span>Back to Roadmaps</span>
          </Button>
        ) : <div />}

        <div className="flex items-center gap-2 self-end">
          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRegenModal(true)}
              disabled={regenerating}
              className="gap-1.5 text-danger hover:text-danger"
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
            className="gap-1.5"
            aria-label="Export roadmap markdown"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-muted" />
                <span>Export Markdown</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="p-5 sm:p-6 space-y-4 bg-surface-2 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge variant="accent" size="sm">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>AI CURRICULUM</span>
              </Badge>
              <Badge variant="accent" size="sm">
                {formatEnum(roadmap.skillLevel || 'INTERMEDIATE')}
              </Badge>
              <Badge variant="neutral" size="sm">
                {targetDays} Days Plan
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {roadmap.topic || roadmap.title}
            </h1>

            {roadmap.description && (
              <p className="text-[13px] text-muted leading-relaxed max-w-4xl">
                {roadmap.description}
              </p>
            )}
          </div>

          {/* Overall Progress Gauge Widget */}
          <div className="lg:w-64 shrink-0 p-4 rounded-xl bg-surface-1 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-semibold uppercase tracking-wider">Overall Progress</span>
              <span className="text-accent font-mono font-bold text-sm">
                {progressPercentage === 0 ? 'Ready to Start' : `${progressPercentage}%`}
              </span>
            </div>
            {progressPercentage === 0 ? (
              <div className="p-2 rounded-lg bg-surface-2 border border-border text-center">
                <span className="text-xs text-text-muted font-medium flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Day 1 Ready to Begin
                </span>
              </div>
            ) : (
              <ProgressBar value={progressPercentage} height="h-2" />
            )}
            <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
              <span>{completedTopicsCount} of {totalTopics} topics done</span>
              <span>{Math.max(0, totalTopics - completedTopicsCount)} remaining</span>
            </div>
          </div>
        </div>

        {/* Multi-Stat Snapshot Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-border text-xs">
          <div className="p-3 rounded-lg bg-surface-1 border border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-text-muted font-medium block">Current Phase</span>
              <span className="text-[13px] font-bold text-text truncate block">{currentPhaseTitle || `Phase 1 of ${totalModules}`}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-1 border border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-info/15 text-info flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-text-muted font-medium block">Target Plan</span>
              <span className="text-[13px] font-bold text-text">{targetDays} Days</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-1 border border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-done/15 text-done flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-text-muted font-medium block">Completed Topics</span>
              <span className="text-[13px] font-bold text-text">{completedTopicsCount} / {totalTopics} Done</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-1 border border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-text-muted font-medium block">Est. Total Time</span>
              <span className="text-[13px] font-bold text-text">{totalStudyHours}h ({minutesPerDay}m/d)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-1 border border-border flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-next/15 text-next flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-text-muted font-medium block">Remaining Time</span>
              <span className="text-[13px] font-bold text-text">{remainingHours} Hours Left</span>
            </div>
          </div>
        </div>

        {/* Pacing Advice / Feasibility note */}
        {roadmap.feasibilityNote && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-[13px] text-muted flex items-start gap-2">
            <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>{roadmap.feasibilityNote}</span>
          </div>
        )}
      </Card>

      {/* Confirm Regeneration Dialog */}
      <ConfirmDialog
        isOpen={showRegenModal}
        title="Regenerate Roadmap?"
        message="Regenerating this roadmap will generate fresh curriculum phases and daily tasks. Your current completion ticks will be reset."
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

export default RoadmapOverview;
