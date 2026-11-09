import React, { useState } from 'react';
import { X, Target, Clock, Calendar, Sparkles, Check, AlertCircle, Loader2, BookOpen, Rocket, Brain, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { createGoal } from '../../services/api';

const TOPIC_PRESETS = [
  {
    title: 'Full-Stack Spring Boot 3 & React',
    subject: 'Computer Science',
    desc: 'Master full-stack architecture, REST APIs, JPA persistence, JWT security, and modern React 19 UI.',
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
  { level: 'BEGINNER', label: 'Beginner', Icon: BookOpen, desc: 'Starting from scratch — fundamentals first', active: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300/30', inactive: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40', iconActive: 'text-emerald-600', labelActive: 'text-emerald-800' },
  { level: 'INTERMEDIATE', label: 'Intermediate', Icon: Brain, desc: 'Core concepts — ready for architecture & design', active: 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300/30', inactive: 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40', iconActive: 'text-indigo-600', labelActive: 'text-indigo-800' },
  { level: 'ADVANCED', label: 'Advanced', Icon: Rocket, desc: 'Production depth — edge cases & systems design', active: 'border-violet-500 bg-violet-50 ring-1 ring-violet-300/30', inactive: 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40', iconActive: 'text-violet-600', labelActive: 'text-violet-800' },
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 pt-12 animate-fade-slide-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Define Learning Goal</h2>
              <p className="text-xs text-slate-300 mt-0.5">Configure your syllabus target and daily commitment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Recommended Curriculum Presets</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TOPIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset, idx)}
                  className={`text-left p-3 rounded-2xl border text-xs transition cursor-pointer ${
                    selectedPresetIdx === idx
                      ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950'
                      : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-800'
                  }`}
                >
                  <p className="font-bold truncate">{preset.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {preset.days}d · {preset.hours}h/day · {preset.level}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Goal Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSelectedPresetIdx(null); }}
                placeholder="e.g. Master Java Data Structures & Algorithms"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Description / Key Focus Areas <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Arrays, LinkedList, Binary Search, Trees, Dynamic Programming"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition resize-none"
              />
            </div>

            {/* Skill Level Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Target Skill Level</label>
              <div className="grid grid-cols-3 gap-2.5">
                {SKILL_LEVELS.map(({ level, label, Icon, desc, active, inactive, iconActive, labelActive }) => {
                  const isSel = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${isSel ? active : inactive}`}
                    >
                      {isSel && (
                        <span className="absolute top-2.5 right-2.5">
                          <Check className={`w-3.5 h-3.5 ${iconActive} stroke-[3]`} />
                        </span>
                      )}
                      <Icon className={`w-4 h-4 mb-1.5 ${isSel ? iconActive : 'text-slate-400'}`} />
                      <p className={`text-[11px] font-bold ${isSel ? labelActive : 'text-slate-700'}`}>{label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration & Daily Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Duration</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {targetDays} Days
                  </span>
                </div>
                <input
                  type="range" min={7} max={180} step={1} value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between">
                  {[14, 30, 60, 90, 120].map((d) => (
                    <button key={d} type="button" onClick={() => setTargetDays(d)}
                      className={`text-[10px] px-1 py-0.5 rounded cursor-pointer transition ${targetDays === d ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Daily Hours</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-md">
                    {hoursPerDay.toFixed(1)}h/day
                  </span>
                </div>
                <input
                  type="range" min={0.5} max={8.0} step={0.5} value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-cyan-600 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between">
                  {[1.0, 2.0, 3.0, 4.0, 6.0].map((h) => (
                    <button key={h} type="button" onClick={() => setHoursPerDay(h)}
                      className={`text-[10px] px-1 py-0.5 rounded cursor-pointer transition ${hoursPerDay === h ? 'font-bold text-cyan-600' : 'text-slate-400'}`}>
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
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <span>Advanced Details (Subject, Outcome & Priority)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Subject / Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Science, Web Dev"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                      >
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Outcome</label>
                    <input
                      type="text"
                      placeholder="e.g. Solve placement coding problems confidently"
                      value={targetOutcome}
                      onChange={(e) => setTargetOutcome(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total Hours Summary */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900">Total Commitment: </span>
                <span className="font-mono font-extrabold text-indigo-700">{totalHours} hours</span>
                <span className="text-slate-500"> across {targetDays} days</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-indigo-700 font-bold border border-indigo-200 text-[10px] uppercase tracking-wider shrink-0">
                {planTier}
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button" onClick={onClose} disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></>
                ) : (
                  <><Target className="w-3.5 h-3.5" /><span>Save Learning Goal</span></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGoalModal;
