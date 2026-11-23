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

export const MyRoadmapsView = ({ onNavigateTab, onOpenCreateGoal }) => {
  const { user } = useAuth();
  const { route, params, query, navigate } = useRouter();
  const {
    roadmaps: savedRoadmaps,
    goals,
    loading: loadingRoadmaps,
    refreshData,
    removeRoadmap,
    addRoadmap,
    activeRoadmapId,
    activeRoadmap
  } = useData();

  // Active viewing state if freshly generated in memory
  const [inMemoryRoadmap, setInMemoryRoadmap] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Fetch roadmaps on mount (uses cache if available; avoids repeated requests)
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

  // Deduplicate roadmaps by id to prevent duplicate card rendering
  const uniqueRoadmaps = useMemo(() => {
    const seen = new Set();
    return savedRoadmaps.filter((r) => {
      if (!r || !r.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [savedRoadmaps]);

  const hasExistingData = uniqueRoadmaps.length > 0;
  const isInitialLoading = loadingRoadmaps && !hasExistingData;

  // Compute aggregate stats across saved roadmaps
  const roadmapStats = useMemo(() => {
    const total = uniqueRoadmaps.length;
    if (total === 0) return { total: 0, avgProgress: 0, completedCount: 0, inProgressCount: 0 };
    const completedCount = uniqueRoadmaps.filter(r => (r.progressPercentage || 0) >= 100).length;
    const sumPct = uniqueRoadmaps.reduce((acc, r) => acc + (r.progressPercentage || 0), 0);
    return {
      total,
      avgProgress: Math.round(sumPct / total),
      completedCount,
      inProgressCount: total - completedCount
    };
  }, [uniqueRoadmaps]);

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

      setGenerateProgress('Saving your generated roadmap to database...');

      let savedRecord = null;
      try {
        savedRecord = await saveRoadmap({
          goalId: cleanedPayload.goalId || null,
          title: result.topic || cleanedPayload.topic,
          topic: result.topic || cleanedPayload.topic,
          skillLevel: result.skillLevel || cleanedPayload.skillLevel || 'INTERMEDIATE',
          targetDays: result.targetDays || cleanedPayload.targetDays,
          hoursPerDay: result.hoursPerDay || cleanedPayload.hoursPerDay,
          roadmapJson: typeof result === 'string' ? result : JSON.stringify(result)
        });
      } catch (saveErr) {
        console.error('Failed to save generated roadmap to backend:', saveErr);
        throw new Error(saveErr.response?.data?.message || 'Generated roadmap could not be saved to your account.');
      }

      if (savedRecord?.id) {
        addRoadmap(savedRecord);
        setActiveRoadmapId(savedRecord.id);
        await refreshData(true);
        navigate(`#/roadmaps/${savedRecord.id}`);
      } else {
        throw new Error('Roadmap was generated, but server failed to return a persistent record.');
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
  const isDetailRoute = route === 'roadmap-detail' || route === 'interactive-roadmap';
  const effectiveRoadmapId = params.id || activeRoadmapId || (savedRoadmaps.length > 0 ? savedRoadmaps[0].id : null);

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
      {isDetailRoute && effectiveRoadmapId && (
        <InteractiveRoadmap
          savedRoadmapId={effectiveRoadmapId}
          onBack={() => navigate('#/roadmaps')}
          onRegenerate={async () => {
            const current = savedRoadmaps.find(r => r.id === effectiveRoadmapId);
            if (!current) return;
            const payload = {
              topic: (current.topic || current.title || '').replace(/\s*\(\d+\s*Days?\)$/i, '').trim(),
              skillLevel: current.skillLevel || 'INTERMEDIATE',
              targetDays: current.targetDays,
              hoursPerDay: current.hoursPerDay || 2.0
            };
            const { jobId } = await startRoadmapJob(payload);
            const result = await pollJobUntilComplete(jobId);
            await replaceRoadmap(effectiveRoadmapId, {
              roadmapJson: JSON.stringify(result),
              title: result.topic,
              targetDays: result.targetDays,
              hoursPerDay: result.hoursPerDay
            });
            refreshData(true);
          }}
        />
      )}

      {/* Detail route with no roadmaps available */}
      {isDetailRoute && !effectiveRoadmapId && !loadingRoadmaps && (
        <EmptyState
          icon={MapIcon}
          title="No active roadmap"
          description="Create your first adaptive learning roadmap to explore interactive topics."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onOpenCreateGoal) {
                  onOpenCreateGoal();
                } else {
                  navigate('#/roadmaps/new');
                }
              }}
            >
              Create New Roadmap
            </Button>
          }
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
                onClick={() => {
                  if (onOpenCreateGoal) {
                    onOpenCreateGoal();
                  } else {
                    navigate('#/roadmaps/new');
                  }
                }}
              >
                Create New Roadmap
              </Button>
            }
          />

          {uniqueRoadmaps.length > 0 && (
            <p className="text-sm text-muted">
              {roadmapStats.inProgressCount} in progress, {roadmapStats.completedCount} completed
            </p>
          )}

          {/* Roadmaps List: Stable skeleton only on initial empty load; keeps cards visible during background refresh */}
          {isInitialLoading ? (
            <div className="space-y-3" aria-label="Loading roadmaps">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 bg-surface-1 border border-border rounded-xl space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-5 bg-surface-2 rounded-md w-48" />
                    <div className="h-4 bg-surface-2 rounded-full w-20" />
                  </div>
                  <div className="h-3.5 bg-surface-2 rounded-md w-64" />
                  <div className="pt-2.5 border-t border-border flex items-center justify-between">
                    <div className="h-3 bg-surface-2 rounded-md w-28" />
                    <div className="h-3 bg-surface-2 rounded-md w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : uniqueRoadmaps.length > 0 ? (
            <div className="space-y-3">
              {uniqueRoadmaps.map((roadmap) => {
                const isComplete = (roadmap.progressPercentage || 0) >= 100;
                const isCurrentActive = String(roadmap.id) === String(activeRoadmapId || activeRoadmap?.id);
                const linkedGoal = goals.find(g => g.id === roadmap.goalId);
                const displayHours = linkedGoal?.hoursPerDay != null ? linkedGoal.hoursPerDay : roadmap.hoursPerDay;
                const formattedHours = typeof displayHours === 'number' ? displayHours : Number(displayHours) || 2;

                return (
                  <Card
                    key={roadmap.id}
                    onClick={() => navigate(`#/roadmaps/${roadmap.id}`)}
                    className="p-5 bg-surface-1 border border-border hover:border-accent/40 rounded-xl transition-all duration-150 cursor-pointer space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-semibold text-text truncate">
                            {roadmap.title}
                          </h3>
                          {isComplete ? (
                            <StatusText status="success">Completed</StatusText>
                          ) : (
                            <StatusText status="accent">In progress</StatusText>
                          )}
                          {isCurrentActive && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap font-medium">
                          <span>{roadmap.targetDays} Days</span>
                          <span className="text-border-strong">|</span>
                          <span>{formatEnum(roadmap.skillLevel)}</span>
                          <span className="text-border-strong">|</span>
                          <span>{formattedHours} {formattedHours === 1 ? 'Hour' : 'Hours'}/Day</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isCurrentActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRoadmapId(roadmap.id);
                            }}
                            className="text-xs text-text-muted hover:text-accent font-medium px-2 py-1 rounded-md hover:bg-surface-2 transition cursor-pointer"
                            title="Set as active roadmap"
                          >
                            Set active
                          </button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteRoadmap(e, roadmap.id)}
                          className="text-text-muted hover:text-danger p-2 min-h-[36px] min-w-[36px]"
                          title="Delete roadmap"
                          aria-label="Delete roadmap"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-border flex items-center justify-between gap-4 text-xs">
                      <div className="flex-1 max-w-md flex items-center gap-3">
                        <span className="text-text font-semibold shrink-0">
                          {roadmap.progressPercentage || 0}% Completed
                        </span>
                        <ProgressBar
                          value={roadmap.progressPercentage || 0}
                          ariaLabel={`Progress for ${roadmap.title}`}
                        />
                      </div>

                      <span className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                        Open Roadmap →
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
                  onClick={() => {
                    if (onOpenCreateGoal) {
                      onOpenCreateGoal();
                    } else {
                      navigate('#/roadmaps/new');
                    }
                  }}
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
