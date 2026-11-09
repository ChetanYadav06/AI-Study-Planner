import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, Target, CheckCircle2, Clock, BookOpen, Layers, BarChart2 } from 'lucide-react';
import { getGoals, getDashboardStats, getTopicKnowledge } from '../../services/api';
import { computeGoalStats } from '../../utils/goalStats';

export const ProgressView = () => {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getGoals().catch(() => []),
      getDashboardStats().catch(() => null),
      getTopicKnowledge().catch(() => [])
    ])
      .then(([goalsData, statsData, skillsData]) => {
        setGoals(Array.isArray(goalsData) ? goalsData : []);
        setStats(statsData);
        setSkills(Array.isArray(skillsData) ? skillsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const goalStats = useMemo(() => computeGoalStats(goals), [goals]);
  const totalGoals = goalStats.totalGoals;
  const completedGoals = goalStats.completedGoals;
  const inProgressGoals = goalStats.inProgressGoals;
  const overallGoalProgress = totalGoals > 0
    ? Math.round(goals.reduce((acc, g) => acc + (g.progressPercentage || 0), 0) / totalGoals)
    : 0;

  // Skills mastery breakdown
  const masteredSkills = skills.filter(s => s.knowledgeLevel === 'MASTERED');
  const intermediateSkills = skills.filter(s => s.knowledgeLevel === 'INTERMEDIATE');
  const beginnerSkills = skills.filter(s => s.knowledgeLevel === 'BEGINNER');
  const notLearnedSkills = skills.filter(s => s.knowledgeLevel === 'NOT_LEARNED');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-slide">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
            <span>Academic Performance Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Learning Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Live analytics derived from your verified goals, daily milestones, and topic knowledge matrix.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
          <div className="text-3xl font-black text-teal-600 mt-1 font-mono">{overallGoalProgress}%</div>
          <p className="text-xs text-slate-500 mt-0.5">Average goal completion</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mastered Goals</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{completedGoals}</div>
          <p className="text-xs text-slate-500 mt-0.5">Fully completed curricula</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
          <div className="text-3xl font-black text-indigo-600 mt-1">{inProgressGoals}</div>
          <p className="text-xs text-slate-500 mt-0.5">Goals actively in progress</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mastered Topics</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{masteredSkills.length}</div>
          <p className="text-xs text-slate-500 mt-0.5">Verified skill masteries</p>
        </div>
      </div>

      {/* Skills Mastery Matrix Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Topic Knowledge Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Summary of topics from your learning profile</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{skills.length} Total Topics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Mastered</span>
            <div className="text-2xl font-black text-emerald-900 mt-1">{masteredSkills.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
            <span className="text-[10px] font-bold text-teal-700 uppercase">Intermediate</span>
            <div className="text-2xl font-black text-teal-900 mt-1">{intermediateSkills.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Beginner</span>
            <div className="text-2xl font-black text-blue-900 mt-1">{beginnerSkills.length}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Not Learned</span>
            <div className="text-2xl font-black text-slate-700 mt-1">{notLearnedSkills.length}</div>
          </div>
        </div>
      </div>

      {/* Goal Progress Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Target className="w-4 h-4 text-teal-600" />
            <span>Active Goal Trajectories</span>
          </h2>
        </div>

        {goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{g.title}</h4>
                  <span className="text-xs font-mono font-bold text-teal-700">{g.progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${g.progressPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">No goals tracked yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProgressView;

