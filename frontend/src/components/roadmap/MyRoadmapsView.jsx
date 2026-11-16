import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trash2,
  Map as MapIcon
} from 'lucide-react';
import {
  deleteSavedRoadmap,
  startRoadmapJob,
  getRoadmapJobStatus,
  saveRoadmap,
  replaceRoadmap
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useData } from '../../context/DataContext';
import { RoadmapWizard } from './RoadmapWizard';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { formatEnum } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusText } from '../ui/StatusText';
import { EmptyState } from '../ui/EmptyState';

export const MyRoadmapsView = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { route, params, query, navigate } = useRouter();
  const {
    roadmaps: savedRoadmaps,
    goals,
    loading: loadingRoadmaps,
    refreshData,
    removeRoadmap,
    addRoadmap
  } = useData();

  // Active viewing state if freshly generated in memory
  const [inMemoryRoadmap, setInMemoryRoadmap] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Refresh data if older than 30s
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Compute aggregate stats across saved roadmaps
  const roadmapStats = useMemo(() => {
    const total = savedRoadmaps.length;
    if (total === 0) return { total: 0, avgProgress: 0, completedCount: 0, inProgressCount: 0 };
    const completedCount = savedRoadmaps.filter(r => (r.progressPercentage || 0) >= 100).length;
    const sumPct = savedRoadmaps.reduce((acc, r) => acc + (r.progressPercentage || 0), 0);
    return {
      total,
      avgProgress: Math.round(sumPct / total),
      completedCount,
      inProgressCount: total - completedCount
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

  // Preselected goal from query parameter if on /roadmaps/new?goal=ID
  const preselectedGoal = useMemo(() => {
    if (query.goal) {
      return goals.find(g => String(g.id) === String(query.goal)) || null;
    }
    return null;
  }, [query.goal, goals]);

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

      if (savedRecord?.id) {
        addRoadmap(savedRecord);
        navigate(`#/roadmaps/${savedRecord.id}`);
      } else {
        setInMemoryRoadmap(result);
      }
    } catch (err) {
      console.error('Roadmap generation failed:', err);
      setGenerateError(formatGenerationError(err));
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  };

  // Delete saved roadmap
  const handleDeleteRoadmap = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this saved roadmap?')) return;

    try {
      await deleteSavedRoadmap(id);
      removeRoadmap(id);
      if (params.id === id) {
        navigate('#/roadmaps');
      }
    } catch (err) {
      console.error('Failed to delete roadmap:', err);
    }
  };

  // Determine which sub-view to render
  const isCreateRoute = route === 'roadmaps-new';
  const isDetailRoute = route === 'roadmap-detail';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* VIEW: CREATE (WIZARD) */}
      {isCreateRoute && (
        <RoadmapWizard
          goals={goals}
          initialGoal={preselectedGoal}
          onGenerate={handleWizardGenerate}
          onCancel={() => navigate('#/roadmaps')}
          loading={generating}
          progressMessage={generateProgress}
          error={generateError}
        />
      )}

      {/* VIEW: DETAIL (INTERACTIVE ROADMAP) */}
      {isDetailRoute && (
        <InteractiveRoadmap
          savedRoadmapId={params.id}
          onBack={() => navigate('#/roadmaps')}
          onRegenerate={async () => {
            const current = savedRoadmaps.find(r => r.id === params.id);
            if (!current) return;
            const payload = {
              topic: (current.topic || current.title || '').replace(/\s*\(\d+\s*Days?\)$/i, '').trim(),
              skillLevel: current.skillLevel || 'INTERMEDIATE',
              targetDays: current.targetDays,
              hoursPerDay: current.hoursPerDay || 2.0
            };
            const { jobId } = await startRoadmapJob(payload);
            const result = await pollJobUntilComplete(jobId);
            await replaceRoadmap(params.id, {
              roadmapJson: JSON.stringify(result),
              title: result.topic,
              targetDays: result.targetDays,
              hoursPerDay: result.hoursPerDay
            });
            refreshData(true);
          }}
        />
      )}

      {/* Fallback in-memory preview if backend save failed */}
      {!isCreateRoute && !isDetailRoute && inMemoryRoadmap && (
        <InteractiveRoadmap
          roadmap={inMemoryRoadmap}
          onBack={() => setInMemoryRoadmap(null)}
        />
      )}

      {/* VIEW: LIST (SAVED ROADMAPS) */}
      {!isCreateRoute && !isDetailRoute && !inMemoryRoadmap && (
        <div className="space-y-6">
          <PageHeader
            title="Roadmaps"
            subtitle="Your day-by-day study plans."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('#/roadmaps/new')}
              >
                Create New Roadmap
              </Button>
            }
          />

          {savedRoadmaps.length > 0 && (
            <p className="text-sm text-muted">
              {roadmapStats.inProgressCount} in progress, {roadmapStats.completedCount} completed
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
                    onClick={() => navigate(`#/roadmaps/${roadmap.id}`)}
                    className="p-5 hover:border-slate-300 transition-colors duration-150 cursor-pointer space-y-3"
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
                  onClick={() => navigate('#/roadmaps/new')}
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
