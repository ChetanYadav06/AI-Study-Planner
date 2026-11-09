import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  Sparkles,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Target,
  Brain,
  RotateCw,
  BookOpen,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Layers,
  Zap
} from 'lucide-react';
import {
  getGoals,
  getSavedRoadmaps,
  deleteSavedRoadmap,
  generateRoadmap,
  saveRoadmap,
  replaceRoadmap
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RoadmapWizard } from './RoadmapWizard';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { formatEnum } from '../../utils/formatters';

export const MyRoadmapsView = ({ onNavigateTab, initialGoal = null }) => {
  const { user } = useAuth();

  // View modes: 'LIST' | 'CREATE' | 'VIEW'
  const [viewMode, setViewMode] = useState(initialGoal ? 'CREATE' : 'LIST');
  const [goals, setGoals] = useState([]);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);

  // Active viewing/editing state
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [activeSavedId, setActiveSavedId] = useState(null);
  const [activeGoal, setActiveGoal] = useState(initialGoal);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Fetch saved roadmaps from MySQL API
  const fetchRoadmaps = async () => {
    setLoadingRoadmaps(true);
    try {
      const [roadmapsData, goalsData] = await Promise.all([
        getSavedRoadmaps().catch(() => []),
        getGoals().catch(() => [])
      ]);
      setSavedRoadmaps(Array.isArray(roadmapsData) ? roadmapsData : []);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (err) {
      console.error('Failed to load saved roadmaps:', err);
    } finally {
      setLoadingRoadmaps(false);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  // Compute aggregate stats across saved roadmaps
  const roadmapStats = useMemo(() => {
    const total = savedRoadmaps.length;
    if (total === 0) return { total: 0, avgProgress: 0, completedCount: 0 };
    const completedCount = savedRoadmaps.filter(r => (r.progressPercentage || 0) >= 100).length;
    const sumPct = savedRoadmaps.reduce((acc, r) => acc + (r.progressPercentage || 0), 0);
    return {
      total,
      avgProgress: Math.round(sumPct / total),
      completedCount
    };
  }, [savedRoadmaps]);

  // When user completes the 5-step wizard
  const handleWizardGenerate = async (payload) => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const result = await generateRoadmap(payload);

      // Save newly synthesized roadmap directly to MySQL
      let savedRecord = null;
      try {
        savedRecord = await saveRoadmap({
          goalId: payload.goalId,
          title: `${result.topic} (${result.targetDays} Days)`,
          topic: result.topic,
          skillLevel: result.skillLevel || payload.skillLevel || 'INTERMEDIATE',
          targetDays: result.targetDays,
          hoursPerDay: result.hoursPerDay,
          roadmapJson: JSON.stringify(result)
        });
      } catch (saveErr) {
        console.warn('Could not auto-save generated roadmap to backend:', saveErr);
      }

      setActiveRoadmap(result);
      setActiveSavedId(savedRecord?.id || null);
      if (payload.goalId) {
        const found = goals.find(g => String(g.id) === String(payload.goalId));
        setActiveGoal(found || null);
      } else {
        setActiveGoal(null);
      }

      setViewMode('VIEW');
      fetchRoadmaps(); // refresh list in background
    } catch (err) {
      console.error('Roadmap synthesis failed:', err);
      setGenerateError(
        err.response?.data?.message ||
        'Gemini curriculum synthesis encountered a temporary network issue. Please retry.'
      );
    } finally {
      setGenerating(false);
    }
  };

  // Open an existing saved roadmap
  const handleOpenSavedRoadmap = (saved) => {
    try {
      const parsed = JSON.parse(saved.roadmapJson);
      parsed.completedTasksJson = saved.completedTasksJson;
      parsed.completedMilestonesJson = saved.completedMilestonesJson;

      setActiveRoadmap(parsed);
      setActiveSavedId(saved.id);

      if (saved.goalId) {
        const g = goals.find(g => g.id === saved.goalId);
        setActiveGoal(g || null);
      } else {
        setActiveGoal(null);
      }

      setViewMode('VIEW');
    } catch (err) {
      console.error('Error opening saved roadmap:', err);
    }
  };

  // Delete saved roadmap
  const handleDeleteRoadmap = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this saved roadmap?')) return;

    try {
      await deleteSavedRoadmap(id);
      setSavedRoadmaps(prev => prev.filter(r => r.id !== id));
      if (activeSavedId === id) {
        setViewMode('LIST');
        setActiveRoadmap(null);
      }
    } catch (err) {
      console.error('Failed to delete roadmap:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fade-slide-up">
      {/* VIEW MODE: CREATE (WIZARD) */}
      {viewMode === 'CREATE' && (
        <RoadmapWizard
          goals={goals}
          initialGoal={activeGoal}
          onGenerate={handleWizardGenerate}
          onCancel={() => setViewMode('LIST')}
          loading={generating}
          error={generateError}
        />
      )}

      {/* VIEW MODE: VIEW (INTERACTIVE DISPLAY) */}
      {viewMode === 'VIEW' && activeRoadmap && (
        <InteractiveRoadmap
          roadmap={activeRoadmap}
          goal={activeGoal}
          savedRoadmapId={activeSavedId}
          onBack={() => setViewMode('LIST')}
          onProgressUpdate={(newPct) => {
            setSavedRoadmaps(prev => prev.map(r => r.id === activeSavedId ? { ...r, progressPercentage: newPct } : r));
          }}
          onRegenerate={async () => {
            if (!activeRoadmap) return;
            const payload = {
              topic: activeRoadmap.topic,
              skillLevel: activeRoadmap.skillLevel || 'INTERMEDIATE',
              targetDays: activeRoadmap.targetDays,
              hoursPerDay: activeGoal?.hoursPerDay || activeRoadmap.hoursPerDay || 2.0,
              description: activeGoal?.description || ''
            };
            const result = await generateRoadmap(payload);
            if (activeSavedId) {
              await replaceRoadmap(activeSavedId, {
                roadmapJson: JSON.stringify(result),
                title: `${result.topic} (${result.targetDays} Days)`,
                targetDays: result.targetDays,
                hoursPerDay: result.hoursPerDay
              });
              result.completedTasksJson = '[]';
              result.completedMilestonesJson = '[]';
              result.progressPercentage = 0;
            }
            setActiveRoadmap(result);
            fetchRoadmaps();
          }}
        />
      )}

      {/* VIEW MODE: LIST (SAVED ROADMAPS WORKSPACE) */}
      {viewMode === 'LIST' && (
        <div className="space-y-8">
          {/* Header Banner - Dark Atmospheric Styling */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 md:p-10 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Learning Studio</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  My Study Roadmaps
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
                  Day-by-day learning journeys synthesized from your topic knowledge profile and study goals.
                </p>

                {/* HUD Counters */}
                <div className="flex items-center space-x-6 mt-6 pt-5 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Roadmaps</span>
                    <div className="text-xl font-black text-white">{roadmapStats.total} Active</div>
                  </div>
                  <div className="h-7 w-px bg-slate-800" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Avg. Completion</span>
                    <div className="text-xl font-black text-cyan-400">{roadmapStats.avgProgress}%</div>
                  </div>
                  <div className="h-7 w-px bg-slate-800" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mastered</span>
                    <div className="text-xl font-black text-emerald-400">{roadmapStats.completedCount} Completed</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveGoal(null);
                  setViewMode('CREATE');
                }}
                className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all duration-200 cursor-pointer self-start md:self-center shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Roadmap</span>
              </button>
            </div>
          </div>

          {/* Roadmaps Grid */}
          {loadingRoadmaps ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse" />
              <div className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            </div>
          ) : savedRoadmaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {savedRoadmaps.map((roadmap) => {
                const isComplete = (roadmap.progressPercentage || 0) >= 100;
                return (
                  <div
                    key={roadmap.id}
                    onClick={() => handleOpenSavedRoadmap(roadmap)}
                    className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 card-hover-lift transition-all cursor-pointer flex flex-col justify-between group shadow-xs relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                            {formatEnum(roadmap.skillLevel)}
                          </span>
                          {isComplete && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoadmap(e, roadmap.id)}
                          className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition p-1.5"
                          title="Delete roadmap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-3 group-hover:text-indigo-600 transition leading-snug">
                        {roadmap.title}
                      </h3>

                      {(() => {
                        const linkedGoal = goals.find(g => g.id === roadmap.goalId);
                        const displayHours = linkedGoal?.hoursPerDay != null ? linkedGoal.hoursPerDay : roadmap.hoursPerDay;
                        return (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3">
                            <span className="flex items-center space-x-1 font-semibold text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{roadmap.targetDays} Days</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1 font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-cyan-600" />
                              <span>{displayHours}h / day</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-2">
                        <span>Milestone Progress</span>
                        <span className="font-mono font-bold text-indigo-600">
                          {roadmap.progressPercentage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${roadmap.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 sm:p-16 rounded-3xl bg-white border border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Map className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">No AI Study Roadmaps Generated Yet</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Synthesize a personalized day-by-day learning journey calibrated to your topic skills and daily availability.
                </p>
              </div>
              <button
                onClick={() => setViewMode('CREATE')}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Interactive Wizard</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
