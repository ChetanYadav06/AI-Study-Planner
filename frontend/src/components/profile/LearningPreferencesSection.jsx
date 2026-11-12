import React, { useState } from 'react';
import {
  Video,
  BookOpen,
  Code,
  Layers,
  HelpCircle,
  Zap,
  Gauge,
  Activity,
  Clock,
  Sparkles,
  FileText,
  AlignLeft,
  ListTree,
  Terminal,
  Puzzle,
  RotateCcw,
  CheckCircle2,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, Button } from '../ui';

// 1. Learning Formats (maps to StudentProfile.learningMethods: VIDEO, READING, CODING_PRACTICE, PROJECTS, QUIZZES)
export const FORMAT_OPTIONS = [
  {
    id: 'VIDEO',
    title: 'Videos & Screencasts',
    desc: 'Visual lectures and live coding walkthroughs',
    icon: Video
  },
  {
    id: 'READING',
    title: 'Text & Documentation',
    desc: 'Official docs, deep-dive articles, and cheat-sheets',
    icon: BookOpen
  },
  {
    id: 'CODING_PRACTICE',
    title: 'Hands-on Practice',
    desc: 'Direct problem solving, syntax labs, and coding tasks',
    icon: Code
  },
  {
    id: 'PROJECTS',
    title: 'Practical Projects',
    desc: 'End-to-end full-stack or architecture implementations',
    icon: Layers
  },
  {
    id: 'QUIZZES',
    title: 'Interactive Quizzes',
    desc: 'Frequent mastery checks and conceptual multiple choice',
    icon: HelpCircle
  }
];

// 2. Learning Pace (derived from availableDaysPerWeek / dailyStudyHours)
export const PACE_OPTIONS = [
  {
    id: 'RELAXED',
    title: 'Relaxed',
    badge: '3 days/wk • 1.0h/day',
    desc: 'Gentle, sustainable learning for busy professionals or school exams',
    days: 3,
    hours: 1.0,
    icon: Activity
  },
  {
    id: 'BALANCED',
    title: 'Balanced',
    badge: '5 days/wk • 2.0h/day',
    desc: 'Consistent daily momentum recommended for career skill builders',
    days: 5,
    hours: 2.0,
    icon: Gauge
  },
  {
    id: 'INTENSIVE',
    title: 'Intensive',
    badge: '6 days/wk • 3.5h/day',
    desc: 'Fast-track immersive sprint for upcoming job placement deadlines',
    days: 6,
    hours: 3.5,
    icon: Zap
  }
];

// 3. Explanation Style (maps to StudentProfile.explanationStyle: SIMPLE, STEP_BY_STEP, TECHNICAL, EXAMPLES_FIRST)
export const EXPLANATION_OPTIONS = [
  {
    id: 'SIMPLE',
    title: 'Simple & Jargon-Free',
    desc: 'Intuitive real-world analogies before formal theory',
    icon: Sparkles
  },
  {
    id: 'STEP_BY_STEP',
    title: 'Step-by-Step Guidance',
    desc: 'Logical milestones with chronological scaffolding',
    icon: ListTree
  },
  {
    id: 'TECHNICAL',
    title: 'Detailed & Under-the-Hood',
    desc: 'Deep mechanical analysis, memory models, and tradeoffs',
    icon: Terminal
  },
  {
    id: 'EXAMPLES_FIRST',
    title: 'Code Examples First',
    desc: 'Working code snippet immediately, followed by theory',
    icon: FileText
  }
];

// 4. Practice Style (maps to StudentProfile.practiceStyle: CODING_PROBLEMS, MINI_PROJECTS, MCQS, REAL_WORLD)
export const PRACTICE_OPTIONS = [
  {
    id: 'CODING_PROBLEMS',
    title: 'Coding Problems',
    desc: 'Algorithmic challenges and placement interview sets',
    icon: Code
  },
  {
    id: 'MINI_PROJECTS',
    title: 'Practical Projects',
    desc: 'Modular full-stack feature builds and real components',
    icon: Layers
  },
  {
    id: 'MCQS',
    title: 'Quizzes & Checkpoints',
    desc: 'Rapid question sets to validate theoretical fundamentals',
    icon: Puzzle
  },
  {
    id: 'REAL_WORLD',
    title: 'Debugging & Diagnostics',
    desc: 'Troubleshoot realistic broken setups and edge cases',
    icon: Terminal
  }
];

