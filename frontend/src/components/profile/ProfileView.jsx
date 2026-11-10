import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Briefcase,
  GraduationCap,
  Plus,
  Trash2,
  Search,
  Check,
  Edit3,
  X,
  Loader2,
  RefreshCw,
  Video,
  BookOpen,
  Code,
  Layers,
  HelpCircle
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
import { Button, Card, ProgressBar, StatusText } from '../ui';

const KNOWLEDGE_LEVELS = [
  { value: 'MASTERED', label: 'Mastered' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'NOT_LEARNED', label: 'Not Learned' }
];

const LEARNING_METHODS = [
  { id: 'VIDEO', label: 'Video Lessons', Icon: Video, desc: 'Visual concepts & code screencasts' },
  { id: 'READING', label: 'Documentation & Notes', Icon: BookOpen, desc: 'Official guides & comprehensive cheat-sheets' },
  { id: 'CODING_PRACTICE', label: 'Hands-on Coding', Icon: Code, desc: 'Active problem solving in the IDE' },
  { id: 'PROJECTS', label: 'Capstone Projects', Icon: Layers, desc: 'Build production-ready web apps' },
  { id: 'QUIZZES', label: 'Interactive Quizzes', Icon: HelpCircle, desc: 'Rapid checkpoint assessments' }
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
  'Java Spring Boot', 'React', 'SQL Joins & Indexing', 'Binary Trees',
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
      showToast('Profile saved successfully.');
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
      showToast(`Skill "${saved.topicName}" calibrated.`);

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
      <Card className="p-8 text-center max-w-md mx-auto my-12">
        <User className="w-10 h-10 text-muted mx-auto mb-2" />
        <h2 className="text-base font-semibold text-ink">Student Profile Protected</h2>
        <p className="text-xs text-muted mt-1">Please sign in to access your personal learning workspace.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-40 rounded-[10px] bg-page border border-line animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-24 rounded-[8px] bg-page border border-line animate-pulse" />
          <div className="h-24 rounded-[8px] bg-page border border-line animate-pulse" />
          <div className="h-24 rounded-[8px] bg-page border border-line animate-pulse" />
        </div>
      </div>
    );
  }

  const completionPct = profile?.completionPercentage || 30;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-surface text-xs font-medium px-4 py-2.5 rounded-[8px] shadow-sm flex items-center space-x-2 border border-line">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── SECTION 1: HEADER & READINESS ── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent border border-line flex items-center justify-center text-lg font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold text-ink">{user.name}</h1>
                <span className="text-xs text-muted">
                  ({formatEnum(profile?.experienceLevel || 'BEGINNER')})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile?.careerGoal ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Briefcase className="w-3.5 h-3.5 text-accent" />
                    <span>Goal: {profile.careerGoal}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-accent hover:underline cursor-pointer"
                  >
                    + Add target career
                  </button>
                )}
                {profile?.educationLevel ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted ml-2">
                    <GraduationCap className="w-3.5 h-3.5 text-accent" />
                    <span>{profile.educationLevel}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-accent hover:underline cursor-pointer ml-2"
                  >
                    + Add academic background
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            icon={Edit3}
            className="self-start sm:self-center"
          >
            Edit profile
          </Button>
        </div>

        {/* Readiness Meter */}
        <div className="pt-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-ink">Personalization readiness</span>
            <span className="font-mono font-medium text-accent">{completionPct}%</span>
          </div>
          <ProgressBar value={completionPct} />
          <p className="text-xs text-muted">
            {completionPct >= 75
              ? 'Complete profile. Gemini curates custom lesson depths based on your topics and preferences.'
              : 'Add your preferred explanation style and topic ratings to generate calibrated roadmaps.'}
          </p>
        </div>
      </Card>

      {/* ── SECTION 2: TOPICS MATRIX ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Topics</h2>
            <p className="text-xs text-muted mt-0.5">
              Click a topic to change your level. This changes how the roadmap is generated.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSkillModalOpen(true)}
            icon={Plus}
            className="self-start sm:self-center"
          >
            Add topic
          </Button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search topics..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'MASTERED', 'INTERMEDIATE', 'BEGINNER', 'NOT_LEARNED'].map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSkillFilter(lvl)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition cursor-pointer ${
                  skillFilter === lvl
                    ? 'bg-ink text-surface'
                    : 'bg-page text-muted hover:text-ink border border-line'
                }`}
              >
                {lvl === 'ALL' ? 'All' : lvl.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Cards Grid */}
        {filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredSkills.map(skill => {
              const meta = KNOWLEDGE_LEVELS.find(k => k.value === skill.knowledgeLevel) || KNOWLEDGE_LEVELS[3];
              return (
                <div
                  key={skill.id}
                  className="p-3 rounded-[8px] bg-surface border border-line flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-ink truncate">{skill.topicName}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill.id, skill.topicName)}
                      className="text-muted hover:text-danger transition p-0.5"
                      title="Remove topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => handleCycleSkillLevel(skill)}
                      className="text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to cycle knowledge level"
                    >
                      <span>{meta.label}</span>
                      <RefreshCw className="w-3 h-3 opacity-60" />
                    </button>
                    <span className="text-xs text-muted">Click to change</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-[8px] bg-page border border-line text-center text-muted">
            <p className="text-xs">No topics recorded yet.</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-md mx-auto">
              {TOPIC_SUGGESTIONS.slice(0, 6).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setNewTopicName(sug);
                    setIsSkillModalOpen(true);
                  }}
                  className="px-2 py-1 bg-surface border border-line text-ink hover:border-accent rounded-[4px] text-xs font-medium transition cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: LEARNING PREFERENCES ── */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Learning preferences</h2>
          <p className="text-xs text-muted mt-0.5">
            Configure how concepts are broken down, practiced, and scheduled.
          </p>
        </div>

        {/* Preferred Learning Formats */}
        <div>
          <label className="block text-xs font-medium text-ink mb-2">
            Preferred learning formats
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {LEARNING_METHODS.map(opt => {
              const isSelected = selectedMethods.includes(opt.id);
              const Icon = opt.Icon;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleMethod(opt.id)}
                  className={`p-3 rounded-[8px] border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface hover:border-slate-300 text-ink'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-muted'}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-medium block">{opt.label}</span>
                    <p className="text-xs text-muted mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation Style */}
        <div>
          <label className="block text-xs font-medium text-ink mb-2">
            Pedagogy & explanation style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPLANATION_STYLES.map(style => {
              const isSelected = explanationStyle === style.id;
              return (
                <button
                  type="button"
                  key={style.id}
                  onClick={() => setExplanationStyle(style.id)}
                  className={`p-3 rounded-[8px] border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface hover:border-slate-300 text-ink'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{style.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{style.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Practice Style */}
        <div>
          <label className="block text-xs font-medium text-ink mb-2">
            Practice & verification style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRACTICE_STYLES.map(style => {
              const isSelected = practiceStyle === style.id;
              return (
                <button
                  type="button"
                  key={style.id}
                  onClick={() => setPracticeStyle(style.id)}
                  className={`p-3 rounded-[8px] border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface hover:border-slate-300 text-ink'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{style.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[2.5]" />}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{style.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Schedule Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-line">
          <div className="p-3 rounded-[8px] bg-page border border-line">
            <label className="block text-xs font-medium text-ink mb-1">
              Daily study hours: <span className="font-mono text-accent">{dailyHours}h</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.5"
              value={dailyHours}
              onChange={(e) => setDailyHours(parseFloat(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>0.5h</span>
              <span>4h</span>
              <span>8h</span>
            </div>
          </div>

          <div className="p-3 rounded-[8px] bg-page border border-line">
            <label className="block text-xs font-medium text-ink mb-1">
              Days / week: <span className="font-mono text-accent">{daysPerWeek}d</span>
            </label>
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>1d</span>
              <span>5d</span>
              <span>7d</span>
            </div>
          </div>

          <div className="p-3 rounded-[8px] bg-page border border-line flex flex-col justify-between">
            <label className="block text-xs font-medium text-ink mb-1">
              Focus time window
            </label>
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none font-medium"
            >
              {PREFERRED_WINDOWS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* ── SECTION 4: AI CONTEXT NOTES ── */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            What should your AI Study Planner know about you?
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Your learning bottlenecks, target companies, or areas where you need patient step-by-step guidance.
          </p>
        </div>

        <textarea
          rows={3}
          value={aiNotes}
          onChange={(e) => setAiNotes(e.target.value)}
          placeholder="e.g. I have basic Java familiarity but struggle with dynamic programming. I have 2 hours daily and want to prepare for placement interviews."
          className="w-full p-3 rounded-[6px] bg-surface border border-line text-xs text-ink placeholder:text-muted focus:border-accent outline-none resize-y"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted">
            This context is passed to Gemini when generating roadmaps.
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProfile}
            disabled={saving}
            icon={saving ? Loader2 : Check}
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </Button>
        </div>
      </Card>

      {/* ── MODAL: EDIT OVERVIEW ── */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-surface rounded-[10px] max-w-md w-full p-6 border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-ink">Academic & career background</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-ink p-1 rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Target career role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Java Full-Stack Engineer"
                  value={editCareerGoal}
                  onChange={(e) => setEditCareerGoal(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Education level</label>
                <input
                  type="text"
                  placeholder="e.g. Undergraduate (B.Tech Computer Science)"
                  value={editEducationLevel}
                  onChange={(e) => setEditEducationLevel(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Academic background / specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Mechanical Engineering, Self-Taught"
                  value={editAcademicBackground}
                  onChange={(e) => setEditAcademicBackground(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Experience level</label>
                <select
                  value={editExperienceLevel}
                  onChange={(e) => setEditExperienceLevel(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none font-medium"
                >
                  <option value="BEGINNER">Beginner (Foundations & Core Syntax)</option>
                  <option value="INTERMEDIATE">Intermediate (Problem Solving & Design Patterns)</option>
                  <option value="ADVANCED">Advanced (Enterprise Architecture & Concurrency)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SKILL ── */}
      {isSkillModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsSkillModalOpen(false)}
        >
          <div
            className="bg-surface rounded-[10px] max-w-sm w-full p-6 border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-ink">Add topic knowledge</h3>
              <button
                type="button"
                onClick={() => setIsSkillModalOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-ink p-1 rounded-[4px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Topic name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ArrayList, SQL Joins, Binary Trees"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] bg-surface border border-line text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Knowledge level</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {KNOWLEDGE_LEVELS.map(lvl => (
                    <button
                      type="button"
                      key={lvl.value}
                      onClick={() => setNewTopicLevel(lvl.value)}
                      className={`p-2 rounded-[6px] border text-xs font-medium transition cursor-pointer text-left ${
                        newTopicLevel === lvl.value
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSkillModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={addingSkill}
                >
                  {addingSkill ? 'Adding...' : 'Save topic'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
