import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Brain,
  Rocket,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  Check
} from 'lucide-react';
import { createGoal, startRoadmapJob, getRoadmapJobStatus, saveRoadmap } from '../../services/api';
import { useData } from '../../context/DataContext';
import { useRouter } from '../../context/RouterContext';
import { Button } from '../ui/Button';

const SKILL_LEVELS = [
  { level: 'BEGINNER', label: 'Beginner', desc: 'New to the subject', Icon: BookOpen },
  { level: 'INTERMEDIATE', label: 'Intermediate', desc: 'Have basic knowledge', Icon: Brain },
  { level: 'ADVANCED', label: 'Advanced', desc: 'Already have experience', Icon: Rocket },
];

const DURATION_PRESETS = [14, 30, 60, 90];
const DAILY_HOURS_PRESETS = [1, 2, 3, 4, 6];

export const CreateGoalModal = ({ isOpen, onClose, onGoalCreated }) => {
  const { addRoadmap, setActiveRoadmapId, refreshData } = useData();
  const { navigate } = useRouter();

  const [learningGoal, setLearningGoal] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');

  // Duration State
  const [targetDays, setTargetDays] = useState(30);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');

  // Daily Study Hours State
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [isCustomHours, setIsCustomHours] = useState(false);
  const [customHoursInput, setCustomHoursInput] = useState('');

  // Generation & Persistence State
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [savedGoalId, setSavedGoalId] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Compute effective display values
  const effectiveDays = isCustomDays
    ? (customDaysInput && !isNaN(Number(customDaysInput)) ? Number(customDaysInput) : 'Custom')
    : targetDays;

  const effectiveHours = isCustomHours
    ? (customHoursInput && !isNaN(Number(customHoursInput)) ? Number(customHoursInput) : 'Custom')
    : hoursPerDay;

  const totalCommitmentHours = typeof effectiveDays === 'number' && typeof effectiveHours === 'number'
    ? Math.round(effectiveDays * effectiveHours)
    : null;

  // Poll asynchronous roadmap generation job until completion
  const pollJobUntilComplete = (jobId) => {
    return new Promise((resolve, reject) => {
      let pollCount = 0;
      const timer = setInterval(async () => {
        pollCount++;
        try {
          const job = await getRoadmapJobStatus(jobId);
          if (job.phasesTotal > 0) {
            setGenerationProgress(`Phase ${job.phasesDone} of ${job.phasesTotal}: ${job.message || 'Generating study tasks...'}`);
          } else if (job.message) {
            setGenerationProgress(job.message);
          }

          if (job.state === 'DONE') {
            clearInterval(timer);
            resolve(job.result);
          } else if (job.state === 'FAILED') {
            clearInterval(timer);
            reject(new Error(job.error || 'Roadmap generation failed. Please try again.'));
          } else if (pollCount > 180) { // 3-minute timeout
            clearInterval(timer);
            reject(new Error('Roadmap generation timed out. Please try again.'));
          }
        } catch (err) {
          console.warn('Error polling roadmap job:', err);
          if (pollCount > 10 && err.response?.status >= 500) {
            clearInterval(timer);
            reject(err);
          }
        }
      }, 1000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Validate Learning Goal
    const trimmedGoal = learningGoal.trim();
    if (!trimmedGoal) {
      setError('Please specify what you want to learn.');
      return;
    }
    if (trimmedGoal.length < 3) {
      setError('Learning goal must be at least 3 characters.');
      return;
    }

    // 2. Validate Duration (Days)
    let daysNum;
    if (isCustomDays) {
      const trimmedDays = customDaysInput.trim();
      if (!trimmedDays) {
        setError('Please enter your custom learning duration in days.');
        return;
      }
      if (!/^\d+$/.test(trimmedDays)) {
        setError('Learning duration must be a positive whole number of days.');
        return;
      }
      daysNum = parseInt(trimmedDays, 10);
      if (daysNum < 1) {
        setError('Learning duration must be at least 1 day.');
        return;
      }
      if (daysNum > 365) {
        setError('Learning duration cannot exceed 365 days.');
        return;
      }
    } else {
      daysNum = Number(targetDays);
      if (!daysNum || daysNum < 1 || daysNum > 365) {
        setError('Please select a valid learning duration.');
        return;
      }
    }

    // 3. Validate Daily Study Time (Hours)
    let hoursNum;
    if (isCustomHours) {
      const trimmedHours = customHoursInput.trim();
      if (!trimmedHours) {
        setError('Please enter your custom daily study time in hours.');
        return;
      }
      hoursNum = parseFloat(trimmedHours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        setError('Daily study time must be a positive number.');
        return;
      }
      if (hoursNum < 0.5) {
        setError('Daily study time must be at least 0.5 hours.');
        return;
      }
      if (hoursNum > 12) {
        setError('Daily study time cannot exceed 12 hours.');
        return;
      }
    } else {
      hoursNum = Number(hoursPerDay);
      if (!hoursNum || hoursNum < 0.5 || hoursNum > 12) {
        setError('Please select a valid daily study time.');
        return;
      }
    }

    setLoading(true);
    setGenerationProgress('Saving your learning goal...');

    try {
      let goalIdToUse = savedGoalId;

      // Step 1: Save Goal entity in MySQL (or reuse previously saved goal on retry)
      if (!goalIdToUse) {
        const goal = await createGoal({
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
        goalIdToUse = goal.id;
        setSavedGoalId(goal.id);
      }

      // Step 2: Start Gemini Roadmap Generation Job with exact custom values
      setGenerationProgress('Initializing AI roadmap generation...');
      const { jobId } = await startRoadmapJob({
        topic: trimmedGoal,
        description: focusAreas.trim()
          ? `Focus areas: ${focusAreas.trim()}`
          : `Mastery and personalized roadmap progression for ${trimmedGoal}`,
        skillLevel,
        targetDays: daysNum,
        hoursPerDay: hoursNum,
        goalId: goalIdToUse,
        specificTopics: focusAreas.trim() || undefined
      });

      // Step 3: Poll until Gemini finishes all phases
      const result = await pollJobUntilComplete(jobId);

      // Step 4: Persist generated roadmap to MySQL linked to the goal
      setGenerationProgress('Saving generated roadmap to database...');
      const savedRecord = await saveRoadmap({
        goalId: goalIdToUse,
        title: result.topic || trimmedGoal,
        topic: result.topic || trimmedGoal,
        skillLevel: result.skillLevel || skillLevel,
        targetDays: result.targetDays || daysNum,
        hoursPerDay: result.hoursPerDay || hoursNum,
        roadmapJson: typeof result === 'string' ? result : JSON.stringify(result)
      });

      // Step 5: Update frontend state, invalidate cache, and navigate
      if (savedRecord?.id) {
        addRoadmap(savedRecord);
        setActiveRoadmapId(savedRecord.id);
        await refreshData(true);

        if (onGoalCreated) {
          onGoalCreated(savedRecord);
        }
        onClose();
        navigate(`#/roadmaps/${savedRecord.id}`);
      } else {
        throw new Error('Roadmap generated, but server failed to return a persistent record.');
      }
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Roadmap generation failed. Please click Retry to try again.'
      );
    } finally {
      setLoading(false);
      setGenerationProgress('');
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
            disabled={loading}
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
                    disabled={loading}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Learning Duration
                </label>
                <span className="text-[11px] font-mono text-accent font-medium">
                  {typeof effectiveDays === 'number' ? `${effectiveDays} Days` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {DURATION_PRESETS.map((days) => {
                  const isSelected = !isCustomDays && targetDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setTargetDays(days);
                        setIsCustomDays(false);
                        setCustomDaysInput('');
                        if (error) setError(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent-solid text-white border-accent'
                          : 'bg-surface-2 border-border text-text hover:border-border-strong'
                      }`}
                    >
                      {days}d
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsCustomDays(true);
                    if (!customDaysInput) setCustomDaysInput(String(targetDays || ''));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isCustomDays
                      ? 'bg-accent-solid text-white border-accent'
                      : 'bg-surface-2 border-border text-text hover:border-border-strong'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomDays && (
                <div className="pt-1.5 space-y-1">
                  <label className="text-[11px] font-medium text-text-muted block">
                    Enter Learning Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      step="1"
                      disabled={loading}
                      value={customDaysInput}
                      onChange={(e) => {
                        setCustomDaysInput(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text placeholder:text-text-muted/60 focus:border-accent outline-none font-mono"
                      placeholder="Enter number of days"
                    />
                    <span className="text-xs text-text-muted shrink-0 font-medium">Days</span>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Study Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Daily Study Time
                </label>
                <span className="text-[11px] font-mono text-accent font-medium">
                  {typeof effectiveHours === 'number' ? `${effectiveHours}h/day` : ''}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {DAILY_HOURS_PRESETS.map((hrs) => {
                  const isSelected = !isCustomHours && hoursPerDay === hrs;
                  return (
                    <button
                      key={hrs}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setHoursPerDay(hrs);
                        setIsCustomHours(false);
                        setCustomHoursInput('');
                        if (error) setError(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-accent-solid text-white border-accent'
                          : 'bg-surface-2 border-border text-text hover:border-border-strong'
                      }`}
                    >
                      {hrs}h
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsCustomHours(true);
                    if (!customHoursInput) setCustomHoursInput(String(hoursPerDay || ''));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    isCustomHours
                      ? 'bg-accent-solid text-white border-accent'
                      : 'bg-surface-2 border-border text-text hover:border-border-strong'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomHours && (
                <div className="pt-1.5 space-y-1">
                  <label className="text-[11px] font-medium text-text-muted block">
                    Enter Daily Study Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      max="12"
                      step="0.5"
                      disabled={loading}
                      value={customHoursInput}
                      onChange={(e) => {
                        setCustomHoursInput(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text placeholder:text-text-muted/60 focus:border-accent outline-none font-mono"
                      placeholder="e.g. 2.5 hours"
                    />
                    <span className="text-xs text-text-muted shrink-0 font-medium">Hours</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Roadmap Summary / Live Progress Message */}
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-2.5 text-xs">
            {loading ? (
              <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-text font-medium">
                {loading
                  ? (generationProgress || 'Generating your personalized roadmap...')
                  : 'AI will create your personalized learning roadmap with daily schedules and milestones.'}
              </p>
              {totalCommitmentHours != null && !loading && (
                <p className="text-text-muted text-[11px]">
                  Estimated commitment: <span className="font-semibold text-accent font-mono">~{totalCommitmentHours} hours</span> across <span className="font-semibold text-text font-mono">{effectiveDays} days</span> ({effectiveHours}h/day).
                </p>
              )}
            </div>
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
                  <span>Generating Roadmap...</span>
                </>
              ) : savedGoalId && error ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Retry Generating Roadmap</span>
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
