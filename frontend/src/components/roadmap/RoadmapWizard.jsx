import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Target,
  Brain,
  Clock,
  Calendar,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  BookOpen,
  Code2,
  Database,
  Cpu,
  GraduationCap,
  Plus,
  Trash2
} from 'lucide-react';
import { getStudentProfile, getSkills, bulkUpsertSkills } from '../../services/api';
import { formatEnum } from '../../utils/formatters';

const PRESET_TRACKS = [
  {
    topic: 'Java Data Structures & Algorithms',
    category: 'Placement Mastery',
    icon: Code2,
    gradient: 'from-indigo-600 to-violet-600',
    description: 'Arrays, LinkedLists, Trees, DP, and Graph algorithms with Java interview problem-solving.',
    defaultDays: 45,
    defaultHours: 2.5,
    specificTopics: 'Arrays, ArrayList, LinkedList, Stacks & Queues, Binary Search, Trees, Dynamic Programming',
    targetOutcomes: 'Confidently solve Medium/Hard coding interview problems on LeetCode within 30 minutes',
    topics: ['Arrays', 'ArrayList', 'LinkedList', 'Stack & Queue', 'Binary Search', 'Binary Trees', 'Dynamic Programming']
  },
  {
    topic: 'Full-Stack Spring Boot & React 19',
    category: 'Enterprise Web',
    icon: Layers,
    gradient: 'from-blue-600 to-cyan-600',
    description: 'Enterprise REST APIs, Spring Security JWT, JPA Hibernate, and modern React 19 architecture.',
    defaultDays: 30,
    defaultHours: 2.0,
    specificTopics: 'Spring Security JWT, REST APIs, JPA Relationships, React Hooks, Tailwind CSS v4, Vite',
    targetOutcomes: 'Build and deploy full-stack production-ready applications with authenticated REST APIs',
    topics: ['Java Fundamentals', 'Spring Boot Core', 'REST API Design', 'Spring Security JWT', 'React 19 Components', 'Tailwind CSS']
  },
  {
    topic: 'SQL & Database Engineering for Interviews',
    category: 'Backend Core',
    icon: Database,
    gradient: 'from-violet-600 to-purple-600',
    description: 'SQL Joins, window functions, indexing, normalization, and high-performance query optimization.',
    defaultDays: 21,
    defaultHours: 1.5,
    specificTopics: 'SQL Joins, Subqueries, Window Functions, Indexing, Transactions & ACID, Database Design',
    targetOutcomes: 'Crack database technical rounds and optimize complex SQL queries effortlessly',
    topics: ['Basic SQL Queries', 'SQL Joins', 'Aggregations & Group By', 'Subqueries', 'Window Functions', 'Indexing & EXPLAIN']
  },
  {
    topic: 'Machine Learning Fundamentals with Python',
    category: 'AI & Data',
    icon: Cpu,
    gradient: 'from-teal-600 to-emerald-600',
    description: 'Pandas preprocessing, NumPy, supervised ML regression & classification, and model metrics.',
    defaultDays: 30,
    defaultHours: 2.0,
    specificTopics: 'Pandas, NumPy, Scikit-Learn Regression & Classification, Model Evaluation, Feature Engineering',
    targetOutcomes: 'Preprocess real-world tabular data and build high-accuracy predictive ML models',
    topics: ['Python Data Foundations', 'NumPy & Linear Math', 'Pandas Preprocessing', 'Supervised Learning', 'Model Evaluation & ROC']
  }
];

