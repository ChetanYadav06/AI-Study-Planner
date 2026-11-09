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
  GraduationCap
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
    specificTopics: 'Pandas, NumPy, Scikit-Learn Models, Supervised Learning, Cross-Validation, Metrics',
    targetOutcomes: 'Train, evaluate, and deploy predictive ML models on real-world datasets',
    topics: ['Python Basics', 'Pandas & NumPy', 'Linear Regression', 'Decision Trees', 'Model Evaluation & Metrics']
  }
];

const KNOWLEDGE_CHOICES = [
  { label: 'I already know this', level: 'MASTERED', badge: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { label: 'I know the basics', level: 'BEGINNER', badge: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
  { label: 'I need to learn this', level: 'NOT_LEARNED', badge: 'bg-amber-50 text-amber-700 border-amber-300' },
  { label: "I'm not sure", level: 'NOT_SURE', badge: 'bg-slate-50 text-slate-700 border-slate-300' }
];

const SYNTHESIS_STAGES = [
  'Understanding your learning goals & career targets...',
  'Analyzing your calibrated knowledge to skip mastered basics...',
  'Structuring day-by-day practice sessions & curated resources...',
  'Finalizing your customized AI learning journey...'
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
  const [profile, setProfile] = useState(null);
  const [existingSkills, setExistingSkills] = useState([]);

  // Wizard State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');

  // Step 2: Topic knowledge ratings
  const [topicsList, setTopicsList] = useState([]);
  const [topicRatings, setTopicRatings] = useState({});
  const [diagnosticNote, setDiagnosticNote] = useState(null);

  // Step 3: Target constraints
  const [targetDays, setTargetDays] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(2.0);
  const [specificTopics, setSpecificTopics] = useState('');
  const [targetOutcomes, setTargetOutcomes] = useState('');

  // Step 4: Roadmap Preferences
  const [explanationStyle, setExplanationStyle] = useState('STEP_BY_STEP');
  const [practiceStyle, setPracticeStyle] = useState('CODING_PROBLEMS');
  const [learningMethods, setLearningMethods] = useState('VIDEO,CODING_PRACTICE');

  const [stepError, setStepError] = useState(null);

  // Progressive synthesis message timer during loading
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
      initialTopics = matchedPreset.topics;
    } else {
      initialTopics = [
        'Core Foundations & Principles',
        'Syntax & Structural Mechanics',
        'Collections & Problem Patterns',
        'Practical Problem-Solving Challenges',
        'End-to-End Capstone Implementation'
      ];
    }

    setTopicsList(initialTopics);

    const ratings = {};
    initialTopics.forEach(t => {
      const match = existingSkills.find(s => s.topicName.toLowerCase() === t.toLowerCase());
      ratings[t] = match ? match.knowledgeLevel : 'NOT_LEARNED';
    });
    setTopicRatings(ratings);
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

    if (level === 'NOT_SURE') {
      setDiagnosticNote(`Marked "${topicName}" for a rapid diagnostic check in Phase 1.`);
      setTimeout(() => setDiagnosticNote(null), 4000);
    }
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
        const skillsToSave = Object.entries(topicRatings)
          .filter(([_, lvl]) => lvl !== 'NOT_SURE')
          .map(([tName, lvl]) => ({
            topicName: tName,
            knowledgeLevel: lvl
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
    const priorKnowledgeSummary = Object.entries(topicRatings)
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
    { num: 3, title: 'Study Budget' },
    { num: 4, title: 'Pedagogy' },
    { num: 5, title: 'Review & Synthesize' }
  ];

  // ── LOADING OVERLAY WITH PROGRESSIVE STATUS MESSAGES ──
  if (loading) {
    return (
      <div className="bg-slate-950 text-white rounded-3xl p-10 md:p-16 border border-slate-800 shadow-2xl text-center max-w-xl mx-auto my-8 relative overflow-hidden animate-fade-slide">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="w-20 h-20 rounded-3xl gradient-primary text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/40 animate-pulse-glow">
            <Sparkles className="w-10 h-10 animate-spin" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
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

          <p className="text-[11px] text-slate-500">
            Calibrating duration, prerequisite trees, and verified resources for {topic}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden max-w-4xl mx-auto animate-fade-slide">
      {/* ── WIZARD PROGRESS HEADER (Dark Studio & Deep Indigo) ── */}
      <div className="bg-slate-950 text-white p-7 md:p-9 relative overflow-hidden border-b border-slate-800">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Interactive Curriculum Architect</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Create Your Study Roadmap</h2>
            <p className="text-xs text-slate-400 mt-1">
              Step {currentStep} of 5: <span className="text-white font-bold">{STEPS[currentStep - 1].title}</span>
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

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Curriculum Tracks
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PRESET_TRACKS.map((sug) => {
                  const Icon = sug.icon;
                  const isSelected = topic === sug.topic;
                  return (
                    <button
                      type="button"
                      key={sug.topic}
                      onClick={() => handleSelectPreset(sug)}
                      className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/90 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                            {sug.category}
                          </span>
                          <div className={`p-2 rounded-xl bg-white border border-slate-200 group-hover:scale-105 transition ${
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
                Rate your comfort with foundational topics in <strong>{topic}</strong>. Mastered items will skip introductory syntax.
              </p>
            </div>

            {diagnosticNote && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center space-x-2 animate-fade-slide">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{diagnosticNote}</span>
              </div>
            )}

            <div className="space-y-3">
              {topicsList.map(tName => {
                const currentRating = topicRatings[tName] || 'NOT_LEARNED';
                return (
                  <div key={tName} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-900">{tName}</span>

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
                  </div>
                );
              })}
            </div>
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
                  max="120"
                  step="1"
                  value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1 week</span>
                  <span>30 days</span>
                  <span>120 days</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Daily Study Hours: <span className="text-indigo-600 font-black">{hoursPerDay} hours/day</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.5h</span>
                  <span>2h</span>
                  <span>8h</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 flex items-center justify-between text-xs text-indigo-950">
              <span className="font-bold flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Calculated Curriculum Study Budget:</span>
              </span>
              <span className="font-black text-sm font-mono text-indigo-700">
                {(targetDays * hoursPerDay).toFixed(1)} Total Hours
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specific Focus Areas or Must-Cover Topics (Optional)
              </label>
              <input
                type="text"
                value={specificTopics}
                onChange={(e) => setSpecificTopics(e.target.value)}
                placeholder="e.g. Binary Search Trees, Graph BFS/DFS, LRU Cache implementation"
                className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Desired Outcome / Target Goal (Optional)
              </label>
              <input
                type="text"
                value={targetOutcomes}
                onChange={(e) => setTargetOutcomes(e.target.value)}
                placeholder="e.g. Solve Medium LeetCode problems independently and pass campus placement rounds"
                className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Select Learning Preferences ── */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 4: Roadmap Pedagogy & Practice</h3>
              <p className="text-xs text-slate-500 mt-1">
                Adjust preferences specifically for this curriculum without altering your permanent profile.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Explanation Style
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'SIMPLE', title: 'Intuitive & Jargon-Free', desc: 'Real-world analogies and visual metaphors' },
                  { id: 'STEP_BY_STEP', title: 'Step-by-Step Breakdown', desc: 'Chronological progression with milestone code' },
                  { id: 'TECHNICAL', title: 'Deep Technical Analysis', desc: 'Under-the-hood runtime & memory models' },
                  { id: 'EXAMPLES_FIRST', title: 'Code Examples First', desc: 'Practical runnable snippet first, theory second' }
                ].map(s => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setExplanationStyle(s.id)}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      explanationStyle === s.id
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-900">{s.title}</span>
                    <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Practice Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'CODING_PROBLEMS', title: 'Algorithmic Challenges', desc: 'Coding exercises with unit test checks' },
                  { id: 'MINI_PROJECTS', title: 'Mini-Projects', desc: 'Build working modules and modular feature repos' },
                  { id: 'MCQS', title: 'Rapid Quizzes', desc: 'Rapid conceptual multiple-choice checks' },
                  { id: 'REAL_WORLD', title: 'Production Scenarios', desc: 'Enterprise bugs and system design challenges' }
                ].map(s => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setPracticeStyle(s.id)}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      practiceStyle === s.id
                        ? 'bg-violet-50 border-violet-500 ring-2 ring-violet-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-900">{s.title}</span>
                    <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review & Synthesize ── */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-slide">
            <div>
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900">Step 5: Review Curriculum Specifications</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gemini will synthesize a personalized day-by-day learning journey calibrated to your baseline knowledge.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block">Duration</span>
                  <span className="font-extrabold text-slate-900 text-sm">{targetDays} Days</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block">Pace</span>
                  <span className="font-extrabold text-slate-900 text-sm">{hoursPerDay}h / day</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 text-[10px] block">Total Budget</span>
                  <span className="font-extrabold text-indigo-600 text-sm font-mono">{(targetDays * hoursPerDay).toFixed(1)}h</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-2 font-bold uppercase">Calibrated Baseline Knowledge</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(topicRatings).map(([tName, lvl]) => (
                    <span
                      key={tName}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        lvl === 'MASTERED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : lvl === 'BEGINNER'
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                          : lvl === 'NOT_SURE'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {tName} • {formatEnum(lvl)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600 font-medium">
                <span><strong>Pedagogy:</strong> {formatEnum(explanationStyle)}</span>
                <span><strong>Practice:</strong> {formatEnum(practiceStyle)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTROLS FOOTER ── */}
        <div className="flex items-center justify-between pt-7 border-t border-slate-100 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 gradient-primary hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center space-x-2 px-8 py-3 gradient-primary hover:opacity-95 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-500/30 transition cursor-pointer hover:scale-102"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate My Roadmap</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
