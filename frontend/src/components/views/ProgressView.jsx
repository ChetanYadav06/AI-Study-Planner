import React, { useState, useEffect, useMemo } from 'react';
import { getGoals, getDashboardStats, getTopicKnowledge } from '../../services/api';
import { computeGoalStats } from '../../utils/goalStats';
import { PageHeader, Card, ProgressBar, StatusText, EmptyState } from '../ui';

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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Progress"
        subtitle="Goals, topics and time studied."
      />

      {/* KPI Stats Strip */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line">
          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Overall progress</span>
            <div className="text-2xl font-semibold text-accent font-mono mt-1">{overallGoalProgress}%</div>
            <p className="text-xs text-muted mt-0.5">Average completion</p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Completed</span>
            <div className="text-2xl font-semibold text-ink mt-1">{completedGoals}</div>
            <p className="text-xs text-muted mt-0.5">Finished goals</p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">In progress</span>
            <div className="text-2xl font-semibold text-ink mt-1">{inProgressGoals}</div>
            <p className="text-xs text-muted mt-0.5">Active goals</p>
          </div>

          <div className="p-3 text-center">
            <span className="text-xs text-muted block">Mastered topics</span>
            <div className="text-2xl font-semibold text-ink mt-1">{masteredSkills.length}</div>
            <p className="text-xs text-muted mt-0.5">Verified skills</p>
          </div>
        </div>
      </Card>

      {/* Skills Mastery Matrix Breakdown */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-sm font-semibold text-ink">Topic knowledge distribution</h2>
            <p className="text-xs text-muted mt-0.5">Summary of topics from your learning profile</p>
          </div>
          <span className="text-xs font-mono text-muted">{skills.length} total</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-[8px] bg-page border border-line text-center">
            <span className="text-xs text-muted block">Mastered</span>
            <div className="text-lg font-semibold text-ink mt-0.5">{masteredSkills.length}</div>
          </div>
          <div className="p-3 rounded-[8px] bg-page border border-line text-center">
            <span className="text-xs text-muted block">Intermediate</span>
            <div className="text-lg font-semibold text-ink mt-0.5">{intermediateSkills.length}</div>
          </div>
          <div className="p-3 rounded-[8px] bg-page border border-line text-center">
            <span className="text-xs text-muted block">Beginner</span>
            <div className="text-lg font-semibold text-ink mt-0.5">{beginnerSkills.length}</div>
          </div>
          <div className="p-3 rounded-[8px] bg-page border border-line text-center">
            <span className="text-xs text-muted block">Not Learned</span>
            <div className="text-lg font-semibold text-ink mt-0.5">{notLearnedSkills.length}</div>
          </div>
        </div>
      </Card>

      {/* Goal Progress Table */}
      <Card className="p-6 space-y-4">
        <div className="pb-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Active goals</h2>
          <p className="text-xs text-muted mt-0.5">Progress toward each defined syllabus target</p>
        </div>

        {goals.length > 0 ? (
          <div className="space-y-2.5">
            {goals.map((g) => (
              <div key={g.id} className="p-3 rounded-[8px] bg-page border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">{g.title}</span>
                  <span className="text-xs font-mono font-medium text-accent">{g.progressPercentage || 0}%</span>
                </div>
                <ProgressBar value={g.progressPercentage || 0} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No goals tracked yet"
            description="Create a learning goal to track your curriculum milestones."
          />
        )}
      </Card>
    </div>
  );
};

export default ProgressView;
