import React, { useState } from 'react';
import { X, Target, Clock, Calendar, Check, AlertCircle, Loader2, BookOpen, Rocket, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { createGoal } from '../../services/api';
import { Button } from '../ui';

const TOPIC_PRESETS = [
  {
    title: 'Full-Stack Spring Boot 3 & React',
    subject: 'Computer Science',
    desc: 'Master full-stack architecture, REST APIs, JPA persistence, JWT security, and modern React UI.',
    targetOutcome: 'Build and deploy a production-grade full-stack SaaS platform',
    days: 30,
    hours: 3.0,
    level: 'INTERMEDIATE',
    priority: 'HIGH'
  },
  {
    title: 'Machine Learning & Generative AI',
    subject: 'Artificial Intelligence',
    desc: 'Deep dive into Python, PyTorch, LLMs, prompt engineering, and building agentic AI applications.',
    targetOutcome: 'Implement custom RAG pipelines and intelligent agent workflows',
    days: 45,
    hours: 2.5,
    level: 'INTERMEDIATE',
    priority: 'HIGH'
  },
  {
    title: 'Data Structures & Algorithms',
    subject: 'Algorithms',
    desc: 'Solve top LeetCode patterns: trees, graphs, dynamic programming, and complexity optimization.',
    targetOutcome: 'Clear tech placement and senior coding interviews',
    days: 60,
    hours: 2.0,
    level: 'BEGINNER',
    priority: 'HIGH'
  },
  {
    title: 'Cloud Architecture & DevOps',
    subject: 'Cloud Engineering',
    desc: 'Learn microservices, Docker, Kubernetes orchestration, and event-driven CI/CD architectures.',
    targetOutcome: 'Design highly available scalable cloud infrastructure',
    days: 40,
    hours: 3.5,
    level: 'ADVANCED',
    priority: 'MEDIUM'
  },
];

const SKILL_LEVELS = [
  { level: 'BEGINNER', label: 'Beginner', Icon: BookOpen, desc: 'Starting from scratch — fundamentals first' },
  { level: 'INTERMEDIATE', label: 'Intermediate', Icon: Brain, desc: 'Core concepts — ready for architecture & design' },
  { level: 'ADVANCED', label: 'Advanced', Icon: Rocket, desc: 'Production depth — edge cases & systems design' },
];

export const CreateGoalModal = ({ isOpen, onClose, onGoalCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [specificTopics, setSpecificTopics] = useState('');
  const [targetOutcome, setTargetOutcome] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [targetDays, setTargetDays] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset, idx) => {
    setTitle(preset.title);
    setDescription(preset.desc);
    setSubject(preset.subject || '');
    setTargetOutcome(preset.targetOutcome || '');
    setTargetDays(preset.days);
    setHoursPerDay(preset.hours);
    setSkillLevel(preset.level);
    setPriority(preset.priority || 'HIGH');
    setSelectedPresetIdx(idx);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a goal title.');
      return;
    }
    if (targetDays < 1 || targetDays > 365) {
      setError('Target days must be between 1 and 365.');
      return;
    }
    if (hoursPerDay < 0.5 || hoursPerDay > 24) {
      setError('Daily hours must be between 0.5 and 24.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createGoal({
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim() || undefined,
        specificTopics: specificTopics.trim() || undefined,
        targetOutcome: targetOutcome.trim() || undefined,
        priority: priority || 'MEDIUM',
        targetDays,
        hoursPerDay,
        skillLevel
      });
      onGoalCreated();
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

  const totalHours = Math.round(targetDays * hoursPerDay);
  const planTier = targetDays >= 60 ? 'Comprehensive' : targetDays >= 30 ? 'Focused' : 'Sprint';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 pt-12 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg max-w-xl w-full border border-line relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-base font-semibold text-ink">Define Learning Goal</h2>
            <p className="text-xs text-muted mt-0.5">Configure your syllabus target and daily commitment</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-muted hover:text-ink rounded-sm hover:bg-page transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <p className="text-xs font-medium text-muted mb-2">Recommended Curriculum Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {TOPIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset, idx)}
                  className={`text-left p-3 rounded-md border text-xs transition cursor-pointer ${
                    selectedPresetIdx === idx
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface hover:border-slate-300 text-ink'
                  }`}
                >
                  <p className="font-medium truncate">{preset.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {preset.days}d · {preset.hours}h/day · {preset.level}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Title */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Goal Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSelectedPresetIdx(null); }}
                placeholder="e.g. Master Java Data Structures & Algorithms"
                className="w-full px-3 py-2 rounded-md border border-line bg-surface focus:border-accent outline-none text-xs text-ink placeholder:text-muted transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Description / Key Focus Areas <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Arrays, LinkedList, Binary Search, Trees, Dynamic Programming"
                className="w-full px-3 py-2 rounded-md border border-line bg-surface focus:border-accent outline-none text-xs text-ink placeholder:text-muted transition resize-none"
              />
            </div>

            {/* Skill Level Selection */}
            <div>
              <label className="block text-xs font-medium text-ink mb-2">Target Skill Level</label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_LEVELS.map(({ level, label, Icon, desc }) => {
                  const isSel = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`p-3 rounded-md border text-left transition cursor-pointer relative ${
                        isSel
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-surface hover:border-slate-300 text-ink'
                      }`}
                    >
                      {isSel && (
                        <span className="absolute top-2.5 right-2.5">
                          <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />
                        </span>
                      )}
                      <Icon className={`w-4 h-4 mb-1.5 ${isSel ? 'text-accent' : 'text-muted'}`} />
                      <p className={`text-xs font-medium ${isSel ? 'text-accent' : 'text-ink'}`}>{label}</p>
                      <p className="text-xs text-muted mt-0.5 leading-tight">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration & Daily Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-page border border-line rounded-md p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Duration</span>
                  </span>
                  <span className="text-xs font-mono font-medium text-accent">
                    {targetDays} Days
                  </span>
                </div>
                <input
                  type="range" min={7} max={180} step={1} value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 rounded-sm cursor-pointer"
                />
                <div className="flex justify-between">
                  {[14, 30, 60, 90, 120].map((d) => (
                    <button key={d} type="button" onClick={() => setTargetDays(d)}
                      className={`text-xs px-1 py-0.5 rounded-sm cursor-pointer transition ${targetDays === d ? 'font-medium text-accent' : 'text-muted'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-page border border-line rounded-md p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>Daily Hours</span>
                  </span>
                  <span className="text-xs font-mono font-medium text-accent">
                    {hoursPerDay.toFixed(1)}h/day
                  </span>
                </div>
                <input
                  type="range" min={0.5} max={8.0} step={0.5} value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 rounded-sm cursor-pointer"
                />
                <div className="flex justify-between">
                  {[1.0, 2.0, 3.0, 4.0, 6.0].map((h) => (
                    <button key={h} type="button" onClick={() => setHoursPerDay(h)}
                      className={`text-xs px-1 py-0.5 rounded-sm cursor-pointer transition ${hoursPerDay === h ? 'font-medium text-accent' : 'text-muted'}`}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Metadata Accordion */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-line bg-page hover:bg-slate-100 text-ink text-xs font-medium transition cursor-pointer"
              >
                <span>Advanced details (subject, outcome & priority)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3.5 rounded-md border border-line bg-page space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Subject / Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Science, Web Dev"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-line bg-surface text-xs text-ink outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-line bg-surface text-xs font-medium text-ink outline-none focus:border-accent"
                      >
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">Target Outcome</label>
                    <input
                      type="text"
                      placeholder="e.g. Solve placement coding problems confidently"
                      value={targetOutcome}
                      onChange={(e) => setTargetOutcome(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-line bg-surface text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Hours Summary */}
            <div className="p-3 bg-page border border-line rounded-md flex items-center justify-between text-xs">
              <div className="text-ink">
                <span className="font-medium">Total commitment: </span>
                <span className="font-mono font-medium text-accent">{totalHours} hours</span>
                <span className="text-muted"> across {targetDays} days</span>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-surface text-accent font-medium border border-line text-xs">
                {planTier}
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={loading}
                icon={loading ? Loader2 : Target}
              >
                {loading ? 'Saving...' : 'Save Learning Goal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGoalModal;