const KNOWLEDGE_CHOICES = [
  { level: 'MASTERED', label: 'Mastered', badge: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { level: 'INTERMEDIATE', label: 'Familiar', badge: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  { level: 'BEGINNER', label: 'Beginner', badge: 'bg-sky-50 text-sky-700 border-sky-300' },
  { level: 'NOT_LEARNED', label: 'Not Learned', badge: 'bg-slate-100 text-slate-700 border-slate-300' }
];

const SYNTHESIS_STAGES = [
  'Calibrating prerequisite knowledge and daily pacing...',
  'Structuring sequential phase architecture and milestones...',
  'Extracting core subtopics, conceptual models, and hands-on exercises...',
  'Curating authoritative learning resources and documentation...',
  'Validating learning objectives and quality criteria...'
];

export const RoadmapWizard = ({
  goals = [],
  initialGoal = null,
  onGenerate,
  onCancel,
  loading = false,
  error = null
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Profile data
  const [profile, setProfile] = useState(null);
  const [existingSkills, setExistingSkills] = useState([]);

  // Step 1: Goal & Subject
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoal?.id ? String(initialGoal.id) : '');
  const [topic, setTopic] = useState(initialGoal?.title || '');
  const [description, setDescription] = useState(initialGoal?.description || '');
  const [skillLevel, setSkillLevel] = useState(initialGoal?.skillLevel || 'INTERMEDIATE');

  // Step 2: Knowledge Diagnostic
  const [topicsList, setTopicsList] = useState([]);
  const [topicRatings, setTopicRatings] = useState({});
  const [userTouchedTopics, setUserTouchedTopics] = useState(new Set());
  const [newCustomTopic, setNewCustomTopic] = useState('');
  const [diagnosticNote, setDiagnosticNote] = useState(null);

  // Step 3: Duration & Budget
  const [targetDays, setTargetDays] = useState(initialGoal?.targetDays || 30);
  const [hoursPerDay, setHoursPerDay] = useState(initialGoal?.hoursPerDay || 2.0);
  const [specificTopics, setSpecificTopics] = useState(initialGoal?.specificTopics || '');
  const [targetOutcomes, setTargetOutcomes] = useState(initialGoal?.targetOutcome || '');

  // Step 4: Roadmap Preferences
  const [explanationStyle, setExplanationStyle] = useState('STEP_BY_STEP');
  const [practiceStyle, setPracticeStyle] = useState('CODING_PROBLEMS');
  const [learningMethods, setLearningMethods] = useState('VIDEO,CODING_PRACTICE');

  const [stepError, setStepError] = useState(null);
  const [synthesisStageIdx, setSynthesisStageIdx] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      setSynthesisStageIdx(0);
      interval = setInterval(() => {
        setSynthesisStageIdx(prev => (prev < SYNTHESIS_STAGES.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [prof, skills] = await Promise.all([
          getStudentProfile().catch(() => null),
          getSkills().catch(() => [])
        ]);

        if (prof) {
          setProfile(prof);
          setHoursPerDay(prof.dailyStudyHours || 2.0);
          setExplanationStyle(prof.explanationStyle || 'STEP_BY_STEP');
          setPracticeStyle(prof.practiceStyle || 'CODING_PROBLEMS');
          setLearningMethods(prof.learningMethods || 'VIDEO,CODING_PRACTICE');
        }

        if (Array.isArray(skills)) {
          setExistingSkills(skills);
        }
      } catch (err) {
        console.error('Failed to load profile for wizard:', err);
      }
    };
    fetchContext();
  }, []);

  useEffect(() => {
    if (initialGoal) {
      setSelectedGoalId(String(initialGoal.id));
      setTopic(initialGoal.title);
      setDescription(initialGoal.description || '');
      setSkillLevel(initialGoal.skillLevel || 'INTERMEDIATE');
      if (initialGoal.targetDays) setTargetDays(initialGoal.targetDays);
      if (initialGoal.hoursPerDay) setHoursPerDay(initialGoal.hoursPerDay);
      if (initialGoal.specificTopics) setSpecificTopics(initialGoal.specificTopics);
      if (initialGoal.targetOutcome) setTargetOutcomes(initialGoal.targetOutcome);

      deriveTopicsForTopic(initialGoal.title);
    }
  }, [initialGoal]);

  const deriveTopicsForTopic = (chosenTopic) => {
    const matchedPreset = PRESET_TRACKS.find(p =>
      chosenTopic.toLowerCase().includes(p.topic.toLowerCase()) ||
      p.topic.toLowerCase().includes(chosenTopic.toLowerCase())
    );

    let initialTopics = [];
    if (matchedPreset) {
      initialTopics = [...matchedPreset.topics];
    } else {
      // Phase 2b amendment: delete the generic 5-topic fallback.
      // Non-matching custom goals start empty and optional.
      initialTopics = [];
    }

    setTopicsList(initialTopics);

    const ratings = {};
    initialTopics.forEach(t => {
      const match = existingSkills.find(s => s.topicName.toLowerCase() === t.toLowerCase());
      ratings[t] = match ? match.knowledgeLevel : 'NOT_LEARNED';
    });
    setTopicRatings(ratings);
    setUserTouchedTopics(new Set());
  };

  const handleSelectPreset = (preset) => {
    setSelectedGoalId('');
    setTopic(preset.topic);
    setDescription(preset.description);
    setTargetDays(preset.defaultDays);
    setHoursPerDay(preset.defaultHours);
    setSpecificTopics(preset.specificTopics);
    setTargetOutcomes(preset.targetOutcomes);
    deriveTopicsForTopic(preset.topic);
  };

  const handleSelectGoal = (goalId) => {
    setSelectedGoalId(goalId);
    if (!goalId) return;

    const found = goals.find(g => String(g.id) === String(goalId));
    if (found) {
      setTopic(found.title);
      setDescription(found.description || '');
      setSkillLevel(found.skillLevel || 'INTERMEDIATE');
      if (found.targetDays) setTargetDays(found.targetDays);
      if (found.hoursPerDay) setHoursPerDay(found.hoursPerDay);
      if (found.specificTopics) setSpecificTopics(found.specificTopics);
      if (found.targetOutcome) setTargetOutcomes(found.targetOutcome);
      deriveTopicsForTopic(found.title);
    }
  };

  const handleRateTopic = (topicName, level) => {
    setTopicRatings(prev => ({
      ...prev,
      [topicName]: level
    }));

    setUserTouchedTopics(prev => {
      const next = new Set(prev);
      next.add(topicName);
      return next;
    });

    if (level === 'NOT_SURE') {
      setDiagnosticNote(`Marked "${topicName}" for a rapid diagnostic check in Phase 1.`);
      setTimeout(() => setDiagnosticNote(null), 4000);
    }
  };

  const handleAddCustomTopic = (e) => {
    e.preventDefault();
    const clean = newCustomTopic.trim();
    if (!clean) return;
    if (!topicsList.includes(clean)) {
      setTopicsList(prev => [...prev, clean]);
      setTopicRatings(prev => ({ ...prev, [clean]: 'BEGINNER' }));
      setUserTouchedTopics(prev => {
        const next = new Set(prev);
        next.add(clean);
        return next;
      });
    }
    setNewCustomTopic('');
  };

  const handleRemoveTopic = (tName) => {
    setTopicsList(prev => prev.filter(t => t !== tName));
    setTopicRatings(prev => {
      const copy = { ...prev };
      delete copy[tName];
      return copy;
    });
    setUserTouchedTopics(prev => {
      const next = new Set(prev);
      next.delete(tName);
      return next;
    });
  };

  const handleNext = async () => {
    setStepError(null);

    if (currentStep === 1) {
      if (!topic.trim()) {
        setStepError('Please select a curriculum template or type your custom goal topic.');
        return;
      }
      if (topicsList.length === 0) {
        deriveTopicsForTopic(topic);
      }
    }

    if (currentStep === 2) {
      try {
        // Only save topics with ratedByUser flag tracking user touch
        const skillsToSave = Object.entries(topicRatings)
          .filter(([_, lvl]) => lvl !== 'NOT_SURE')
          .map(([tName, lvl]) => ({
            topicName: tName,
            knowledgeLevel: lvl,
            ratedByUser: userTouchedTopics.has(tName)
          }));

        if (skillsToSave.length > 0) {
          await bulkUpsertSkills(skillsToSave);
        }
      } catch (err) {
        console.warn('Could not auto-sync skills to backend', err);
      }
    }

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStepError(null);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleFinish = () => {
    // Only summarize rated topics in prior knowledge summary
    const priorKnowledgeSummary = Object.entries(topicRatings)
      .filter(([t, _]) => userTouchedTopics.has(t))
      .map(([t, l]) => `${t}: ${l.replace('_', ' ')}`)
      .join('; ');

    const payload = {
      topic: topic.trim(),
      description: description.trim() || 'Mastery and practical application',
      skillLevel,
      targetDays: Number(targetDays),
      hoursPerDay: Number(hoursPerDay),
      goalId: selectedGoalId ? Number(selectedGoalId) : null,
      specificTopics: specificTopics.trim() || undefined,
      targetOutcomes: targetOutcomes.trim() || undefined,
      priorKnowledge: priorKnowledgeSummary || undefined,
      explanationStyle,
      practiceStyle,
      learningMethods
    };

    onGenerate(payload);
  };

  const STEPS = [
    { num: 1, title: 'Curriculum Goal' },
    { num: 2, title: 'Starting Knowledge' },
    { num: 3, title: 'Duration & Budget' },
    { num: 4, title: 'Study Format' },
    { num: 5, title: 'Synthesis' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-3xl p-10 sm:p-14 text-white text-center shadow-2xl border border-slate-800 animate-fade-in max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center mx-auto mb-6 text-indigo-400 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <div className="space-y-4 max-w-lg mx-auto">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block mb-2">
              Gemini AI Engine
            </span>
            <h3 className="text-xl md:text-2xl font-black mt-1">Synthesizing Your Curriculum</h3>
            <p className="text-xs text-slate-300 mt-2 font-medium min-h-[36px] transition-all duration-300">
              {SYNTHESIS_STAGES[synthesisStageIdx]}
            </p>
          </div>

          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5 max-w-xs mx-auto">
            <div
              className="gradient-accent h-1 rounded-full transition-all duration-500"
              style={{ width: `${((synthesisStageIdx + 1) / SYNTHESIS_STAGES.length) * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-amber-300 font-medium">
            This can take up to 2 minutes while Gemini generates and validates your complete curriculum.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden max-w-4xl mx-auto animate-fade-slide">
      {/* ── WIZARD PROGRESS HEADER ── */}
      <div className="bg-slate-950 text-white p-7 md:p-9 relative overflow-hidden border-b border-slate-800">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Interactive Curriculum Architect</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Create Your Study Roadmap</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
              Step {currentStep} of 5: {STEPS[currentStep - 1].title}
            </p>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="self-start sm:self-center text-xs font-semibold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10"
            >
              Exit Wizard
            </button>
          )}
        </div>

        {/* Dynamic Step Progress Track */}
        <div className="grid grid-cols-5 gap-2.5 mt-7">
          {STEPS.map((s) => {
            const isDone = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isDone ? 'bg-emerald-400' : isCurrent ? 'gradient-primary shadow-xs' : 'bg-white/15'
                  }`}
                />
                <span className={`hidden sm:block text-[10px] font-bold truncate ${
                  isCurrent ? 'text-white' : isDone ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── WIZARD BODY ── */}
      <div className="p-7 md:p-10 min-h-[420px] flex flex-col justify-between">
        {stepError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2 animate-fade-slide">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        {/* ── STEP 1: What do you want to achieve? ── */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 1: Choose Your Learning Target</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select an enterprise curriculum template or craft a custom goal.
              </p>
            </div>

            {/* Link from existing registered goals */}
            {goals.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
                <label className="block text-xs font-bold text-indigo-950 mb-1.5">
                  Link with your registered learning goal:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => handleSelectGoal(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                >
                  <option value="">-- Or choose from your active goals --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.skillLevel} • {g.targetDays} days)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preset Curriculum Tracks Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Popular Curriculum Blueprints:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PRESET_TRACKS.map(sug => {
                  const isSelected = topic.toLowerCase() === sug.topic.toLowerCase();
                  const Icon = sug.icon;
                  return (
                    <button
                      type="button"
                      key={sug.topic}
                      onClick={() => handleSelectPreset(sug)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-md">
                            {sug.category}
                          </span>
                          <div className={`w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center ${
                            isSelected ? 'text-indigo-600 shadow-xs' : 'text-slate-500'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-2">{sug.topic}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{sug.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>{sug.defaultDays} days</span>
                        <span>{sug.defaultHours}h daily pace</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or enter custom subject or goal title:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSelectedGoalId('');
                }}
                placeholder="e.g. Master Golang Microservices & Kubernetes or React Native"
                className="w-full p-3.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Understand Starting Point ── */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 2: Calibrate Your Baseline Knowledge</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Rate your comfort with topics in <strong>{topic}</strong>. Topics rated here guide pedagogical pacing.
              </p>
            </div>

            {diagnosticNote && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center space-x-2 animate-fade-slide">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{diagnosticNote}</span>
              </div>
            )}

            {/* Add custom topic input */}
            <form onSubmit={handleAddCustomTopic} className="flex gap-2">
              <input
                type="text"
                value={newCustomTopic}
                onChange={(e) => setNewCustomTopic(e.target.value)}
                placeholder="Add a topic you know or want to focus on (e.g. Async IO, Docker, PyTorch)"
                className="flex-1 p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Topic</span>
              </button>
            </form>

            {topicsList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-slate-500">
                <p className="text-xs font-medium">
                  No predefined topics for this subject. Feel free to add topics above or click <strong>Continue</strong> to proceed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topicsList.map(tName => {
                  const currentRating = topicRatings[tName] || 'NOT_LEARNED';
                  return (
                    <div key={tName} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{tName}</span>
                        {userTouchedTopics.has(tName) && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Rated
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex flex-wrap gap-1.5">
                          {KNOWLEDGE_CHOICES.map(opt => {
                            const isSelected = currentRating === opt.level;
                            return (
                              <button
                                type="button"
                                key={opt.level}
                                onClick={() => handleRateTopic(tName, opt.level)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                  isSelected
                                    ? `${opt.badge} ring-2 ring-indigo-500/30 shadow-xs`
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(tName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                          title="Remove topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Define Target & Study Budget ── */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 3: Duration & Time Commitment</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ensure workload matches your study bandwidth so you never get overwhelmed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Duration: <span className="text-indigo-600 font-black">{targetDays} days</span>
                </label>
                <input
                  type="range"
                  min="7"
                  max="90"
                  step="1"
                  value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>1 Week (7d)</span>
                  <span>1 Month (30d)</span>
                  <span>3 Months (90d)</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Daily Study Hours: <span className="text-indigo-600 font-black">{hoursPerDay} hours/day</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>0.5h (Light)</span>
                  <span>2h (Standard)</span>
                  <span>6h (Intensive)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specific Modules, Libraries, or Topics to Cover:
              </label>
              <input
                type="text"
                value={specificTopics}
                onChange={(e) => setSpecificTopics(e.target.value)}
                placeholder="e.g. PyTorch, Hugging Face, FAISS vector search, Prompt chaining"
                className="w-full p-3.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Goal / Expected Outcome:
              </label>
              <textarea
                rows={2}
                value={targetOutcomes}
                onChange={(e) => setTargetOutcomes(e.target.value)}
                placeholder="e.g. Deploy custom RAG agent application to portfolio and pass technical interview"
                className="w-full p-3.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Preferences & Learning Media ── */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 4: AI Pedagogy & Practice Format</h3>
              <p className="text-xs text-slate-500 mt-1">
                Customizes how concepts are broken down and daily practice format.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">Explanation Pedagogy:</label>
                <div className="space-y-2">
                  {[
                    { id: 'STEP_BY_STEP', label: 'Step-by-Step Breakdown' },
                    { id: 'FIRST_PRINCIPLES', label: 'First Principles & Theory' },
                    { id: 'CODE_FIRST', label: 'Code-First / Example Driven' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setExplanationStyle(opt.id)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition cursor-pointer ${
                        explanationStyle === opt.id
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">Preferred Practice Format:</label>
                <div className="space-y-2">
                  {[
                    { id: 'CODING_PROBLEMS', label: 'Coding Problems & Sandboxes' },
                    { id: 'MINI_PROJECTS', label: 'Real-World Mini Projects' },
                    { id: 'QUIZ_ASSESSMENT', label: 'Quizzes & Architecture Drills' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setPracticeStyle(opt.id)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition cursor-pointer ${
                        practiceStyle === opt.id
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Final Review & Synthesis ── */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 5: Review Curriculum Specifications</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gemini will synthesize a personalized day-by-day learning journey calibrated to your baseline knowledge.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error || 'Could not generate a roadmap. Please try again.'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs self-end sm:self-center transition cursor-pointer shadow-2xs"
                >
                  Retry Generation
                </button>
              </div>
            )}

            <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-5 text-xs">
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Goal Subject</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">{topic}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold gradient-primary text-white shadow-2xs">
                  {skillLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sprint</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{targetDays} Days</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pace</span>
                  <span className="text-sm font-extrabold text-indigo-600 mt-0.5 block">{hoursPerDay}h / day</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Hours</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{Math.round(targetDays * hoursPerDay)} hrs</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Rated Topics</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{userTouchedTopics.size}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER NAVIGATION CONTROLS ── */}
        <div className="pt-8 border-t border-slate-200/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center space-x-2 px-7 py-3 rounded-2xl gradient-primary text-white text-xs font-black transition shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Personalized Roadmap</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
