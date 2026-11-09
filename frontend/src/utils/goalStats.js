/**
 * Shared goal status predicates and statistics calculations.
 *
 * Ground rules:
 * - Active goals: any goal that is not COMPLETED (status !== 'COMPLETED').
 * - In Progress goals: status === 'IN_PROGRESS'.
 * - Completed goals: status === 'COMPLETED'.
 * - Not Started goals: status === 'NOT_STARTED' or missing status.
 */

export const isGoalActive = (goal) => {
  return goal?.status !== 'COMPLETED';
};

export const isGoalInProgress = (goal) => {
  return goal?.status === 'IN_PROGRESS';
};

export const isGoalNotStarted = (goal) => {
  return goal?.status === 'NOT_STARTED' || !goal?.status;
};

export const isGoalCompleted = (goal) => {
  return goal?.status === 'COMPLETED';
};

export const computeGoalStats = (goals = []) => {
  const list = Array.isArray(goals) ? goals : [];
  const active = list.filter(isGoalActive);
  const inProgress = list.filter(isGoalInProgress);
  const completed = list.filter(isGoalCompleted);
  const notStarted = list.filter(isGoalNotStarted);

  return {
    totalGoals: list.length,
    activeGoals: active.length,
    activeGoalsList: active,
    inProgressGoals: inProgress.length,
    inProgressGoalsList: inProgress,
    completedGoals: completed.length,
    completedGoalsList: completed,
    notStartedGoals: notStarted.length,
    notStartedGoalsList: notStarted
  };
};

