import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Brain,
  Rocket,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createGoal } from '../../services/api';
import { Button } from '../ui/Button';

const SKILL_LEVELS = [
  { level: 'BEGINNER', label: 'Beginner', desc: 'New to the subject', Icon: BookOpen },
  { level: 'INTERMEDIATE', label: 'Intermediate', desc: 'Have basic knowledge', Icon: Brain },
  { level: 'ADVANCED', label: 'Advanced', desc: 'Already have experience', Icon: Rocket },
];

const DURATION_PRESETS = [14, 30, 60, 90];
const DAILY_HOURS_PRESETS = [1, 2, 3, 4, 6];

export const CreateGoalModal = ({ isOpen, onClose, onGoalCreated }) => {
  const [learningGoal, setLearningGoal] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [targetDays, setTargetDays] = useState(30);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedGoal = learningGoal.trim();
    if (!trimmedGoal) {
      setError('Please specify what you want to learn.');
      return;
    }
    if (trimmedGoal.length < 3) {
      setError('Learning goal must be at least 3 characters.');
      return;
    }
    const daysNum = Number(targetDays);
    if (!daysNum || daysNum < 1 || daysNum > 365) {
      setError('Learning duration must be between 1 and 365 days.');
      return;
    }
    const hoursNum = Number(hoursPerDay);
    if (!hoursNum || hoursNum < 0.5 || hoursNum > 24) {
      setError('Daily study time must be between 0.5 and 24 hours.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createGoal({
        title: trimmedGoal,
        description: focusAreas.trim()
          ? `Focus areas: ${focusAreas.trim()}`
          : `Mastery and personalized roadmap progression for ${trimmedGoal}`,
        specificTopics: focusAreas.trim() || undefined,
        skillLevel,
        targetDays: daysNum,
        hoursPerDay: hoursNum,
        priority: 'HIGH'
      });

      if (onGoalCreated) {
        onGoalCreated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError(
        err.response?.data?.errors?.title ||
        err.response?.data?.message ||
        'Failed to create learning goal. Please check your inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 rounded-2xl max-w-lg w-full border border-border shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/60">
          <div>
            <h2 className="text-base font-bold text-text">Create Learning Goal</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Tell AI what you want to learn and build your personalized roadmap.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-1 border border-transparent hover:border-border flex items-center justify-center transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-danger text-xs rounded-xl flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Learning Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text flex items-center justify-between">
              <span>What do you want to learn? <span className="text-accent">*</span></span>
            </label>
            <input
              type="text"
              required
              value={learningGoal}
              onChange={(e) => {
                setLearningGoal(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Java, Spring Boot, Data Structures & Algorithms..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text placeholder:text-text-muted/60 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
            />
          </div>

          {/* 2. Focus Areas (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text flex items-center justify-between">
              <span>What do you want to focus on?</span>
              <span className="text-[11px] font-normal text-text-muted">Optional</span>
            </label>
            <input
              type="text"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="e.g. OOP, Linked Lists, REST APIs, SQL..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text placeholder:text-text-muted/60 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
            />
          </div>

          {/* 3. Skill Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text block">
              Skill Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SKILL_LEVELS.map(({ level, label, desc, Icon }) => {
                const isSelected = skillLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSkillLevel(level)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-accent/15 border-accent shadow-xs'
                        : 'bg-surface-2 border-border hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-text-muted'}`} />
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-accent' : 'bg-transparent'}`} />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${isSelected ? 'text-accent' : 'text-text'}`}>
                        {label}
                      </span>
                      <span className="text-[10px] text-text-muted leading-tight block mt-0.5">
                        {desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Learning Duration & Daily Study Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Learning Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text block">
                Learning Duration
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DURATION_PRESETS.map((days) => {
                  const isSelected = !isCustomDays && targetDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setTargetDays(days);
                        setIsCustomDays(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent-solid text-white border-accent'
                          : 'bg-surface-2 border-border text-text hover:border-border-strong'
                      }`}
                    >
                      {days} Days
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsCustomDays(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isCustomDays
                      ? 'bg-accent-solid text-white border-accent'
                      : 'bg-surface-2 border-border text-text hover:border-border-strong'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomDays && (
                <div className="pt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={targetDays}
                    onChange={(e) => setTargetDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text focus:border-accent outline-none"
                    placeholder="Days"
                  />
                  <span className="text-xs text-text-muted">Total days</span>
                </div>
              )}
            </div>

            {/* Daily Study Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text block">
                Daily Study Time
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAILY_HOURS_PRESETS.map((hrs) => {
                  const isSelected = hoursPerDay === hrs;
                  return (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setHoursPerDay(hrs)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent-solid text-white border-accent'
                          : 'bg-surface-2 border-border text-text hover:border-border-strong'
                      }`}
                    >
                      {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Roadmap Generation Message */}
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-2.5 text-xs text-text-muted">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              AI will create your personalized learning roadmap with topics, phases, daily schedules and learning milestones.
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !learningGoal.trim()}
              className="gap-2 px-5 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Roadmap</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGoalModal;
