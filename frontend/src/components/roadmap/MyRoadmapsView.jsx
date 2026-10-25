import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  History,
  Trash2,
  Zap,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sliders,
  RotateCw,
  Plus,
  PlayCircle,
  Check,
  Target,
  Rocket,
  Brain,
  Layers,
  Award
} from 'lucide-react';
import { generateRoadmap, getGoals, createGoal, updateGoalStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { InteractiveRoadmap } from './InteractiveRoadmap';

const ROADMAP_PRESETS = [
  {
    topic: 'Full-Stack Java Spring Boot & React 19',
    description: 'Build enterprise-grade full-stack web applications with REST APIs, JWT authentication, and modern React.',
    skillLevel: 'BEGINNER',
    targetDays: 30,
    hoursPerDay: 2.0,
    priorKnowledge: 'Basic Java syntax, HTML & CSS fundamentals',
    specificTopics: 'Spring Security JWT, JPA relationships, React Hooks, Vite',
    targetOutcomes: 'Deploy production-ready full-stack application with token auth'
  },
  {
    topic: 'Data Structures & Algorithms (Java)',
    description: 'Master core DSA including Arrays, Linked Lists, Trees, Dynamic Programming, and Graph algorithms.',
    skillLevel: 'INTERMEDIATE',
    targetDays: 45,
    hoursPerDay: 2.5,
    priorKnowledge: 'Comfortable with Java loops, methods, OOP, and arrays',
    specificTopics: 'Binary Trees, BST, Heaps, Graph BFS/DFS, Dynamic Programming',
    targetOutcomes: 'Solve LeetCode Medium problems independently within 30 minutes'
  },
  {
    topic: 'Modern DevOps & Cloud with Docker & Kubernetes',
    description: 'Containerization, microservices deployment, CI/CD pipelines, and cloud native architectures.',
    skillLevel: 'BEGINNER',
    targetDays: 21,
    hoursPerDay: 1.5,
    priorKnowledge: 'Linux command line basics, Git version control',
    specificTopics: 'Multi-stage Docker builds, Kubernetes Deployments & Services, GitHub Actions',
    targetOutcomes: 'Deploy automated containerized CI/CD workflow to cloud cluster'
  },
  {
    topic: 'Python Machine Learning & Deep Learning',
    description: 'Data analysis with Pandas, supervised & unsupervised ML with Scikit-Learn, and Neural Networks.',
    skillLevel: 'BEGINNER',
    targetDays: 60,
    hoursPerDay: 2.0,
    priorKnowledge: 'Python variables, functions, and elementary linear algebra',
    specificTopics: 'Pandas EDA, Scikit-Learn models, PyTorch fundamentals, model evaluation',
    targetOutcomes: 'Train and deploy predictive models with cross-validation and metrics'
  }
];

export const MyRoadmapsView = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);

  // View mode: 'LIST' (saved roadmaps workspace), 'CREATE' (guided questionnaire), 'VIEW' (interactive roadmap display)
  const [viewMode, setViewMode] = useState('LIST');

  // Guided questionnaire step: 1 (Goal), 2 (Requirements), 3 (Schedule), 4 (Review & Generate)
  const [currentStep, setCurrentStep] = useState(1);

  // Questionnaire form state
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [description, setDescription] = useState('');
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [targetDays, setTargetDays] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(2.0);

  // Personalization inputs
  const [priorKnowledge, setPriorKnowledge] = useState('');
  const [specificTopics, setSpecificTopics] = useState('');
  const [targetOutcomes, setTargetOutcomes] = useState('');

  // Generation & Active Roadmap State
  const [loading, setLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [error, setError] = useState(null);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);

  // Saved roadmaps storage
  const historyKey = `ai_saved_roadmaps_${user?.email || 'guest'}`;
  const [savedRoadmaps, setSavedRoadmaps] = useState(() => {
    try {
      const data = localStorage.getItem(historyKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [savingAsGoal, setSavingAsGoal] = useState(false);
  const [saveGoalSuccess, setSaveGoalSuccess] = useState(false);

  // Load existing goals
  useEffect(() => {
    const fetchGoals = async () => {
      setLoadingGoals(true);
      try {
        const data = await getGoals();
        setGoals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load goals for roadmap view:', err);
      } finally {
        setLoadingGoals(false);
      }
    };
    fetchGoals();
  }, []);

  // Sync savedRoadmaps to localStorage whenever modified
  const persistRoadmaps = (updatedList) => {
    setSavedRoadmaps(updatedList);
    try {
      localStorage.setItem(historyKey, JSON.stringify(updatedList));
    } catch (err) {
      console.error('Failed to persist roadmaps', err);
    }
  };

  // When goal selection changes in Step 1
  const handleSelectGoal = (goalId) => {
    setSelectedGoalId(goalId);
    if (!goalId) {
      setCustomTopic('');
      setDescription('');
      return;
    }
    const found = goals.find((g) => String(g.id) === String(goalId));
    if (found) {
      setCustomTopic(found.title);
      setDescription(found.description || '');
      setSkillLevel(found.skillLevel || 'INTERMEDIATE');
      setTargetDays(found.targetDays || 30);
      setHoursPerDay(found.hoursPerDay || 2.0);
      setActiveGoal(found);
    }
  };

  const handleApplyPreset = (preset) => {
    setSelectedGoalId('');
    setActiveGoal(null);
    setCustomTopic(preset.topic);
    setDescription(preset.description);
    setSkillLevel(preset.skillLevel);
    setTargetDays(preset.targetDays);
    setHoursPerDay(preset.hoursPerDay);
    setPriorKnowledge(preset.priorKnowledge || '');
    setSpecificTopics(preset.specificTopics || '');
    setTargetOutcomes(preset.targetOutcomes || '');
  };

  // Step navigation in questionnaire
  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      if (!customTopic.trim()) {
        setError('Please enter a learning topic or select an active goal.');
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      setViewMode('LIST');
    }
  };

  const handleStartCreate = () => {
    setCurrentStep(1);
    setError(null);
    setViewMode('CREATE');
  };

  const handleCancelCreate = () => {
    setError(null);
    setViewMode('LIST');
  };

  // Execute roadmap generation
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    const topicToUse = customTopic.trim();
    if (!topicToUse) {
      setError('Please provide a learning topic or select a goal.');
      return;
    }

    setLoading(true);
    setError(null);
    setSaveGoalSuccess(false);

    try {
      const payload = {
        topic: topicToUse,
        description: description.trim() || 'Mastery and practical application',
        skillLevel,
        targetDays: Number(targetDays),
        hoursPerDay: Number(hoursPerDay),
        goalId: selectedGoalId ? Number(selectedGoalId) : null,
        specificTopics: specificTopics.trim() || undefined,
        targetOutcomes: targetOutcomes.trim() || undefined,
        priorKnowledge: priorKnowledge.trim() || undefined
      };

      const result = await generateRoadmap(payload);

      // Compute total tasks and milestones count
      let totalTasks = 0;
      let totalMilestones = 0;
      result.phases?.forEach(p => {
        totalTasks += p.dailyTasks?.length || 0;
        totalMilestones += p.milestones?.length || 0;
      });

      const firstPhaseName = result.phases?.[0]?.phaseTitle || result.phases?.[0]?.phase || 'Phase 1';

      const stableEntryId = result.id || `roadmap_${Date.now()}`;
      result.id = stableEntryId;

      const newEntry = {
        id: stableEntryId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        roadmap: result,
        goalId: selectedGoalId || null,
        goalTitle: activeGoal?.title || null,
        progressPercent: 0,
        completedTasksCount: 0,
        totalTasksCount: totalTasks,
        completedMilestonesCount: 0,
        totalMilestonesCount: totalMilestones,
        currentPhase: firstPhaseName
      };

      // Filter out existing roadmap with exact same topic if desired
      const filtered = savedRoadmaps.filter((item) => item.roadmap.topic !== result.topic);
      const updated = [newEntry, ...filtered];
      persistRoadmaps(updated);

      setActiveRoadmap(result);
      setViewMode('VIEW');

      // If user had selected a goal and it was NOT_STARTED, move to IN_PROGRESS
      if (activeGoal && activeGoal.status === 'NOT_STARTED') {
        try {
          const updatedGoal = await updateGoalStatus(activeGoal.id, {
            status: 'IN_PROGRESS',
            progressPercentage: activeGoal.progressPercentage
          });
          setActiveGoal(updatedGoal);
          setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
        } catch (_) {}
      }
    } catch (err) {
      console.error('AI Roadmap generation error:', err);
      setError(
        err?.response?.data?.message ||
        'Failed to generate roadmap. Please check the backend connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Re-generate existing roadmap
  const handleRegenerateExisting = async (entry, e) => {
    if (e) e.stopPropagation();
    setRegeneratingId(entry.id);
    try {
      const payload = {
        topic: entry.roadmap.topic,
        description: entry.roadmap.overview || '',
        skillLevel: entry.roadmap.skillLevel,
        targetDays: entry.roadmap.targetDays,
        hoursPerDay: entry.roadmap.hoursPerDay,
        goalId: entry.goalId || null
      };
      const result = await generateRoadmap(payload);
      result.id = entry.id; // Keep stable ID so progress is preserved

      const updated = savedRoadmaps.map(item => {
        if (item.id === entry.id) {
          return {
            ...item,
            roadmap: result,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      persistRoadmaps(updated);

      if (activeRoadmap?.id === entry.id) {
        setActiveRoadmap(result);
      }
    } catch (err) {
      console.error('Failed to regenerate roadmap', err);
      alert('Could not regenerate roadmap: ' + (err?.response?.data?.message || err.message));
    } finally {
      setRegeneratingId(null);
    }
  };

  // Open an existing saved roadmap (DOES NOT generate a new one)
  const handleOpenSavedRoadmap = (entry) => {
    setActiveRoadmap(entry.roadmap);
    if (entry.goalId) {
      const match = goals.find((g) => String(g.id) === String(entry.goalId));
      setActiveGoal(match || null);
    } else {
      setActiveGoal(null);
    }
    setViewMode('VIEW');
  };

  const handleDeleteHistory = (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved roadmap?')) return;
    const updated = savedRoadmaps.filter((item) => item.id !== id);
    persistRoadmaps(updated);
    if (activeRoadmap?.id === id) {
      setActiveRoadmap(null);
      setViewMode('LIST');
    }
  };

  // Callback from InteractiveRoadmap when task/milestone progress changes
  const handleProgressUpdate = ({ roadmapId, progressPercent, completedTasksCount, totalTasksCount, completedMilestonesCount, totalMilestonesCount, currentPhase }) => {
    const updated = savedRoadmaps.map(entry => {
      if (entry.id === roadmapId || entry.roadmap?.id === roadmapId || entry.roadmap?.topic === activeRoadmap?.topic) {
        return {
          ...entry,
          progressPercent,
          completedTasksCount,
          totalTasksCount,
          completedMilestonesCount,
          totalMilestonesCount,
          currentPhase: currentPhase || entry.currentPhase,
          updatedAt: new Date().toISOString()
        };
      }
      return entry;
    });
    persistRoadmaps(updated);
  };

  const handleSaveAsGoal = async () => {
    if (!activeRoadmap) return;
    setSavingAsGoal(true);
    try {
      const created = await createGoal({
        title: activeRoadmap.topic,
        description: activeRoadmap.overview || description || 'AI-generated curriculum roadmap',
        targetDays: activeRoadmap.targetDays,
        hoursPerDay: activeRoadmap.hoursPerDay,
        skillLevel: activeRoadmap.skillLevel
      });
      setActiveGoal(created);
      setGoals((prev) => [created, ...prev]);
      setSaveGoalSuccess(true);
    } catch (err) {
      console.error('Failed to save roadmap as goal:', err);
      alert('Could not save goal: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSavingAsGoal(false);
    }
  };

  const handleSyncGoalProgress = async (goalId, newProgress) => {
    const updated = await updateGoalStatus(goalId, {
      progressPercentage: newProgress,
      status: newProgress === 100 ? 'COMPLETED' : newProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
    });
    setActiveGoal(updated);
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const totalCalculatedHours = Math.round(targetDays * hoursPerDay);

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getSkillBadge = (level) => {
    const map = {
      BEGINNER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      INTERMEDIATE: 'bg-blue-50 text-blue-700 border-blue-200',
      ADVANCED: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return map[level] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                AI Roadmap Studio
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Synthesize customized, day-by-day learning curricula powered by Google Gemini
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Gemini AI Engine Active</span>
          </span>

          {viewMode !== 'CREATE' && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Roadmap</span>
            </button>
          )}
        </div>
      </div>

      {/* ══ VIEW MODE: ACTIVE ROADMAP DISPLAY ══ */}
      {viewMode === 'VIEW' && activeRoadmap && (
        <div className="space-y-4">
          {/* Optional Convert to Goal Banner */}
          {!activeGoal && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  Track this roadmap as an active Learning Goal?
                </h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Save to your study planner dashboard to track daily progress & streaks.
                </p>
              </div>
              <button
                onClick={handleSaveAsGoal}
                disabled={savingAsGoal || saveGoalSuccess}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm cursor-pointer shrink-0 disabled:opacity-70 flex items-center space-x-1.5"
              >
                {saveGoalSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved to Goals!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{savingAsGoal ? 'Saving...' : 'Add to My Goals'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Interactive Roadmap Component */}
          <InteractiveRoadmap
            roadmap={activeRoadmap}
            goal={activeGoal}
            onBack={() => setViewMode('LIST')}
            onSyncGoalProgress={handleSyncGoalProgress}
            onRegenerate={() => handleRegenerateExisting({ id: activeRoadmap.id, roadmap: activeRoadmap })}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>
      )}

      {/* ══ CREATE MODE: GUIDED QUESTIONNAIRE ══ */}
      {viewMode === 'CREATE' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-3xl mx-auto space-y-6">
          {/* Stepper Progress Bar */}
          <div className="space-y-2 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Step {currentStep} of 4: {
                currentStep === 1 ? 'Learning Goal' :
                currentStep === 2 ? 'Requirements & Outcomes' :
                currentStep === 3 ? 'Study Schedule' : 'Review & Generate'
              }</span>
              <span className="text-blue-600">{Math.round((currentStep / 4) * 100)}% Completed</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: LEARNING GOAL ── */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">What do you want to learn?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter any programming language, framework, technical subject, or select an existing goal.
                </p>
              </div>

              {/* Option to select active goal */}
              {goals.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Choose an existing learning goal
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => handleSelectGoal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  >
                    <option value="">-- Or enter custom topic below --</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.targetDays} days • {g.hoursPerDay}h/day)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Topic Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Learning Goal or Subject Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master React 19 & Next.js, Data Structures in Java, Cloud Architecture"
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    if (selectedGoalId) setSelectedGoalId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Objective or Focus Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on practical full-stack projects, design patterns, and deployment."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Presets Grid */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Popular Curriculum Presets (Click to autofill)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROADMAP_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 block truncate">
                        {p.topic}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {p.targetDays} days • {p.hoursPerDay}h/day • {p.skillLevel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: REQUIREMENTS & PERSONALIZATION ── */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Define your skill level & focus areas</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gemini will calibrate depth and pacing based on your current knowledge.
                </p>
              </div>

              {/* Skill Level Selection Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Current Skill Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'BEGINNER',
                      label: 'Beginner',
                      Icon: BookOpen,
                      desc: 'Starting from scratch. Foundational concepts & guided exercises.'
                    },
                    {
                      id: 'INTERMEDIATE',
                      label: 'Intermediate',
                      Icon: Brain,
                      desc: 'Knows basics. Ready for architecture, best practices, & integration.'
                    },
                    {
                      id: 'ADVANCED',
                      label: 'Advanced',
                      Icon: Rocket,
                      desc: 'Deep mastery. Performance tuning, internal mechanisms, & edge cases.'
                    }
                  ].map((lvl) => {
                    const isSelected = skillLevel === lvl.id;
                    const Icon = lvl.Icon;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSkillLevel(lvl.id)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                            {lvl.label}
                          </span>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{lvl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personalization Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prior Knowledge & Background (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 year Java experience, knows basic OOP and relational databases"
                    value={priorKnowledge}
                    onChange={(e) => setPriorKnowledge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Focus Topics or Key Areas (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Focus on Spring Security & JWT, skip XML configuration"
                    value={specificTopics}
                    onChange={(e) => setSpecificTopics(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Outcomes & Deliverables (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Build and deploy a complete production-grade full-stack project"
                    value={targetOutcomes}
                    onChange={(e) => setTargetOutcomes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: STUDY SCHEDULE ── */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Set your study schedule</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify how many days you want to dedicate and your daily study hours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Target Days Control */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Target Duration</span>
                    </span>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      {targetDays} Days
                    </span>
                  </div>

                  <input
                    type="range"
                    min={7}
                    max={120}
                    step={1}
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-slate-500">
                    {[14, 21, 30, 45, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setTargetDays(d)}
                        className={`px-2 py-0.5 rounded hover:bg-slate-200 transition ${
                          targetDays === d ? 'font-bold text-blue-600 bg-white shadow-2xs' : ''
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Hours Control */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Daily Study Time</span>
                    </span>
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
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
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-slate-500">
                    {[1.0, 1.5, 2.0, 3.0, 4.0, 6.0].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHoursPerDay(h)}
                        className={`px-2 py-0.5 rounded hover:bg-slate-200 transition ${
                          hoursPerDay === h ? 'font-bold text-indigo-600 bg-white shadow-2xs' : ''
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Live Calculation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    Total Available Study Budget:
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    <span className="text-blue-700 text-base">{targetDays} Days</span> × {hoursPerDay} hrs/day = <span className="text-indigo-700 text-base">{totalCalculatedHours} Total Study Hours</span>
                  </p>
                </div>

                <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs shrink-0">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{totalCalculatedHours < 20 ? 'Intensive Focus' : totalCalculatedHours <= 60 ? 'Comprehensive Plan' : 'Mastery Track'}</span>
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 4: REVIEW & GENERATE ── */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review your roadmap parameters</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your curriculum details before Google Gemini generates your phased learning roadmap.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3.5 text-xs">
                <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subject Topic</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">{customTopic}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getSkillBadge(skillLevel)}`}>
                    {skillLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-1">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Duration</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{targetDays} Days</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Daily Study Time</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{hoursPerDay} hrs/day</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Total Budget</span>
                    <span className="font-bold text-blue-700 mt-0.5 block">{totalCalculatedHours} Planned Hours</span>
                  </div>
                </div>

                {(specificTopics || targetOutcomes || priorKnowledge) && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    {specificTopics && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">Focus Topics: </span>
                        <span className="text-slate-800">{specificTopics}</span>
                      </div>
                    )}
                    {targetOutcomes && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500">Target Outcomes: </span>
                        <span className="text-slate-800">{targetOutcomes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notice */}
              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                Gemini will synthesize structured weekly phases, ordered day-by-day study sessions, actionable milestones, practical exercises, and authoritative learning resources.
              </p>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 text-xs font-semibold transition cursor-pointer"
              >
                Exit
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate My Roadmap</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ LIST MODE: SAVED ROADMAPS WORKSPACE ══ */}
      {viewMode === 'LIST' && (
        <div className="space-y-6">
          {savedRoadmaps.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    My Saved Roadmaps ({savedRoadmaps.length})
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Click any roadmap to resume your learning session
                </span>
              </div>

              {/* Grid of Saved Roadmap Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedRoadmaps.map((entry) => {
                  const r = entry.roadmap;
                  const isRegenerating = regeneratingId === entry.id;
                  const progress = entry.progressPercent ?? 0;
                  const completedTasks = entry.completedTasksCount ?? 0;
                  const totalTasks = entry.totalTasksCount ?? (r.phases?.reduce((acc, p) => acc + (p.dailyTasks?.length || 0), 0) || 0);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleOpenSavedRoadmap(entry)}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group space-y-4"
                    >
                      {/* Card Top: Badges & Title */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getSkillBadge(r.skillLevel)}`}>
                            {r.skillLevel || 'INTERMEDIATE'}
                          </span>

                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(entry.updatedAt || entry.createdAt)}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {r.topic}
                          </h3>
                          {entry.goalTitle && (
                            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5 truncate flex items-center space-x-1">
                              <Target className="w-3 h-3 shrink-0" />
                              <span>Goal: {entry.goalTitle}</span>
                            </p>
                          )}
                          {entry.currentPhase && (
                            <p className="text-[11px] text-slate-500 mt-1 truncate">
                              Current: <strong className="text-slate-700">{entry.currentPhase}</strong>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Middle: Key Stats */}
                      <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                        <div className="grid grid-cols-3 gap-2 text-slate-600 text-center">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                            <span className="font-bold text-slate-800 mt-0.5 block">{r.targetDays}d</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Daily</span>
                            <span className="font-bold text-slate-800 mt-0.5 block">{r.hoursPerDay}h</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-medium">Total Hrs</span>
                            <span className="font-bold text-blue-700 mt-0.5 block">
                              {r.totalStudyHours || Math.round(r.targetDays * r.hoursPerDay)}h
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 font-medium">
                              {totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks completed` : 'Completion'}
                            </span>
                            <span className="font-bold text-blue-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSavedRoadmap(entry);
                          }}
                          className="inline-flex items-center space-x-1 text-blue-600 font-bold hover:text-blue-800 transition"
                        >
                          <span>{progress > 0 ? 'Continue Learning' : 'Open Roadmap'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => handleRegenerateExisting(entry, e)}
                            disabled={isRegenerating}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                            title="Regenerate roadmap with AI"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-blue-600' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHistory(entry.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                            title="Delete saved roadmap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── EMPTY STATE ── */
            <div className="bg-white rounded-3xl border border-slate-200 p-10 md:p-14 text-center shadow-xs max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Map className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  No Saved Roadmaps Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Generate your first personalized AI study plan. Gemini AI will break your subject into weekly milestones, day-by-day study tasks, and verified resources.
                </p>
              </div>

              <div>
                <button
                  onClick={handleStartCreate}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create My First Roadmap</span>
                </button>
              </div>

              {/* Starter presets */}
              <div className="pt-6 border-t border-slate-100 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Or pick a popular starter track
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROADMAP_PRESETS.slice(0, 2).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleApplyPreset(p);
                        setViewMode('CREATE');
                        setCurrentStep(1);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition text-xs font-semibold text-slate-700 group cursor-pointer"
                    >
                      <span className="block truncate group-hover:text-blue-600">{p.topic}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{p.targetDays} days • {p.hoursPerDay}h/day</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyRoadmapsView;
