import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getGoals, getSavedRoadmaps, setTaskCompletion } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const CACHE_TTL_MS = 30000; // 30 seconds
const ACTIVE_ROADMAP_STORAGE_KEY = 'pathwise_active_roadmap_id';

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [goals, setGoals] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);

  // Single Source of Truth for Active Roadmap ID
  const [activeRoadmapId, setActiveRoadmapIdState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_ROADMAP_STORAGE_KEY);
      if (saved) return saved;
    }
    return null;
  });

  const setActiveRoadmapId = useCallback((id) => {
    const stringId = id != null ? String(id) : null;
    setActiveRoadmapIdState(stringId);
    if (typeof window !== 'undefined') {
      if (stringId) {
        localStorage.setItem(ACTIVE_ROADMAP_STORAGE_KEY, stringId);
      } else {
        localStorage.removeItem(ACTIVE_ROADMAP_STORAGE_KEY);
      }
    }
  }, []);

  const refreshData = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setGoals([]);
      setRoadmaps([]);
      setLastFetched(null);
      return;
    }

    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched < CACHE_TTL_MS)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [goalsRes, roadmapsRes] = await Promise.all([
        getGoals().catch((err) => {
          console.warn('Failed to fetch goals:', err);
          return [];
        }),
        getSavedRoadmaps().catch((err) => {
          console.warn('Failed to fetch roadmaps:', err);
          return [];
        })
      ]);

      const loadedGoals = Array.isArray(goalsRes) ? goalsRes : [];
      const loadedRoadmaps = Array.isArray(roadmapsRes) ? roadmapsRes : [];

      setGoals(loadedGoals);
      setRoadmaps(loadedRoadmaps);
      setLastFetched(Date.now());

      // Validate or default activeRoadmapId
      if (loadedRoadmaps.length > 0) {
        const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_ROADMAP_STORAGE_KEY) : null;
        const exists = loadedRoadmaps.some((r) => String(r.id) === String(savedId));
        if (!exists) {
          // Default to first active roadmap (< 100%) or first available
          const defaultRoadmap = loadedRoadmaps.find((r) => (r.progressPercentage || 0) < 100) || loadedRoadmaps[0];
          setActiveRoadmapId(defaultRoadmap.id);
        }
      }
    } catch (err) {
      console.error('Failed to refresh data cache:', err);
      setError('Failed to load study data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, lastFetched, setActiveRoadmapId]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      setGoals([]);
      setRoadmaps([]);
      setLastFetched(null);
    }
  }, [isAuthenticated, refreshData]);

  // Derive activeRoadmap from roadmaps + activeRoadmapId
  const activeRoadmap = useMemo(() => {
    if (!roadmaps || roadmaps.length === 0) return null;
    if (activeRoadmapId) {
      const match = roadmaps.find((r) => String(r.id) === String(activeRoadmapId));
      if (match) return match;
    }
    // Fallback: first roadmap with incomplete progress or first item
    return roadmaps.find((r) => (r.progressPercentage || 0) < 100) || roadmaps[0];
  }, [roadmaps, activeRoadmapId]);

  // Compute unified progress and study hours for the active roadmap
  const activeRoadmapStats = useMemo(() => {
    if (!activeRoadmap) {
      return {
        percent: 0,
        totalHours: 0,
        completedHours: 0,
        completedTasksCount: 0,
        totalTasksCount: 0
      };
    }

    let completedTasks = [];
    try {
      if (activeRoadmap.completedTasksJson) {
        const parsed = JSON.parse(activeRoadmap.completedTasksJson);
        completedTasks = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      completedTasks = [];
    }

    let totalTasksCount = 0;
    let estimatedTotalMinutes = 0;
    let completedMinutes = 0;

    try {
      if (activeRoadmap.roadmapJson) {
        const plan = JSON.parse(activeRoadmap.roadmapJson);
        if (plan.phases) {
          plan.phases.forEach((phase) => {
            if (phase.dailyTasks) {
              phase.dailyTasks.forEach((task) => {
                totalTasksCount++;
                const mins = task.estimatedMinutes || (activeRoadmap.hoursPerDay ? activeRoadmap.hoursPerDay * 60 : 60);
                estimatedTotalMinutes += mins;
                if (completedTasks.includes(task.taskId || task.dayNumber)) {
                  completedMinutes += mins;
                }
              });
            }
          });
        }
        if (plan.totalStudyHours && estimatedTotalMinutes === 0) {
          estimatedTotalMinutes = plan.totalStudyHours * 60;
        }
      }
    } catch {
      // fallback
    }

    if (totalTasksCount === 0) {
      totalTasksCount = activeRoadmap.targetDays || 30;
    }
    if (estimatedTotalMinutes === 0) {
      const dailyHours = activeRoadmap.hoursPerDay || 2;
      estimatedTotalMinutes = (activeRoadmap.targetDays || 30) * dailyHours * 60;
    }

    const calculatedPct = totalTasksCount > 0
      ? Math.min(100, Math.round((completedTasks.length / totalTasksCount) * 100))
      : (activeRoadmap.progressPercentage || 0);

    const totalHours = Math.round((estimatedTotalMinutes / 60) * 10) / 10;
    const completedHours = Math.round((completedMinutes > 0 ? (completedMinutes / 60) : (totalHours * calculatedPct / 100)) * 10) / 10;

    return {
      percent: calculatedPct,
      totalHours,
      completedHours,
      completedTasksCount: completedTasks.length,
      totalTasksCount
    };
  }, [activeRoadmap]);

  // Task completion toggle with optimistic update & rollback
  const toggleTaskCompletion = useCallback(async (roadmapId, taskId, completed) => {
    const prevRoadmaps = roadmaps;
    const prevGoals = goals;

    const targetRoadmap = roadmaps.find((r) => r.id === roadmapId);
    const targetGoalId = targetRoadmap?.goalId;

    let optimisticRoadmaps = roadmaps;
    let optimisticGoals = goals;

    if (targetRoadmap) {
      let currentCompletedList = [];
      try {
        if (targetRoadmap.completedTasksJson) {
          const parsed = JSON.parse(targetRoadmap.completedTasksJson);
          currentCompletedList = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        currentCompletedList = [];
      }

      let nextCompletedList = [];
      if (completed) {
        nextCompletedList = currentCompletedList.includes(taskId)
          ? currentCompletedList
          : [...currentCompletedList, taskId];
      } else {
        nextCompletedList = currentCompletedList.filter((id) => id !== taskId);
      }

      let totalTasks = 1;
      try {
        if (targetRoadmap.roadmapJson) {
          const parsedPlan = JSON.parse(targetRoadmap.roadmapJson);
          let count = 0;
          parsedPlan.phases?.forEach((phase) => {
            count += (phase.dailyTasks?.length || 0);
          });
          if (count > 0) totalTasks = count;
        }
      } catch {
        totalTasks = 1;
      }

      const optimisticPct = Math.min(100, Math.round((nextCompletedList.length / totalTasks) * 100));

      optimisticRoadmaps = roadmaps.map((r) => {
        if (r.id === roadmapId) {
          return {
            ...r,
            completedTasksJson: JSON.stringify(nextCompletedList),
            progressPercentage: optimisticPct
          };
        }
        return r;
      });

      if (targetGoalId) {
        optimisticGoals = goals.map((g) => {
          if (g.id === targetGoalId) {
            return {
              ...g,
              progressPercentage: optimisticPct,
              status: optimisticPct >= 100 ? 'COMPLETED' : (optimisticPct > 0 ? 'IN_PROGRESS' : g.status)
            };
          }
          return g;
        });
      }
    }

    setRoadmaps(optimisticRoadmaps);
    setGoals(optimisticGoals);

    try {
      const response = await setTaskCompletion(roadmapId, taskId, completed);

      setRoadmaps((current) =>
        current.map((r) => {
          if (r.id === roadmapId) {
            return {
              ...r,
              completedTasksJson: JSON.stringify(response.completedTaskIds || []),
              progressPercentage: response.progressPercentage
            };
          }
          return r;
        })
      );

      if (targetGoalId) {
        setGoals((current) =>
          current.map((g) => {
            if (g.id === targetGoalId) {
              return {
                ...g,
                progressPercentage: response.goalProgressPercentage,
                status: response.goalStatus || g.status
              };
            }
            return g;
          })
        );
      }

      return response;
    } catch (err) {
      console.error('Task completion update failed, rolling back:', err);
      setRoadmaps(prevRoadmaps);
      setGoals(prevGoals);
      const userMessage = err.response?.data?.message || err.message || 'Failed to update task completion.';
      throw new Error(userMessage);
    }
  }, [roadmaps, goals]);

  // Cache mutation helpers
  const removeRoadmap = useCallback((id) => {
    setRoadmaps((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRoadmap = useCallback((newRoadmap) => {
    setRoadmaps((prev) => [newRoadmap, ...prev.filter((r) => r.id !== newRoadmap.id)]);
    if (newRoadmap && newRoadmap.id) {
      setActiveRoadmapId(newRoadmap.id);
    }
    // Invalidate lastFetched timestamp so future refreshData() always fetches fresh records
    setLastFetched(null);
  }, [setActiveRoadmapId]);

  const updateRoadmap = useCallback((updatedRoadmap) => {
    setRoadmaps((prev) =>
      prev.map((r) => (r.id === updatedRoadmap.id ? { ...r, ...updatedRoadmap } : r))
    );
  }, []);

  const removeGoal = useCallback((id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addGoal = useCallback((newGoal) => {
    setGoals((prev) => [newGoal, ...prev.filter((g) => g.id !== newGoal.id)]);
  }, []);

  const updateGoal = useCallback((updatedGoal) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? { ...g, ...updatedGoal } : g))
    );
  }, []);

  const value = useMemo(() => ({
    goals,
    roadmaps,
    loading,
    error,
    lastFetched,
    activeRoadmapId,
    activeRoadmap,
    activeRoadmapStats,
    setActiveRoadmapId,
    refreshData,
    toggleTaskCompletion,
    removeRoadmap,
    addRoadmap,
    updateRoadmap,
    removeGoal,
    addGoal,
    updateGoal
  }), [
    goals,
    roadmaps,
    loading,
    error,
    lastFetched,
    activeRoadmapId,
    activeRoadmap,
    activeRoadmapStats,
    setActiveRoadmapId,
    refreshData,
    toggleTaskCompletion,
    removeRoadmap,
    addRoadmap,
    updateRoadmap,
    removeGoal,
    addGoal,
    updateGoal
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
