import React, { useState } from 'react';
import { X, Target, Clock, Calendar, Sparkles, Check, AlertCircle, Loader2, BookOpen, Rocket, Brain } from 'lucide-react';
import { createGoal } from '../../services/api';

const TOPIC_PRESETS = [
  {
    title: 'Full-Stack Spring Boot 3 & React',
    desc: 'Master full-stack architecture, REST APIs, JPA persistence, JWT security, and modern React 19 UI.',
    days: 30,
    hours: 3.0,
    level: 'INTERMEDIATE',
  },
  {
    title: 'Machine Learning & Generative AI',
    desc: 'Deep dive into Python, PyTorch, LLMs, prompt engineering, and building agentic AI applications.',
    days: 45,
    hours: 2.5,
    level: 'INTERMEDIATE',
  },
  {
    title: 'Data Structures & Algorithms',
    desc: 'Solve top LeetCode patterns: trees, graphs, dynamic programming, and complexity optimization.',
    days: 60,
    hours: 2.0,
    level: 'BEGINNER',
  },
  {
    title: 'Cloud Architecture & DevOps',
    desc: 'Learn microservices, Docker, Kubernetes orchestration, and event-driven CI/CD architectures.',
    days: 40,
    hours: 3.5,
    level: 'ADVANCED',
  },
];

const SKILL_LEVELS = [
  { level: 'BEGINNER', label: 'Beginner', Icon: BookOpen, desc: 'Starting from scratch — fundamentals first', active: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300/30', inactive: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40', iconActive: 'text-emerald-600', labelActive: 'text-emerald-800' },
  { level: 'INTERMEDIATE', label: 'Intermediate', Icon: Brain, desc: 'Core concepts — ready for architecture & design', active: 'border-blue-500 bg-blue-50 ring-1 ring-blue-300/30', inactive: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40', iconActive: 'text-blue-600', labelActive: 'text-blue-800' },
  { level: 'ADVANCED', label: 'Advanced', Icon: Rocket, desc: 'Production depth — edge cases & systems design', active: 'border-purple-500 bg-purple-50 ring-1 ring-purple-300/30', inactive: 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40', iconActive: 'text-purple-600', labelActive: 'text-purple-800' },
];

export const CreateGoalModal = ({ isOpen, onClose, onGoalCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset, idx) => {
    setTitle(preset.title);
    setDescription(preset.desc);
    setTargetDays(preset.days);
    setHoursPerDay(preset.hours);
    setSkillLevel(preset.level);
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
      await createGoal({ title: title.trim(), description: description.trim(), targetDays, hoursPerDay, skillLevel });
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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 relative"
        style={{ animation: 'modalFade 0.18s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Define Learning Goal</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Set your target subject and study schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Quick Presets */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Popular Presets — click to autofill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TOPIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset, idx)}
                  className={`text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                    selectedPresetIdx === idx
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <p className={`font-semibold truncate ${selectedPresetIdx === idx ? 'text-blue-700' : 'text-slate-800'}`}>
                    {preset.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {preset.days}d · {preset.hours}h/day · {preset.level.charAt(0) + preset.level.slice(1).toLowerCase()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Goal Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Goal Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSelectedPresetIdx(null); }}
                placeholder="e.g. Master Spring Boot 3 & Microservices"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Key Focus Areas <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Spring Security, Hibernate ORM, REST principles, production deployment"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition resize-none"
              />
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Current Skill Level</label>
              <div className="grid grid-cols-3 gap-2.5">
                {SKILL_LEVELS.map(({ level, label, Icon, desc, active, inactive, iconActive, labelActive }) => {
                  const isSel = skillLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${isSel ? active : inactive}`}
                    >
                      {isSel && (
                        <span className="absolute top-2 right-2">
                          <Check className={`w-3 h-3 ${iconActive}`} />
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
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Duration
                  </span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">{targetDays} Days</span>
                </div>
                <input
                  type="range" min={7} max={180} step={1} value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  {[14, 30, 60, 90, 120].map((d) => (
                    <button key={d} type="button" onClick={() => setTargetDays(d)}
                      className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition hover:bg-slate-200 ${targetDays === d ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Daily Commitment
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">{hoursPerDay.toFixed(1)}h/day</span>
                </div>
                <input
                  type="range" min={0.5} max={8.0} step={0.5} value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                  {[1.0, 2.0, 3.0, 4.0, 6.0].map((h) => (
                    <button key={h} type="button" onClick={() => setHoursPerDay(h)}
                      className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition hover:bg-slate-200 ${hoursPerDay === h ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Hours Bar */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-between">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Total Study Time: </span>
                <span className="font-extrabold text-blue-700">{totalHours} hours</span>
                <span className="text-slate-500"> across {targetDays} days</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white text-indigo-700 font-semibold border border-indigo-200 text-[10px] uppercase tracking-wider shrink-0">
                {planTier}
              </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100">
              <button
                type="button" onClick={onClose} disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      <style>{`
        @keyframes modalFade {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CreateGoalModal;
