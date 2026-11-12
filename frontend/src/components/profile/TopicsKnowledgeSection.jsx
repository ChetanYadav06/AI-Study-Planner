import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Code2,
  Database,
  Cpu,
  Terminal,
  Server,
  Layers,
  Check,
  ChevronDown
} from 'lucide-react';
import { Card, Button, ConfirmDialog } from '../ui';

export const KNOWLEDGE_LEVELS = [
  {
    value: 'MASTERED',
    label: 'Mastered',
    shortLabel: 'Mastered',
    description: 'Deep understanding, can implement and optimize effortlessly',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    activeBtnClass: 'bg-emerald-600 text-white shadow-xs'
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermediate',
    shortLabel: 'Familiar',
    description: 'Good working knowledge, can solve realistic tasks with occasional lookup',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
    activeBtnClass: 'bg-teal-600 text-white shadow-xs'
  },
  {
    value: 'BEGINNER',
    label: 'Beginner',
    shortLabel: 'Beginner',
    description: 'Basic conceptual awareness, actively learning fundamentals',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
    activeBtnClass: 'bg-amber-600 text-white shadow-xs'
  },
  {
    value: 'NOT_LEARNED',
    label: 'Not Learned',
    shortLabel: 'New',
    description: 'Unfamiliar topic, requires introductory theory and scaffolding',
    badgeClass: 'bg-page text-muted border-line',
    dotClass: 'bg-slate-400',
    activeBtnClass: 'bg-slate-700 text-white shadow-xs'
  }
];

const CATEGORY_META = {
  'Placement & Algorithms': {
    icon: Code2,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    keywords: ['array', 'tree', 'graph', 'dynamic programming', 'binary', 'search', 'sort', 'algorithm', 'stack', 'queue', 'heap', 'recursion', 'linked', 'hash', 'matrix', 'trie', 'dsa', 'leetcode']
  },
  'Enterprise Web & Frontend': {
    icon: Layers,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    keywords: ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'redux', 'next', 'vite', 'frontend', 'dom', 'ui', 'hooks']
  },
  'Backend & Architecture': {
    icon: Server,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    keywords: ['java', 'spring', 'boot', 'node', 'express', 'django', 'fastapi', 'microservice', 'rest', 'api', 'graphql', 'auth', 'security', 'jwt', 'docker', 'kubernetes', 'kafka', 'grpc']
  },
  'Data & Database Engineering': {
    icon: Database,
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    keywords: ['sql', 'database', 'mysql', 'postgres', 'mongodb', 'redis', 'nosql', 'indexing', 'join', 'acid', 'transaction', 'queries', 'schema']
  },
  'AI, Machine Learning & Python': {
    icon: Cpu,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    keywords: ['python', 'ml', 'ai', 'pandas', 'numpy', 'tensor', 'pytorch', 'machine learning', 'deep learning', 'nlp', 'scikit', 'model', 'data science']
  },
  'Core Computer Science': {
    icon: Terminal,
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    keywords: ['os', 'operating system', 'network', 'system design', 'concurrency', 'multithreading', 'compiler', 'memory', 'git', 'linux']
  }
};

export const inferCategory = (topicName = '') => {
  const lower = topicName.toLowerCase();
  for (const [catName, meta] of Object.entries(CATEGORY_META)) {
    if (meta.keywords.some(kw => lower.includes(kw))) {
      return catName;
    }
  }
  return 'General Engineering';
};

