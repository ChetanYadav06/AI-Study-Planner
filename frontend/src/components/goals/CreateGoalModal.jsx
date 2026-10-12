import React, { useState } from 'react';
import { X, Target, Clock, Calendar, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
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
    title: 'Data Structures & Algorithms for Coding Interviews',
    desc: 'Solve top LeetCode patterns including trees, graphs, dynamic programming, and complexity optimization.',
    days: 60,
    hours: 2.0,
    level: 'BEGINNER',
  },
  {
    title: 'Cloud Architecture & Distributed Systems',
    desc: 'Learn microservices patterns, Docker containerization, Kubernetes orchestration, and event-driven queues.',
    days: 40,
    hours: 3.5,
    level: 'ADVANCED',
  },
];

export const CreateGoalModal = ({ isOpen, onClose, onGoalCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setTitle(preset.title);
    setDescription(preset.desc);
    setTargetDays(preset.days);
    setHoursPerDay(preset.hours);
    setSkillLevel(preset.level);
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
      const payload = {
        title: title.trim(),
        description: description.trim(),
        targetDays,
        hoursPerDay,
        skillLevel,
      };
      await createGoal(payload);
      onGoalCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError(
        err.response?.data?.errors?.title ||
        err.response?.data?.message ||
        'Failed to create learning goal. Please check inputs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const totalCalculatedHours = Math.round(targetDays * hoursPerDay);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Define New Learning Goal</h2>
              <p className="text-xs text-slate-500">Configure your target subject, daily study schedule, and duration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Presets */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Popular Roadmap Presets (Click to autofill):</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 transition"
              >
                {preset.title.split(' ')[0]} {preset.title.split(' ')[1]} ({preset.days}d)
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Goal / Subject Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Spring Boot 3 & Microservices, Data Science with Python"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm text-slate-900 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Key Focus Areas (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on Spring Security, Hibernate ORM, REST principles, and production deployment."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm text-slate-900 transition resize-none"
            />
          </div>

          {/* Duration & Daily Hours Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Days */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Target Duration</span>
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                  {targetDays} Days
                </span>
              </div>
              <input
                type="range"
                min={7}
                max={180}
                step={1}
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                {[14, 30, 60, 90, 120].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTargetDays(d)}
                    className={`px-1.5 py-0.5 rounded hover:bg-slate-200 ${targetDays === d ? 'font-bold text-blue-600 underline' : ''}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Hours */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Daily Commitment</span>
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  {hoursPerDay.toFixed(1)} hrs/day
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={8.0}
                step={0.5}
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                {[1.0, 2.0, 3.0, 4.0, 6.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHoursPerDay(h)}
                    className={`px-1.5 py-0.5 rounded hover:bg-slate-200 ${hoursPerDay === h ? 'font-bold text-indigo-600 underline' : ''}`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Skill Level Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Current Skill Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'BEGINNER', label: 'Beginner', desc: 'Starting from basics' },
                { level: 'INTERMEDIATE', label: 'Intermediate', desc: 'Core knowledge' },
                { level: 'ADVANCED', label: 'Advanced', desc: 'In-depth mastery' },
              ].map((item) => {
                const isSelected = skillLevel === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setSkillLevel(item.level)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                        {item.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projected Summary Bar */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Projected Total Study Time: </span>
              <span className="font-extrabold text-blue-700">{totalCalculatedHours} Hours</span>
              <span className="text-slate-500"> across {targetDays} days</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-semibold border border-indigo-200 text-[10px]">
              Phase 3 Live DB
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Goal to Database...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Save Learning Goal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
