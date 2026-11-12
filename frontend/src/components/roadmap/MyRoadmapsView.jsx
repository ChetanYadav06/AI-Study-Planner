import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trash2,
  Map as MapIcon
} from 'lucide-react';
import {
  getGoals,
  getSavedRoadmaps,
  deleteSavedRoadmap,
  generateRoadmap,
  startRoadmapJob,
  getRoadmapJobStatus,
  saveRoadmap,
  replaceRoadmap
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RoadmapWizard } from './RoadmapWizard';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { formatEnum } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusText } from '../ui/StatusText';
import { EmptyState } from '../ui/EmptyState';

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
  const [generateProgress, setGenerateProgress] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  const pollJobUntilComplete = (jobId) => {
    return new Promise((resolve, reject) => {
      let consecutiveErrors = 0;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const timer = setInterval(async () => {
        try {
          const job = await getRoadmapJobStatus(jobId);
          consecutiveErrors = 0;

          if (job.phasesTotal > 0) {
            setGenerateProgress(`Phase ${job.phasesDone} of ${job.phasesTotal}: ${job.message || 'Generating daily tasks'}`);
          } else if (job.message) {
            setGenerateProgress(job.message);
          }

          if (job.state === 'DONE') {
            clearInterval(timer);
            pollIntervalRef.current = null;
            resolve(job.result);
          } else if (job.state === 'FAILED') {
            clearInterval(timer);
            pollIntervalRef.current = null;
            const err = new Error(job.message || 'Roadmap generation failed.');
            err.errorCode = job.errorCode;
            reject(err);
          }
        } catch (apiErr) {
          consecutiveErrors++;
          console.warn('Polling error:', apiErr);
          if (consecutiveErrors >= 5) {
            clearInterval(timer);
            pollIntervalRef.current = null;
            const err = new Error(
              apiErr.response?.data?.message ||
              'Connection to server lost while generating roadmap. Please retry.'
            );
            reject(err);
          } else {
            setGenerateProgress('Network connection hiccup, reconnecting...');
          }
        }
      }, 2000);

      pollIntervalRef.current = timer;
    });
  };

  const formatGenerationError = (err) => {
    if (err.errorCode === 'TIMEOUT') {
      return 'The AI took too long. Try again or choose fewer days.';
    }
    if (err.errorCode === 'RATE_LIMITED' || err.response?.status === 429) {
      return 'Roadmap generation limit reached (maximum 5 per hour). Please try again later.';
    }
    if (err.errorCode === 'AI_UNAVAILABLE') {
      return 'AI service is temporarily unavailable. Please try again later.';
    }
    if (err.errorCode === 'INVALID_PLAN') {
      return err.message || 'Generated roadmap did not pass validation checks. Please retry.';
    }
    if (err.response?.status === 409) {
      return 'A roadmap generation is already in progress for your account.';
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      return 'Network connection failed. Please check your internet and retry.';
    }
    return err.response?.data?.message || err.message || 'Roadmap generation failed. Please retry.';
  };

  // When user completes the 5-step wizard
  const handleWizardGenerate = async (payload) => {
    setGenerating(true);
    setGenerateProgress('Initializing roadmap generation...');
    setGenerateError(null);

    // Clean any '(N Days)' suffix from topic
    const cleanedPayload = {
      ...payload,
      topic: (payload.topic || '').replace(/\s*\(\d+\s*Days?\)$/i, '').trim()
    };

    try {
      const { jobId } = await startRoadmapJob(cleanedPayload);
      const result = await pollJobUntilComplete(jobId);

      let savedRecord = null;
      try {
        savedRecord = await saveRoadmap({
          goalId: cleanedPayload.goalId,
          title: result.topic,
          topic: result.topic,
          skillLevel: result.skillLevel || cleanedPayload.skillLevel || 'INTERMEDIATE',
          targetDays: result.targetDays,
          hoursPerDay: result.hoursPerDay,
          roadmapJson: JSON.stringify(result)
        });
      } catch (saveErr) {
        console.warn('Could not autosave generated roadmap to backend:', saveErr);
      }

      setActiveRoadmap(result);
      setActiveSavedId(savedRecord?.id || null);
      if (cleanedPayload.goalId) {
        const found = goals.find(g => String(g.id) === String(cleanedPayload.goalId));
        setActiveGoal(found || null);
      } else {
        setActiveGoal(null);
      }

      setViewMode('VIEW');
      fetchRoadmaps();
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setGenerateError(formatGenerationError(err));
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
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
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* VIEW MODE: CREATE (WIZARD) */}
      {viewMode === 'CREATE' && (
        <RoadmapWizard
          goals={goals}
          initialGoal={activeGoal}
          onGenerate={handleWizardGenerate}
          onCancel={() => setViewMode('LIST')}
          loading={generating}
          progressMessage={generateProgress}
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
              topic: (activeRoadmap.topic || '').replace(/\s*\(\d+\s*Days?\)$/i, '').trim(),
              skillLevel: activeRoadmap.skillLevel || 'INTERMEDIATE',
              targetDays: activeRoadmap.targetDays,
              hoursPerDay: activeGoal?.hoursPerDay || activeRoadmap.hoursPerDay || 2.0,
              description: activeGoal?.description || ''
            };
            const { jobId } = await startRoadmapJob(payload);
            const result = await pollJobUntilComplete(jobId);
            if (activeSavedId) {
              await replaceRoadmap(activeSavedId, {
                roadmapJson: JSON.stringify(result),
                title: result.topic,
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

      {/* VIEW MODE: LIST (SAVED ROADMAPS) */}
      {viewMode === 'LIST' && (
        <div className="space-y-6">
          <PageHeader
            title="Roadmaps"
            subtitle="Your day-by-day study plans."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveGoal(null);
                  setViewMode('CREATE');
                }}
              >
                Create New Roadmap
              </Button>
            }
          />

          {savedRoadmaps.length > 0 && (
            <p className="text-sm text-muted">
              {roadmapStats.total} active, {roadmapStats.completedCount} completed
            </p>
          )}

          {/* Roadmaps List */}
          {loadingRoadmaps ? (
            <div className="py-12 text-center text-sm text-muted">
              Loading roadmaps...
            </div>
          ) : savedRoadmaps.length > 0 ? (
            <div className="space-y-3">
              {savedRoadmaps.map((roadmap) => {
                const isComplete = (roadmap.progressPercentage || 0) >= 100;
                const linkedGoal = goals.find(g => g.id === roadmap.goalId);
                const displayHours = linkedGoal?.hoursPerDay != null ? linkedGoal.hoursPerDay : roadmap.hoursPerDay;

                return (
                  <Card
                    key={roadmap.id}
                    onClick={() => handleOpenSavedRoadmap(roadmap)}
                    className="p-5 hover:border-[#cbd5e1] transition-colors duration-150 cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-semibold text-ink truncate">
                            {roadmap.title}
                          </h3>
                          {isComplete ? (
                            <StatusText status="success">Completed</StatusText>
                          ) : (
                            <StatusText status="accent">In progress</StatusText>
                          )}
                        </div>

                        <p className="text-xs text-muted flex items-center gap-2">
                          <span>{formatEnum(roadmap.skillLevel)}</span>
                          <span>•</span>
                          <span>{roadmap.targetDays} days</span>
                          <span>•</span>
                          <span>{displayHours}h/day</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteRoadmap(e, roadmap.id)}
                          className="text-muted hover:text-danger p-2 min-h-[36px] min-w-[36px]"
                          title="Delete roadmap"
                          aria-label="Delete roadmap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-line flex items-center justify-between gap-4 text-xs">
                      <div className="flex-1 max-w-md flex items-center gap-3">
                        <span className="text-muted shrink-0 font-medium">
                          {roadmap.progressPercentage || 0}%
                        </span>
                        <ProgressBar
                          value={roadmap.progressPercentage || 0}
                          ariaLabel={`Progress for ${roadmap.title}`}
                        />
                      </div>

                      <span className="text-xs font-medium text-accent">
                        Open roadmap →
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={MapIcon}
              title="No roadmaps yet"
              description="Create a day-by-day study roadmap to begin your plan."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setViewMode('CREATE')}
                >
                  Create New Roadmap
                </Button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MyRoadmapsView;