export const TopicsKnowledgeSection = ({
  skills = [],
  onUpdateLevel,
  onDeleteSkill,
  onOpenAddModal
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Counts by level
  const counts = {
    ALL: skills.length,
    MASTERED: skills.filter(s => s.knowledgeLevel === 'MASTERED').length,
    INTERMEDIATE: skills.filter(s => s.knowledgeLevel === 'INTERMEDIATE').length,
    BEGINNER: skills.filter(s => s.knowledgeLevel === 'BEGINNER').length,
    NOT_LEARNED: skills.filter(s => s.knowledgeLevel === 'NOT_LEARNED').length
  };

  // Filter skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.topicName.toLowerCase().includes(search.trim().toLowerCase());
    const matchesLevel = activeFilter === 'ALL' || skill.knowledgeLevel === activeFilter;
    const category = inferCategory(skill.topicName);
    const matchesCat = selectedCategory === 'ALL' || category === selectedCategory;
    return matchesSearch && matchesLevel && matchesCat;
  });

  // Group by category
  const groupedByCategory = filteredSkills.reduce((acc, skill) => {
    const cat = inferCategory(skill.topicName);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  // Available categories across all current skills
  const availableCategories = Array.from(new Set(skills.map(s => inferCategory(s.topicName))));

  const handleLevelSelect = async (skillId, nextLevel) => {
    setUpdatingId(skillId);
    try {
      await onUpdateLevel(skillId, nextLevel);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!skillToDelete) return;
    try {
      await onDeleteSkill(skillToDelete.id, skillToDelete.topicName);
    } finally {
      setSkillToDelete(null);
    }
  };

  return (
    <Card className="p-6 sm:p-7 space-y-6">
      {/* 1. Header with Title, Description, and Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-line">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Knowledge Calibration
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight">
            Topics & Competency Knowledge
          </h2>
          <p className="text-xs sm:text-[13px] text-muted leading-relaxed">
            Record what you already know and what you are learning. Gemini uses these ratings to bypass elementary tutorials for mastered topics and scaffold beginner concepts.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenAddModal}
          className="gap-1.5 self-start sm:self-center shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add topic</span>
        </Button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Compact Search Field */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search topics by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-page border border-line text-ink placeholder:text-muted focus:border-accent focus:bg-surface outline-none transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-muted hover:text-ink text-xs font-semibold"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Level Filters with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All', count: counts.ALL },
            { id: 'MASTERED', label: 'Mastered', count: counts.MASTERED },
            { id: 'INTERMEDIATE', label: 'Intermediate', count: counts.INTERMEDIATE },
            { id: 'BEGINNER', label: 'Beginner', count: counts.BEGINNER },
            { id: 'NOT_LEARNED', label: 'Not Learned', count: counts.NOT_LEARNED }
          ].map(f => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-ink text-surface border-ink shadow-xs'
                    : 'bg-page text-muted hover:text-ink hover:bg-surface border-line'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-surface' : 'bg-surface text-muted border border-line'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Pills (Secondary filter if categories exist) */}
      {availableCategories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 text-xs">
          <span className="text-muted shrink-0 text-[11px] font-medium uppercase tracking-wider">
            Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer shrink-0 border ${
              selectedCategory === 'ALL'
                ? 'bg-accent-soft text-accent border-accent'
                : 'bg-surface text-muted hover:text-ink border-line'
            }`}
          >
            All Categories
          </button>
          {availableCategories.map(cat => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer shrink-0 border ${
                  isCatActive
                    ? 'bg-accent-soft text-accent border-accent'
                    : 'bg-surface text-muted hover:text-ink border-line'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Topics Grid / Grouped Sections */}
      {filteredSkills.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([categoryName, catSkills]) => {
            const meta = CATEGORY_META[categoryName] || { icon: BookOpen, badge: 'bg-page text-muted border-line' };
            const Icon = meta.icon;

            return (
              <div key={categoryName} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-line/70">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-page text-accent border border-line">
                      <Icon className="w-3 h-3" />
                    </div>
                    <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
                      {categoryName}
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted font-medium">
                    {catSkills.length} {catSkills.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>

                {/* Compact Topic Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catSkills.map(skill => {
                    const currentLevelMeta = KNOWLEDGE_LEVELS.find(k => k.value === skill.knowledgeLevel) || KNOWLEDGE_LEVELS[3];
                    const isUpdating = updatingId === skill.id;

                    return (
                      <div
                        key={skill.id}
                        className="p-3.5 rounded-lg bg-surface border border-line hover:border-slate-300 transition-all duration-150 flex flex-col justify-between shadow-2xs group"
                      >
                        {/* Top: Name & Current Badge + Delete */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-ink tracking-tight truncate flex-1" title={skill.topicName}>
                              {skill.topicName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSkillToDelete(skill)}
                              className="text-muted hover:text-danger p-1 rounded-sm transition opacity-70 group-hover:opacity-100 cursor-pointer"
                              title={`Delete ${skill.topicName}`}
                              aria-label={`Delete ${skill.topicName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${currentLevelMeta.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${currentLevelMeta.dotClass}`} />
                              <span>{currentLevelMeta.label}</span>
                            </span>
                            {skill.ratedByUser && (
                              <span className="text-[10px] text-muted/80 tracking-tight">
                                User verified
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Level Selector Segmented Control */}
                        <div className="mt-3 pt-2.5 border-t border-line/80">
                          <span className="text-[10px] uppercase font-semibold text-muted block mb-1.5 tracking-wider">
                            Set Competency
                          </span>
                          <div className="grid grid-cols-4 gap-1 p-0.5 rounded-md bg-page border border-line">
                            {KNOWLEDGE_LEVELS.map(lvl => {
                              const isSelected = skill.knowledgeLevel === lvl.value;
                              return (
                                <button
                                  key={lvl.value}
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleLevelSelect(skill.id, lvl.value)}
                                  title={`${lvl.label}: ${lvl.description}`}
                                  className={`py-1 px-1 rounded text-[11px] font-medium transition cursor-pointer text-center truncate ${
                                    isSelected
                                      ? lvl.activeBtnClass
                                      : 'text-muted hover:text-ink hover:bg-surface/80'
                                  }`}
                                >
                                  {lvl.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 rounded-lg bg-page border border-dashed border-line text-center space-y-3">
          <BookOpen className="w-8 h-8 text-muted mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-ink">
              {search || activeFilter !== 'ALL' || selectedCategory !== 'ALL'
                ? 'No matching topics found'
                : 'No topics calibrated yet'}
            </h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {search || activeFilter !== 'ALL'
                ? 'Try adjusting your search query or competency filter.'
                : 'Add topics you have studied or are targeting to enable personalized curriculum pacing.'}
            </p>
          </div>
          {(search || activeFilter !== 'ALL' || selectedCategory !== 'ALL') ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setActiveFilter('ALL');
                setSelectedCategory('ALL');
              }}
            >
              Reset filters
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddModal}
              icon={Plus}
            >
              Add your first topic
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(skillToDelete)}
        title="Remove Topic?"
        description={`Are you sure you want to remove "${skillToDelete?.topicName}" from your knowledge profile? This will remove personalized constraints for this topic from future roadmaps.`}
        confirmLabel="Remove Topic"
        cancelLabel="Keep Topic"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSkillToDelete(null)}
      />
    </Card>
  );
};