// 5. Revision Frequency (stored in additionalContext or preferredStudyTime metadata)
export const REVISION_OPTIONS = [
  {
    id: 'DAILY',
    title: 'Daily Spaced Repetition',
    desc: 'Brief 10-minute recap at the start of each study session',
    badge: 'High retention'
  },
  {
    id: 'WEEKLY',
    title: 'Weekly Consolidation',
    desc: 'Dedicated review and self-assessment day every 7 days',
    badge: 'Recommended'
  },
  {
    id: 'BEFORE_EXAMS',
    title: 'Milestone / Before Exams',
    desc: 'Comprehensive review sessions before phase milestones',
    badge: 'Sprint focus'
  }
];

// 6. Focus Window Options
export const FOCUS_WINDOWS = [
  { id: 'MORNING', title: 'Morning Focus', hours: '6 AM – 12 PM' },
  { id: 'AFTERNOON', title: 'Afternoon Flow', hours: '12 PM – 5 PM' },
  { id: 'EVENING', title: 'Evening Intensive', hours: '5 PM – 9 PM' },
  { id: 'NIGHT', title: 'Late Night', hours: '9 PM – 2 AM' },
  { id: 'FLEXIBLE', title: 'Flexible Schedule', hours: 'Varied times' }
];

export const LearningPreferencesSection = ({
  initialProfile,
  onSavePreferences,
  isSaving = false
}) => {
  // Controlled local state
  const [selectedMethods, setSelectedMethods] = useState(() => {
    if (initialProfile?.learningMethods) {
      return initialProfile.learningMethods.split(',').map(s => s.trim()).filter(Boolean);
    }
    return ['VIDEO', 'CODING_PRACTICE'];
  });

  const [dailyHours, setDailyHours] = useState(() => initialProfile?.dailyStudyHours || 2.0);
  const [daysPerWeek, setDaysPerWeek] = useState(() => initialProfile?.availableDaysPerWeek || 5);
  const [explanationStyle, setExplanationStyle] = useState(() => initialProfile?.explanationStyle || 'STEP_BY_STEP');
  const [practiceStyle, setPracticeStyle] = useState(() => initialProfile?.practiceStyle || 'CODING_PROBLEMS');
  const [preferredTime, setPreferredTime] = useState(() => initialProfile?.preferredStudyTime || 'EVENING');
  const [revisionFrequency, setRevisionFrequency] = useState(() => {
    // Parse from additionalContext if tagged, otherwise default to WEEKLY
    if (initialProfile?.additionalContext?.includes('[Revision: DAILY]')) return 'DAILY';
    if (initialProfile?.additionalContext?.includes('[Revision: BEFORE_EXAMS]')) return 'BEFORE_EXAMS';
    return 'WEEKLY';
  });
  const [additionalNotes, setAdditionalNotes] = useState(() => {
    const raw = initialProfile?.additionalContext || '';
    // Strip metadata tag if present
    return raw.replace(/\[Revision:\s*[A-Z_]+\]\s*/g, '').trim();
  });

  // Track if current state is modified
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggleMethod = (methodId) => {
    setHasChanges(true);
    setSelectedMethods(prev => {
      if (prev.includes(methodId)) {
        // Keep at least one format selected
        if (prev.length <= 1) return prev;
        return prev.filter(m => m !== methodId);
      } else {
        return [...prev, methodId];
      }
    });
  };

  const handleApplyPace = (pace) => {
    setHasChanges(true);
    setDailyHours(pace.hours);
    setDaysPerWeek(pace.days);
  };

  // Determine which pace preset matches, if any
  const currentPaceId = (() => {
    if (dailyHours <= 1.0 && daysPerWeek <= 3) return 'RELAXED';
    if (dailyHours >= 3.0 && daysPerWeek >= 6) return 'INTENSIVE';
    if (dailyHours >= 1.5 && dailyHours <= 2.5 && daysPerWeek >= 4 && daysPerWeek <= 5) return 'BALANCED';
    return null;
  })();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    // Pack revision frequency cleanly into additionalContext so it is persisted and used by Gemini
    const packedContext = `[Revision: ${revisionFrequency}] ${additionalNotes}`.trim();

    await onSavePreferences({
      dailyStudyHours: dailyHours,
      availableDaysPerWeek: daysPerWeek,
      preferredStudyTime: preferredTime,
      learningMethods: selectedMethods.join(','),
      explanationStyle,
      practiceStyle,
      additionalContext: packedContext
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
            Learning Preferences & Pedagogy
          </h2>
          <p className="text-xs sm:text-[13px] text-muted leading-relaxed">
            Customize how Gemini structures your roadmap activities, explanation depths, exercises, and study tempo.
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

      {/* ── 1. PREFERRED LEARNING FORMAT ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              1. Preferred Learning Formats
            </h3>
            <p className="text-xs text-muted">
              Select one or multiple media formats for your daily assignments.
            </p>
          </div>
          <span className="text-[11px] font-medium text-accent bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
            {selectedMethods.length} selected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {FORMAT_OPTIONS.map(opt => {
            const isSelected = selectedMethods.includes(opt.id);
            const Icon = opt.icon;

            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => handleToggleMethod(opt.id)}
                className={`p-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-accent bg-accent-soft/70 shadow-2xs ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-slate-300 hover:bg-page/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-accent text-white'
                        : 'bg-page text-muted group-hover:text-ink border border-line'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-accent border-accent text-white'
                        : 'border-line bg-page'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`text-xs font-semibold block ${isSelected ? 'text-accent' : 'text-ink'}`}>
                    {opt.title}
                  </span>
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. LEARNING PACE PRESETS ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              2. Learning Pace
            </h3>
            <p className="text-xs text-muted">
              Choose a predefined intensity or fine-tune daily hours and days below.
            </p>
          </div>
          {currentPaceId && (
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">
              {currentPaceId} active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PACE_OPTIONS.map(pace => {
            const isSelected = currentPaceId === pace.id;
            const Icon = pace.icon;

            return (
              <button
                type="button"
                key={pace.id}
                onClick={() => handleApplyPace(pace)}
                className={`p-4 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-accent bg-accent-soft/70 shadow-2xs ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-slate-300 hover:bg-page/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isSelected ? 'bg-accent text-white' : 'bg-page text-muted border border-line'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-ink">
                      {pace.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-page border border-line text-muted">
                    {pace.badge}
                  </span>
                </div>
                <p className="text-xs text-muted mt-3 leading-relaxed">
                  {pace.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. DAILY STUDY DURATION (INTERACTIVE SLIDER) ── */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            3. Daily Study Duration & Pacing
          </h3>
          <p className="text-xs text-muted">
            Fine-tune your exact daily time commitment and study days per week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Hours Slider Card */}
          <div className="p-4 rounded-lg bg-page border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>Daily Commitment</span>
              </span>
              <span className="text-sm font-mono font-bold text-accent px-2 py-0.5 rounded bg-surface border border-accent/20">
                {dailyHours.toFixed(1)} hrs / day ({Math.round(dailyHours * 60)} mins)
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.5"
              value={dailyHours}
              onChange={(e) => {
                setHasChanges(true);
                setDailyHours(parseFloat(e.target.value));
              }}
              className="w-full accent-accent cursor-pointer h-2 bg-slate-200 rounded-lg"
              aria-label="Daily study hours"
            />

            <div className="flex justify-between text-[11px] text-muted font-mono">
              <span>0.5h (Light)</span>
              <span>2.0h (Standard)</span>
              <span>4.0h (Deep)</span>
              <span>8.0h (Full-time)</span>
            </div>
          </div>

          {/* Days Per Week Slider Card */}
          <div className="p-4 rounded-lg bg-page border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Available Days / Week</span>
              </span>
              <span className="text-sm font-mono font-bold text-accent px-2 py-0.5 rounded bg-surface border border-accent/20">
                {daysPerWeek} days / week
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={daysPerWeek}
              onChange={(e) => {
                setHasChanges(true);
                setDaysPerWeek(parseInt(e.target.value, 10));
              }}
              className="w-full accent-accent cursor-pointer h-2 bg-slate-200 rounded-lg"
              aria-label="Available days per week"
            />

            <div className="flex justify-between text-[11px] text-muted font-mono">
              <span>1 day</span>
              <span>3 days</span>
              <span>5 days (Workdays)</span>
              <span>7 days (All week)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. EXPLANATION PREFERENCE ── */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            4. Explanation Preference
          </h3>
          <p className="text-xs text-muted">
            Configure how the AI tutor introduces new architectures, syntax, and theory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPLANATION_OPTIONS.map(opt => {
            const isSelected = explanationStyle === opt.id;
            const Icon = opt.icon;

            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  setHasChanges(true);
                  setExplanationStyle(opt.id);
                }}
                className={`p-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 group ${
                  isSelected
                    ? 'border-accent bg-accent-soft/70 shadow-2xs ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-slate-300 hover:bg-page/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-accent text-white' : 'bg-page text-muted group-hover:text-ink border border-line'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-ink'}`}>
                      {opt.title}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. PRACTICE PREFERENCE ── */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            5. Practice & Hands-On Preference
          </h3>
          <p className="text-xs text-muted">
            Specify how your daily mastery exercises and milestone tasks are oriented.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRACTICE_OPTIONS.map(opt => {
            const isSelected = practiceStyle === opt.id;
            const Icon = opt.icon;

            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  setHasChanges(true);
                  setPracticeStyle(opt.id);
                }}
                className={`p-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 group ${
                  isSelected
                    ? 'border-accent bg-accent-soft/70 shadow-2xs ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-slate-300 hover:bg-page/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-accent text-white' : 'bg-page text-muted group-hover:text-ink border border-line'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-ink'}`}>
                      {opt.title}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 6. REVISION FREQUENCY ── */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            6. Revision & Spaced Repetition Cadence
          </h3>
          <p className="text-xs text-muted">
            Configure how often recap days and memory checkpoint quizzes are scheduled into your timeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {REVISION_OPTIONS.map(opt => {
            const isSelected = revisionFrequency === opt.id;

            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  setHasChanges(true);
                  setRevisionFrequency(opt.id);
                }}
                className={`p-3.5 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-accent bg-accent-soft/70 shadow-2xs ring-1 ring-accent'
                    : 'border-line bg-surface hover:border-slate-300 hover:bg-page/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      {opt.title}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    {opt.desc}
                  </p>
                </div>
                <div className="mt-3">
                  <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-page border border-line text-muted">
                    {opt.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 7. FOCUS WINDOW & ADDITIONAL AI CONTEXT ── */}
      <div className="pt-2 border-t border-line space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            7. Focus Time Window & Custom Goals
          </h3>
          <p className="text-xs text-muted">
            Specify your optimal time of day and any specific company targets or bottlenecks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {FOCUS_WINDOWS.map(win => {
            const isSelected = preferredTime === win.id;
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => {
                  setHasChanges(true);
                  setPreferredTime(win.id);
                }}
                className={`p-2.5 rounded-md border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                    : 'border-line bg-surface text-ink hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-semibold block">{win.title}</span>
                <span className="text-[10px] text-muted block mt-0.5 font-mono">{win.hours}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-semibold text-ink">
            What else should your AI Study Planner know about you?
          </label>
          <textarea
            rows={2}
            value={additionalNotes}
            onChange={(e) => {
              setHasChanges(true);
              setAdditionalNotes(e.target.value);
            }}
            placeholder="e.g. Target companies: Google & Atlassian. Weak in dynamic programming and graph DFS. Strong in relational databases."
            className="w-full p-3 rounded-md bg-page border border-line text-xs text-ink placeholder:text-muted focus:border-accent focus:bg-surface outline-none resize-y transition"
          />
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-line">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>
            {hasChanges
              ? 'Unsaved changes. Click Save to calibrate roadmap generation.'
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
