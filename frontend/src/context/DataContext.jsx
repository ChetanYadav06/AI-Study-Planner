import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getGoals, getSavedRoadmaps, setTaskCompletion } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const CACHE_TTL_MS = 30000; // 30 seconds

export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [goals, setGoals] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      setGoals([]);
      setRoadmaps([]);
      setLastFetched(null);
      return;
    }

    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched < CACHE_TTL_MS)) {
      // Cache is fresh within 30s
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

      setGoals(Array.isArray(goalsRes) ? goalsRes : []);
      setRoadmaps(Array.isArray(roadmapsRes) ? roadmapsRes : []);
      setLastFetched(Date.now());
    } catch (err) {
      console.error('Failed to refresh data cache:', err);
      setError('Failed to load study data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, lastFetched]);

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

  // Task completion toggle with optimistic update & rollback
  const toggleTaskCompletion = useCallback(async (roadmapId, taskId, completed) => {
    const prevRoadmaps = roadmaps;
    const prevGoals = goals;

    // Target roadmap
    const targetRoadmap = roadmaps.find((r) => r.id === roadmapId);
    const targetGoalId = targetRoadmap?.goalId;

    // Optimistic calculation
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

      // Estimate progress
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

    // Apply optimistic state
    setRoadmaps(optimisticRoadmaps);
    setGoals(optimisticGoals);

    try {
      const response = await setTaskCompletion(roadmapId, taskId, completed);

      // Reconcile with authoritative server response
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
      // Rollback on error
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
  }, []);

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
