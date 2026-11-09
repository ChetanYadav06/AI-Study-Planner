import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Calendar,
  GraduationCap,
  Briefcase,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  BookOpen,
  Award,
  Layers,
  Sliders,
  Check,
  Edit3,
  X,
  Loader2,
  RefreshCw,
  Target,
  Brain,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatEnum } from '../../utils/formatters';
import {
  getStudentProfile,
  updateStudentProfile,
  getSkills,
  upsertSkill,
  updateSkillLevel,
  deleteSkill,
  getGoals
} from '../../services/api';

const KNOWLEDGE_LEVELS = [
  { value: 'MASTERED', label: 'Mastered', badge: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20' },
  { value: 'INTERMEDIATE', label: 'Intermediate', badge: 'bg-cyan-50 text-cyan-700 border-cyan-300 ring-cyan-500/20' },
  { value: 'BEGINNER', label: 'Beginner', badge: 'bg-violet-50 text-violet-700 border-violet-300 ring-violet-500/20' },
  { value: 'NOT_LEARNED', label: 'Not Learned', badge: 'bg-slate-100 text-slate-600 border-slate-300 ring-slate-400/20' }
];

const LEARNING_METHODS = [
  { id: 'VIDEO', label: 'Video Lessons', icon: '🎥', desc: 'Visual concepts & code screencasts' },
  { id: 'READING', label: 'Documentation & Notes', icon: '📖', desc: 'Official guides & comprehensive cheat-sheets' },
  { id: 'CODING_PRACTICE', label: 'Hands-on Coding', icon: '💻', desc: 'Active problem solving in the IDE' },
  { id: 'PROJECTS', label: 'Capstone Projects', icon: '🛠️', desc: 'Build production-ready web apps' },
  { id: 'QUIZZES', label: 'Interactive Quizzes', icon: '❓', desc: 'Rapid checkpoint assessments' }
];

const EXPLANATION_STYLES = [
  { id: 'SIMPLE', label: 'Intuitive & Jargon-Free', desc: 'Clear real-world analogies before code' },
  { id: 'STEP_BY_STEP', label: 'Sequential Step-by-Step', desc: 'Chronological guidance, logical milestones' },
  { id: 'TECHNICAL', label: 'Under-the-Hood Mechanics', desc: 'Deep technical analysis & memory models' },
  { id: 'EXAMPLES_FIRST', label: 'Code Examples First', desc: 'Working code snippet first, theory second' }
];

const PRACTICE_STYLES = [
  { id: 'CODING_PROBLEMS', label: 'Algorithmic Challenges', desc: 'Placement-level problem sets with test cases' },
  { id: 'MINI_PROJECTS', label: 'Mini-Feature Builds', desc: 'Implement modular full-stack capabilities' },
  { id: 'MCQS', label: 'Knowledge Checkers', desc: 'Validate core theoretical concepts quickly' },
  { id: 'REAL_WORLD', label: 'Debugging & Diagnostics', desc: 'Troubleshoot realistic production issues' }
];

const PREFERRED_WINDOWS = [
  { id: 'MORNING', label: 'Morning Focus (6 AM - 12 PM)' },
  { id: 'AFTERNOON', label: 'Afternoon Flow (12 PM - 5 PM)' },
  { id: 'EVENING', label: 'Evening Intensive (5 PM - 9 PM)' },
  { id: 'NIGHT', label: 'Late Night (9 PM - 2 AM)' },
  { id: 'FLEXIBLE', label: 'Adaptive / Varied Schedule' }
];

const TOPIC_SUGGESTIONS = [
  'Java Spring Boot', 'React 19', 'SQL Joins & Indexing', 'Binary Trees',
  'Dynamic Programming', 'Docker & Kubernetes', 'System Architecture',
  'TypeScript', 'REST API Design', 'Microservices'
];

export const ProfileView = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);

  // Skills interactive state
  const [skillSearch, setSkillSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicLevel, setNewTopicLevel] = useState('BEGINNER');
  const [addingSkill, setAddingSkill] = useState(false);

  // Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCareerGoal, setEditCareerGoal] = useState('');
  const [editEducationLevel, setEditEducationLevel] = useState('');
  const [editAcademicBackground, setEditAcademicBackground] = useState('');
  const [editExperienceLevel, setEditExperienceLevel] = useState('BEGINNER');

  // Progressive Disclosure Accordions
  const [preferencesOpen, setPreferencesOpen] = useState(true);
  const [aiChamberOpen, setAiChamberOpen] = useState(true);

  // Preferences Form State
  const [dailyHours, setDailyHours] = useState(2.0);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [preferredTime, setPreferredTime] = useState('EVENING');
  const [selectedMethods, setSelectedMethods] = useState(['VIDEO', 'CODING_PRACTICE']);
  const [explanationStyle, setExplanationStyle] = useState('STEP_BY_STEP');
  const [practiceStyle, setPracticeStyle] = useState('CODING_PROBLEMS');
  const [aiNotes, setAiNotes] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, skillsData, goalsData] = await Promise.all([
        getStudentProfile().catch(() => null),
        getSkills().catch(() => []),
        getGoals().catch(() => [])
      ]);

      if (profileData) {
        setProfile(profileData);
        setEditCareerGoal(profileData.careerGoal || '');
        setEditEducationLevel(profileData.educationLevel || '');
        setEditAcademicBackground(profileData.academicBackground || '');
        setEditExperienceLevel(profileData.experienceLevel || 'BEGINNER');
        setDailyHours(profileData.dailyStudyHours || 2.0);
        setDaysPerWeek(profileData.availableDaysPerWeek || 5);
        setPreferredTime(profileData.preferredStudyTime || 'EVENING');
        setExplanationStyle(profileData.explanationStyle || 'STEP_BY_STEP');
        setPracticeStyle(profileData.practiceStyle || 'CODING_PROBLEMS');
        setAiNotes(profileData.additionalContext || '');

        if (profileData.learningMethods) {
          setSelectedMethods(profileData.learningMethods.split(',').map(s => s.trim()).filter(Boolean));
        }
      }

      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateStudentProfile({
        careerGoal: editCareerGoal,
        educationLevel: editEducationLevel,
        academicBackground: editAcademicBackground,
        experienceLevel: editExperienceLevel,
        dailyStudyHours: dailyHours,
        availableDaysPerWeek: daysPerWeek,
        preferredStudyTime: preferredTime,
        learningMethods: selectedMethods.join(','),
        explanationStyle,
        practiceStyle,
        additionalContext: aiNotes
      });
      setProfile(updated);
      setIsEditModalOpen(false);
      showToast('Profile saved successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Error saving profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (e) => {
    if (e) e.preventDefault();
    if (!newTopicName.trim()) return;

    setAddingSkill(true);
    try {
      const saved = await upsertSkill({
        topicName: newTopicName.trim(),
        knowledgeLevel: newTopicLevel
      });

      setSkills(prev => {
        const filtered = prev.filter(s => s.topicName.toLowerCase() !== saved.topicName.toLowerCase());
        return [...filtered, saved].sort((a, b) => a.topicName.localeCompare(b.topicName));
      });

      setNewTopicName('');
      setIsSkillModalOpen(false);
      showToast(`Skill "${saved.topicName}" calibrated!`);

      const p = await getStudentProfile();
      setProfile(p);
    } catch (err) {
      console.error('Error adding skill:', err);
      showToast('Could not save skill.');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleCycleSkillLevel = async (skill) => {
    const sequence = ['NOT_LEARNED', 'BEGINNER', 'INTERMEDIATE', 'MASTERED'];
    const currentIdx = sequence.indexOf(skill.knowledgeLevel);
    const nextLevel = sequence[(currentIdx + 1) % sequence.length];

    try {
      const updated = await updateSkillLevel(skill.id, nextLevel);
      setSkills(prev => prev.map(s => (s.id === skill.id ? updated : s)));
      const p = await getStudentProfile();
      setProfile(p);
    } catch (err) {
      console.error('Error updating level:', err);
    }
  };

  const handleDeleteSkill = async (skillId, topicName) => {
    try {
      await deleteSkill(skillId);
      setSkills(prev => prev.filter(s => s.id !== skillId));
      showToast(`Removed "${topicName}".`);
      const p = await getStudentProfile();
      setProfile(p);
    } catch (err) {
      console.error('Error deleting skill:', err);
    }
  };

  const toggleMethod = (id) => {
    setSelectedMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = s.topicName.toLowerCase().includes(skillSearch.toLowerCase());
      const matchesFilter = skillFilter === 'ALL' || s.knowledgeLevel === skillFilter;
      return matchesSearch && matchesFilter;
    });
  }, [skills, skillSearch, skillFilter]);

  if (!user) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto my-12 animate-fade-slide">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Student Profile Protected</h2>
        <p className="text-xs text-slate-500 mt-1">Please sign in to access your personal learning workspace.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-64 rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 rounded-3xl bg-slate-200/50" />
          <div className="h-32 rounded-3xl bg-slate-200/50" />
          <div className="h-32 rounded-3xl bg-slate-200/50" />
        </div>
      </div>
    );
  }

  const completionPct = profile?.completionPercentage || 30;

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16 animate-fade-slide">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-fade-slide">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── SECTION 1: SCHOLAR HERO HUB (Atmospheric Dark & Indigo) ── */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-800/80 bg-slate-950 text-white p-7 md:p-10">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <div className="w-22 h-22 rounded-3xl gradient-primary flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/30 ring-4 ring-white/10">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-slate-950">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{user.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wider">
                  {formatEnum(profile?.experienceLevel || 'BEGINNER')} SCHOLAR
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span className="flex items-center space-x-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/10 text-xs font-medium text-slate-200 border border-white/10">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Goal: <strong>{profile?.careerGoal || 'Add your target career'}</strong></span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/10 text-xs font-medium text-slate-200 border border-white/10">
                  <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                  <span>{profile?.educationLevel || 'Add Academic Background'}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="self-start lg:self-center inline-flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/15 shadow-sm transition-all duration-200 hover:scale-102 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile Info</span>
          </button>
        </div>

        {/* Readiness Meter & Live Pulse */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 items-center">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Curriculum Personalization Readiness</span>
              </span>
              <span className="font-mono font-black text-cyan-300 text-sm">{completionPct}% Complete</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
              <div
                className="gradient-accent h-1.5 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {completionPct >= 75
                ? '✨ Complete profile! Gemini curates custom lesson depths and skips concepts you already know.'
                : 'Tip: Add your preferred explanation style and topic ratings to generate pinpoint-accurate roadmaps.'}
            </p>
          </div>

          {/* Quick Metrics Cluster */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Skills</span>
              <div className="text-xl font-black text-cyan-300 mt-0.5">{skills.length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pace</span>
              <div className="text-xl font-black text-violet-300 mt-0.5">{dailyHours}h</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Goals</span>
              <div className="text-xl font-black text-emerald-300 mt-0.5">{goals.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: INTERACTIVE SKILL MATRIX ── */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl gradient-primary text-white shadow-xs">
                <Brain className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Topic-Level Knowledge Calibration</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Tap any badge to cycle your mastery level. Gemini fast-tracks mastered topics and deep-dives into unfamiliar areas.
            </p>
          </div>

          <button
            onClick={() => setIsSkillModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 gradient-primary hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skill or Topic</span>
          </button>
        </div>

        {/* Filter Tabs & Instant Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search calibrated skills..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'MASTERED', 'INTERMEDIATE', 'BEGINNER', 'NOT_LEARNED'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSkillFilter(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  skillFilter === lvl
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {lvl === 'ALL' ? 'All Skills' : lvl.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Cards Grid */}
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {filteredSkills.map(skill => {
              const meta = KNOWLEDGE_LEVELS.find(k => k.value === skill.knowledgeLevel) || KNOWLEDGE_LEVELS[3];
              return (
                <div
                  key={skill.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 card-hover-lift flex flex-col justify-between group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">{skill.topicName}</span>
                    <button
                      onClick={() => handleDeleteSkill(skill.id, skill.topicName)}
                      className="text-slate-300 hover:text-rose-500 transition p-1"
                      title="Remove skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleCycleSkillLevel(skill)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center space-x-1.5 ${meta.badge}`}
                      title="Click to cycle knowledge level"
                    >
                      <span>{meta.label}</span>
                      <RefreshCw className="w-3 h-3 opacity-60 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">Click to upgrade</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-100/60 border border-dashed border-slate-300 text-center">
            <Brain className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No skills calibrated yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your current technical competencies to automatically fine-tune your roadmap pace.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md mx-auto">
              {TOPIC_SUGGESTIONS.slice(0, 6).map(sug => (
                <button
                  key={sug}
                  onClick={() => {
                    setNewTopicName(sug);
                    setIsSkillModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3 text-indigo-500" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: PROGRESSIVE DISCLOSURE — COGNITIVE PREFERENCES ── */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <button
          onClick={() => setPreferencesOpen(!preferencesOpen)}
          className="w-full p-6 md:p-8 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-2xl gradient-accent text-white shadow-xs">
              <Sliders className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">Cognitive Learning Preferences</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure how you absorb concepts, practice coding, and structure your study schedule.
              </p>
            </div>
          </div>
          <div className="text-slate-400 p-1">
            {preferencesOpen ? <ChevronDown className="w-5 h-5 rotate-180 transition-transform duration-200" /> : <ChevronDown className="w-5 h-5 transition-transform duration-200" />}
          </div>
        </button>

        {preferencesOpen && (
          <div className="px-6 md:px-8 pb-8 pt-2 border-t border-slate-100 space-y-6">
            {/* Preferred Learning Methods */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Preferred Learning Formats (Multi-select)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {LEARNING_METHODS.map(opt => {
                  const isSelected = selectedMethods.includes(opt.id);
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => toggleMethod(opt.id)}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{opt.icon}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-bold text-slate-900 block">{opt.label}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation & Pedagogy Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Pedagogical & Explanation Style
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXPLANATION_STYLES.map(style => (
                  <button
                    type="button"
                    key={style.id}
                    onClick={() => setExplanationStyle(style.id)}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      explanationStyle === style.id
                        ? 'bg-violet-50/80 border-violet-400 ring-2 ring-violet-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{style.label}</span>
                      {explanationStyle === style.id && <Check className="w-4 h-4 text-violet-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Style */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Practice & Verification Style
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRACTICE_STYLES.map(style => (
                  <button
                    type="button"
                    key={style.id}
                    onClick={() => setPracticeStyle(style.id)}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      practiceStyle === style.id
                        ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{style.label}</span>
                      {practiceStyle === style.id && <Check className="w-4 h-4 text-cyan-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Schedule Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Study Hours: <span className="text-indigo-600 font-extrabold">{dailyHours}h</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.5h</span>
                  <span>4h</span>
                  <span>8h</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Days / Week: <span className="text-indigo-600 font-extrabold">{daysPerWeek} days</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1 day</span>
                  <span>5 days</span>
                  <span>7 days</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Focus Time Window
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {PREFERRED_WINDOWS.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 4: AI CONTEXT CHAMBER ── */}
      <section className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50 rounded-3xl border border-indigo-100/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-xl gradient-primary text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
              What should your AI Study Planner know about you?
            </h2>
            <p className="text-xs text-slate-500">
              Your learning bottlenecks, target companies, or areas where you need patient step-by-step guidance.
            </p>
          </div>
        </div>

        <textarea
          rows="4"
          value={aiNotes}
          onChange={(e) => setAiNotes(e.target.value)}
          placeholder="e.g. I have basic Java familiarity but I struggle when solving dynamic programming and recursion problems. I have 2 hours daily and want to prepare for placement interviews. Please provide concrete examples first before explaining theoretical memory models..."
          className="w-full p-4 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs resize-y mt-2"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          <span className="text-[11px] text-slate-400">
            This personal context is securely injected into every Gemini curriculum synthesis prompt.
          </span>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 gradient-primary hover:opacity-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Save Preferences & AI Context</span>
          </button>
        </div>
      </section>

      {/* ── MODAL: EDIT OVERVIEW ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-fade-slide">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Academic & Career Background</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Career Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Java Full-Stack Engineer"
                  value={editCareerGoal}
                  onChange={(e) => setEditCareerGoal(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Education Level</label>
                <input
                  type="text"
                  placeholder="e.g. Undergraduate (B.Tech Computer Science)"
                  value={editEducationLevel}
                  onChange={(e) => setEditEducationLevel(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Academic Background / Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Mechanical Engineering, Self-Taught"
                  value={editAcademicBackground}
                  onChange={(e) => setEditAcademicBackground(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Overall Technical Experience Level</label>
                <select
                  value={editExperienceLevel}
                  onChange={(e) => setEditExperienceLevel(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="BEGINNER">Beginner (Foundations & Core Syntax)</option>
                  <option value="INTERMEDIATE">Intermediate (Problem Solving & Design Patterns)</option>
                  <option value="ADVANCED">Advanced (Enterprise Architecture & Concurrency)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold gradient-primary text-white rounded-xl shadow-xs transition hover:opacity-95"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SKILL ── */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fade-slide">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Add Skill or Topic Knowledge</h3>
              <button onClick={() => setIsSkillModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic Name or Technology</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ArrayList, SQL Joins, Binary Trees"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Knowledge Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {KNOWLEDGE_LEVELS.map(lvl => (
                    <button
                      type="button"
                      key={lvl.value}
                      onClick={() => setNewTopicLevel(lvl.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                        newTopicLevel === lvl.value
                          ? `${lvl.badge} ring-2`
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSkillModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSkill}
                  className="px-5 py-2 text-xs font-bold gradient-primary text-white rounded-xl shadow-xs transition hover:opacity-95"
                >
                  {addingSkill ? 'Adding...' : 'Calibrate Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
