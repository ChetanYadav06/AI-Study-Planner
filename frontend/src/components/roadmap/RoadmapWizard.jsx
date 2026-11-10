import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Brain,
  Clock,
  Calendar,
  Layers,
  AlertCircle,
  Loader2,
  Code2,
  Database,
  Cpu,
  Plus,
  Trash2
} from 'lucide-react';
import { getStudentProfile, getSkills, bulkUpsertSkills } from '../../services/api';
import { Button, PageHeader, Card } from '../ui';

const PRESET_TRACKS = [
  {
    topic: 'Java Data Structures & Algorithms',
    category: 'Placement Mastery',
    icon: Code2,
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
    description: 'Pandas preprocessing, NumPy, supervised ML regression & classification, and model metrics.',
    defaultDays: 30,
    defaultHours: 2.0,
    specificTopics: 'Pandas, NumPy, Scikit-Learn Regression & Classification, Model Evaluation, Feature Engineering',
    targetOutcomes: 'Preprocess real-world tabular data and build high-accuracy predictive ML models',
    topics: ['Python Data Foundations', 'NumPy & Linear Math', 'Pandas Preprocessing', 'Supervised Learning', 'Model Evaluation & ROC']
  }
];

const KNOWLEDGE_CHOICES = [
  { level: 'MASTERED', label: 'Mastered' },
  { level: 'INTERMEDIATE', label: 'Familiar' },
  { level: 'BEGINNER', label: 'Beginner' },
  { level: 'NOT_LEARNED', label: 'Not Learned' }
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
      <div className="bg-surface rounded-[10px] p-8 border border-line text-center max-w-xl mx-auto my-12">
        <div className="w-10 h-10 rounded-[6px] bg-accent-soft border border-line flex items-center justify-center mx-auto mb-4 text-accent">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>

        <div className="space-y-3 max-w-md mx-auto">
          <div>
            <span className="text-xs font-mono font-medium text-accent">
              Gemini AI Engine
            </span>
            <h3 className="text-base font-semibold text-ink mt-1">Synthesizing Your Curriculum</h3>
            <p className="text-xs text-muted mt-1.5 min-h-[36px]">
              {SYNTHESIS_STAGES[synthesisStageIdx]}
            </p>
          </div>

          <div className="w-full bg-page rounded-[4px] h-1.5 overflow-hidden max-w-xs mx-auto">
            <div
              className="bg-accent h-full rounded-[4px] transition-all duration-500"
              style={{ width: `${((synthesisStageIdx + 1) / SYNTHESIS_STAGES.length) * 100}%` }}
            />
          </div>

          <p className="text-xs text-muted">
            This can take up to 2 minutes while Gemini generates and validates your complete curriculum.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-[10px] border border-line overflow-hidden max-w-3xl mx-auto">
      {/* ── WIZARD PROGRESS HEADER ── */}
      <div className="p-6 border-b border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Create Your Study Roadmap</h2>
            <p className="text-xs text-muted mt-0.5">
              Step {currentStep} of 5: {STEPS[currentStep - 1].title}
            </p>
          </div>

          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="self-start sm:self-center"
            >
              Exit Wizard
            </Button>
          )}
        </div>

        {/* Dynamic Step Progress Track */}
        <div className="grid grid-cols-5 gap-2 mt-5">
          {STEPS.map((s) => {
            const isDone = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 rounded-[4px] transition-all duration-300 ${
                    isDone ? 'bg-success' : isCurrent ? 'bg-accent' : 'bg-line'
                  }`}
                />
                <span className={`hidden sm:block text-xs font-medium truncate ${
                  isCurrent ? 'text-accent' : isDone ? 'text-ink' : 'text-muted'
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── WIZARD BODY ── */}
      <div className="p-6 min-h-[380px] flex flex-col justify-between">
        {stepError && (
          <div className="mb-4 p-3 rounded-[8px] bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        {/* ── STEP 1: What do you want to achieve? ── */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Step 1: Choose Your Learning Target</h3>
              <p className="text-xs text-muted mt-0.5">
                Select an enterprise curriculum template or craft a custom goal.
              </p>
            </div>

            {/* Link from existing registered goals */}
            {goals.length > 0 && (
              <div className="p-3.5 rounded-[8px] bg-page border border-line">
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Link with your registered learning goal:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => handleSelectGoal(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none font-medium"
                >
                  <option value="">-- Or choose from your active goals --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.skillLevel} · {g.targetDays} days)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preset Curriculum Tracks Grid */}
            <div>
              <label className="block text-xs font-medium text-ink mb-2">
                Popular Curriculum Blueprints:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_TRACKS.map(sug => {
                  const isSelected = topic.toLowerCase() === sug.topic.toLowerCase();
                  const Icon = sug.icon;
                  return (
                    <button
                      type="button"
                      key={sug.topic}
                      onClick={() => handleSelectPreset(sug)}
                      className={`p-3.5 rounded-[8px] border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-surface hover:border-slate-300 text-ink'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-accent">
                            {sug.category}
                          </span>
                          <div className={`w-7 h-7 rounded-[4px] bg-page border border-line flex items-center justify-center ${
                            isSelected ? 'text-accent' : 'text-muted'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <h4 className="text-xs font-semibold text-ink mt-1.5">{sug.topic}</h4>
                        <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{sug.description}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between text-xs text-muted">
                        <span>{sug.defaultDays} days</span>
                        <span>{sug.defaultHours}h daily pace</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
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
                className="w-full p-2.5 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none transition"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Understand Starting Point ── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center space-x-1.5">
                <Brain className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Step 2: Calibrate Your Baseline Knowledge</h3>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Rate your comfort with topics in <strong>{topic}</strong>. Topics rated here guide pedagogical pacing.
              </p>
            </div>

            {diagnosticNote && (
              <div className="p-3 rounded-[8px] bg-accent-soft border border-line text-accent text-xs font-medium flex items-center space-x-2">
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
                className="flex-1 p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none font-medium"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Plus}
              >
                Add Topic
              </Button>
            </form>

            {topicsList.length === 0 ? (
              <div className="p-6 text-center rounded-[8px] bg-page border border-line text-muted">
                <p className="text-xs">
                  No predefined topics for this subject. Feel free to add topics above or click <strong>Continue</strong> to proceed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topicsList.map(tName => {
                  const currentRating = topicRatings[tName] || 'NOT_LEARNED';
                  return (
                    <div key={tName} className="p-3 rounded-[8px] bg-page border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-ink">{tName}</span>
                        {userTouchedTopics.has(tName) && (
                          <span className="text-xs text-accent">
                            (rated)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex flex-wrap gap-1">
                          {KNOWLEDGE_CHOICES.map(opt => {
                            const isSelected = currentRating === opt.level;
                            return (
                              <button
                                type="button"
                                key={opt.level}
                                onClick={() => handleRateTopic(tName, opt.level)}
                                className={`px-2.5 py-1 rounded-[4px] text-xs font-medium border transition cursor-pointer ${
                                  isSelected
                                    ? 'border-accent bg-accent-soft text-accent'
                                    : 'bg-surface border-line text-muted hover:text-ink'
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
                          className="p-1 text-muted hover:text-danger rounded-[4px] hover:bg-surface transition cursor-pointer"
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
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Step 3: Duration & Time Commitment</h3>
              <p className="text-xs text-muted mt-0.5">
                Ensure workload matches your study bandwidth so you never get overwhelmed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[8px] bg-page border border-line space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Target Duration</span>
                  </span>
                  <span className="text-xs font-mono font-medium text-accent">{targetDays} days</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="90"
                  step="1"
                  value={targetDays}
                  onChange={(e) => setTargetDays(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 rounded-[4px] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>1 Week (7d)</span>
                  <span>1 Month (30d)</span>
                  <span>3 Months (90d)</span>
                </div>
              </div>

              <div className="p-4 rounded-[8px] bg-page border border-line space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>Daily Study Hours</span>
                  </span>
                  <span className="text-xs font-mono font-medium text-accent">{hoursPerDay}h / day</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 rounded-[4px] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>0.5h (Light)</span>
                  <span>2h (Standard)</span>
                  <span>6h (Intensive)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Specific Modules, Libraries, or Topics to Cover:
              </label>
              <input
                type="text"
                value={specificTopics}
                onChange={(e) => setSpecificTopics(e.target.value)}
                placeholder="e.g. PyTorch, Hugging Face, FAISS vector search, Prompt chaining"
                className="w-full p-2.5 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Primary Goal / Expected Outcome:
              </label>
              <textarea
                rows={2}
                value={targetOutcomes}
                onChange={(e) => setTargetOutcomes(e.target.value)}
                placeholder="e.g. Deploy custom RAG agent application to portfolio and pass technical interview"
                className="w-full p-2.5 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none transition resize-none"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Preferences & Learning Media ── */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Step 4: Pedagogy & Practice Format</h3>
              <p className="text-xs text-muted mt-0.5">
                Customizes how concepts are broken down and daily practice format.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-[8px] bg-page border border-line">
                <label className="block text-xs font-medium text-ink mb-2">Explanation Pedagogy:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'STEP_BY_STEP', label: 'Step-by-Step Breakdown' },
                    { id: 'FIRST_PRINCIPLES', label: 'First Principles & Theory' },
                    { id: 'CODE_FIRST', label: 'Code-First / Example Driven' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setExplanationStyle(opt.id)}
                      className={`w-full p-2 rounded-[6px] text-left text-xs font-medium border transition cursor-pointer ${
                        explanationStyle === opt.id
                          ? 'bg-accent-soft border-accent text-accent'
                          : 'bg-surface border-line text-ink hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-page border border-line">
                <label className="block text-xs font-medium text-ink mb-2">Preferred Practice Format:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'CODING_PROBLEMS', label: 'Coding Problems & Sandboxes' },
                    { id: 'MINI_PROJECTS', label: 'Real-World Mini Projects' },
                    { id: 'QUIZ_ASSESSMENT', label: 'Quizzes & Architecture Drills' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setPracticeStyle(opt.id)}
                      className={`w-full p-2 rounded-[6px] text-left text-xs font-medium border transition cursor-pointer ${
                        practiceStyle === opt.id
                          ? 'bg-accent-soft border-accent text-accent'
                          : 'bg-surface border-line text-ink hover:border-slate-300'
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
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Step 5: Review Curriculum Specifications</h3>
              <p className="text-xs text-muted mt-0.5">
                Gemini will synthesize a personalized day-by-day learning journey calibrated to your baseline knowledge.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-[8px] bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                  <span>{error || 'Could not generate a roadmap. Please try again.'}</span>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleFinish}
                  className="self-end sm:self-center"
                >
                  Retry Generation
                </Button>
              </div>
            )}

            <div className="p-4 rounded-[8px] bg-page border border-line space-y-4 text-xs">
              <div className="flex justify-between items-start pb-3 border-b border-line">
                <div>
                  <span className="text-xs text-muted font-medium">Goal Subject</span>
                  <div className="text-sm font-semibold text-ink mt-0.5">{topic}</div>
                </div>
                <span className="px-2 py-0.5 rounded-[4px] text-xs font-medium bg-accent-soft text-accent border border-line">
                  {skillLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-surface rounded-[6px] border border-line">
                  <span className="text-xs text-muted font-medium block">Duration</span>
                  <span className="text-xs font-semibold text-ink mt-0.5 block">{targetDays} Days</span>
                </div>
                <div className="p-2.5 bg-surface rounded-[6px] border border-line">
                  <span className="text-xs text-muted font-medium block">Daily Pace</span>
                  <span className="text-xs font-semibold text-accent mt-0.5 block">{hoursPerDay}h / day</span>
                </div>
                <div className="p-2.5 bg-surface rounded-[6px] border border-line">
                  <span className="text-xs text-muted font-medium block">Total Hours</span>
                  <span className="text-xs font-semibold text-ink mt-0.5 block">{Math.round(targetDays * hoursPerDay)} hrs</span>
                </div>
                <div className="p-2.5 bg-surface rounded-[6px] border border-line">
                  <span className="text-xs text-muted font-medium block">Rated Topics</span>
                  <span className="text-xs font-semibold text-ink mt-0.5 block">{userTouchedTopics.size}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER NAVIGATION CONTROLS ── */}
        <div className="pt-6 border-t border-line flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrev}
            icon={ArrowLeft}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleFinish}
            >
              <span>Generate Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapWizard;
