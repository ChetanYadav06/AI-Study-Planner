import React from 'react';
import {
  BookOpen,
  Target,
  Clock,
  Sparkles,
  LogIn,
  UserPlus,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export const StudentPortalLanding = ({ onOpenAuth }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Student Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Study Planner • Student Portal</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Plan, Track, and Achieve Your Learning Goals
          </h1>

          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Create structured study targets, calculate daily study hour commitments, and follow your personalized learning journey with clarity.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Student Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        <div className="w-full md:w-80 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Personalized Learning</p>
              <p className="text-[11px] text-slate-500">Student Account Isolation</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-200/80">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Private learning goals per student</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Custom daily focus targets</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Real-time progress percentage tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Custom Learning Goals</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Specify target days, daily study hours, and skill levels (Beginner, Intermediate, or Advanced) for any subject you want to master.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Daily Study Targets</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Consolidate your daily study commitment across all your active learning goals to build a sustainable, balanced routine.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Progress Tracking</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Update your milestones with quick step increments and keep a chronological log of all your learning accomplishments.
          </p>
        </div>
      </div>
    </div>
  );
};
