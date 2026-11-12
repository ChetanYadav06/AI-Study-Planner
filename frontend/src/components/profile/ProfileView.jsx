import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Briefcase,
  GraduationCap,
  Sparkles,
  Edit3,
  X,
  Plus
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
import { Button, Card, ProgressBar } from '../ui';
import { TopicsKnowledgeSection, KNOWLEDGE_LEVELS } from './TopicsKnowledgeSection';
import { LearningPreferencesSection } from './LearningPreferencesSection';

export const ProfileView = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);

  // Add Topic Modal State
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

  // Save Academic & Career background from Edit Modal
  const handleSaveAcademicProfile = async (e) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        careerGoal: editCareerGoal,
        educationLevel: editEducationLevel,
        academicBackground: editAcademicBackground,
        experienceLevel: editExperienceLevel,
        // preserve existing preferences
        dailyStudyHours: profile?.dailyStudyHours || 2.0,
        availableDaysPerWeek: profile?.availableDaysPerWeek || 5,
        preferredStudyTime: profile?.preferredStudyTime || 'EVENING',
        learningMethods: profile?.learningMethods || 'VIDEO,CODING_PRACTICE',
        explanationStyle: profile?.explanationStyle || 'STEP_BY_STEP',
        practiceStyle: profile?.practiceStyle || 'CODING_PROBLEMS',
        additionalContext: profile?.additionalContext || ''
      };

      const updated = await updateStudentProfile(payload);
      setProfile(updated);
      setIsEditModalOpen(false);
      showToast('Profile information updated.');
    } catch (err) {
      console.error('Failed to update academic profile:', err);
      showToast('Error saving profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Learning Preferences section
  const handleSavePreferences = async (preferencesData) => {
    setSavingPreferences(true);
    try {
      const payload = {
        careerGoal: profile?.careerGoal || editCareerGoal,
        educationLevel: profile?.educationLevel || editEducationLevel,
        academicBackground: profile?.academicBackground || editAcademicBackground,
        experienceLevel: profile?.experienceLevel || editExperienceLevel,
        ...preferencesData
      };

      const updated = await updateStudentProfile(payload);
      setProfile(updated);
      showToast('Learning preferences saved and synchronized with Gemini.');
    } catch (err) {
      console.error('Failed to update learning preferences:', err);
      showToast('Error saving preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Topic Knowledge handlers
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
      showToast(`Topic "${saved.topicName}" added as ${saved.knowledgeLevel.toLowerCase()}.`);

      const p = await getStudentProfile();
      setProfile(p);
    } catch (err) {
      console.error('Error adding skill:', err);
      showToast('Could not save topic.');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleUpdateLevel = async (skillId, nextLevel) => {
    try {
      const updated = await updateSkillLevel(skillId, nextLevel);
      setSkills(prev => prev.map(s => (s.id === skillId ? updated : s)));
      showToast(`Updated to ${nextLevel.toLowerCase().replace('_', ' ')}.`);
      const p = await getStudentProfile();
      setProfile(p);
    } catch (err) {
      console.error('Error updating topic level:', err);
      showToast('Failed to update topic level.');
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
      showToast('Failed to delete topic.');
    }
  };

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
      <div className="space-y-6 max-w-5xl mx-auto py-2">
        <div className="h-44 rounded-xl bg-page border border-line animate-pulse" />
        <div className="h-80 rounded-xl bg-page border border-line animate-pulse" />
        <div className="h-96 rounded-xl bg-page border border-line animate-pulse" />
      </div>
    );
  }

  const completionPct = profile?.completionPercentage || 30;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-surface text-xs font-medium px-4 py-2.5 rounded-md shadow-md flex items-center space-x-2 border border-line animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── SECTION 0: STUDENT OVERVIEW & PERSONALIZATION READINESS ── */}
      <Card className="p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-full bg-accent-soft text-accent border border-accent/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-2xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-ink tracking-tight">{user.name}</h1>
                <span className="text-xs text-muted font-medium">
                  • {formatEnum(profile?.experienceLevel || 'BEGINNER')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                {profile?.careerGoal ? (
                  <span className="inline-flex items-center gap-1.5 text-ink font-medium bg-page px-2 py-0.5 rounded border border-line">
                    <Briefcase className="w-3.5 h-3.5 text-accent" />
                    <span>Role: {profile.careerGoal}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-accent hover:underline cursor-pointer font-medium"
                  >
                    + Add target career role
                  </button>
                )}
                {profile?.educationLevel ? (
                  <span className="inline-flex items-center gap-1.5 text-ink font-medium bg-page px-2 py-0.5 rounded border border-line">
                    <GraduationCap className="w-3.5 h-3.5 text-accent" />
                    <span>{profile.educationLevel}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-accent hover:underline cursor-pointer font-medium"
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
            Edit background
          </Button>
        </div>

        {/* Readiness Meter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-ink">Personalization & AI Calibration Readiness</span>
            <span className="font-mono font-bold text-accent">{completionPct}% calibrated</span>
          </div>
          <ProgressBar value={completionPct} />
          <p className="text-xs text-muted leading-relaxed">
            {completionPct >= 75
              ? 'Profile fully calibrated. Gemini personalizes explanation depths, exercises, and time allocations to your exact background.'
              : 'Add topics you have already mastered or want to learn, and customize your study pacing below to generate hyper-calibrated roadmaps.'}
          </p>
        </div>
      </Card>

      {/* ── SECTION 1: TOPICS & KNOWLEDGE ── */}
      <TopicsKnowledgeSection
        skills={skills}
        onUpdateLevel={handleUpdateLevel}
        onDeleteSkill={handleDeleteSkill}
        onOpenAddModal={() => setIsSkillModalOpen(true)}
      />

      {/* ── SECTION 2: LEARNING PREFERENCES ── */}
      <LearningPreferencesSection
        initialProfile={profile}
        onSavePreferences={handleSavePreferences}
        isSaving={savingPreferences}
      />

      {/* ── MODAL: EDIT BACKGROUND ── */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-surface rounded-lg max-w-md w-full p-6 border border-line shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-ink">Academic & Career Background</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-ink p-1 rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademicProfile} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Target Career Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Java Full-Stack Engineer"
                  value={editCareerGoal}
                  onChange={(e) => setEditCareerGoal(e.target.value)}
                  className="w-full p-2 text-xs rounded-md bg-page border border-line text-ink focus:border-accent focus:bg-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Education Level</label>
                <input
                  type="text"
                  placeholder="e.g. Undergraduate (B.Tech Computer Science)"
                  value={editEducationLevel}
                  onChange={(e) => setEditEducationLevel(e.target.value)}
                  className="w-full p-2 text-xs rounded-md bg-page border border-line text-ink focus:border-accent focus:bg-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Academic Background / Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, Mechanical Engineering, Self-Taught"
                  value={editAcademicBackground}
                  onChange={(e) => setEditAcademicBackground(e.target.value)}
                  className="w-full p-2 text-xs rounded-md bg-page border border-line text-ink focus:border-accent focus:bg-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">General Experience Level</label>
                <select
                  value={editExperienceLevel}
                  onChange={(e) => setEditExperienceLevel(e.target.value)}
                  className="w-full p-2 text-xs rounded-md bg-page border border-line text-ink focus:border-accent focus:bg-surface outline-none font-medium"
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
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving...' : 'Save Background'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD TOPIC KNOWLEDGE ── */}
      {isSkillModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsSkillModalOpen(false)}
        >
          <div
            className="bg-surface rounded-lg max-w-sm w-full p-6 border border-line shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-ink">Add Topic Competency</h3>
              <button
                type="button"
                onClick={() => setIsSkillModalOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-ink p-1 rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ArrayList, SQL Joins, Binary Trees"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-md bg-page border border-line text-ink focus:border-accent focus:bg-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Initial Knowledge Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {KNOWLEDGE_LEVELS.map(lvl => (
                    <button
                      type="button"
                      key={lvl.value}
                      onClick={() => setNewTopicLevel(lvl.value)}
                      className={`p-2.5 rounded-md border text-xs font-medium transition cursor-pointer text-left ${
                        newTopicLevel === lvl.value
                          ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                          : 'border-line bg-page text-muted hover:text-ink'
                      }`}
                    >
                      <div className="font-semibold">{lvl.label}</div>
                      <div className="text-[10px] text-muted truncate mt-0.5">{lvl.shortLabel}</div>
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
                  {addingSkill ? 'Saving...' : 'Add Topic'}
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
