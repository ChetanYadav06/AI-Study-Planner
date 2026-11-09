/**
 * Canonical task ID helper ensuring consistency between frontend and backend.
 * Uses base ID `${phaseIdx}-task-${dayNumber ?? taskIdx}` for the first occurrence,
 * and appends `-b`, `-c`, etc. for duplicates within the phase.
 */
export const getCanonicalTaskId = (phaseIdx, task, taskIdx, suffixCounts = null) => {
  if (task?.id) return String(task.id);
  const baseSuffix = (task?.dayNumber !== undefined && task?.dayNumber !== null)
    ? task.dayNumber
    : taskIdx;
  const baseKey = `${phaseIdx}-task-${baseSuffix}`;

  if (!suffixCounts) {
    return baseKey;
  }

  const count = suffixCounts[baseKey] || 0;
  suffixCounts[baseKey] = count + 1;

  if (count === 0) {
    return baseKey;
  } else {
    const suffixChar = String.fromCharCode(97 + count); // 1 -> 'b', 2 -> 'c', etc.
    return `${baseKey}-${suffixChar}`;
  }
};

/**
 * Computes today's study queue and upcoming study tasks.
 *
 * Rules:
 * - "Today" = all tasks of the first day (lowest dayNumber) that has any incomplete task.
 *   (On a fresh roadmap, this is Day 1).
 * - "Up next" = tasks of the next 2 days after that.
 * - If a single day contains more tasks than daily hours allow, still show the whole day.
 * - "Current Learning Focus" (for Active Study) = the first incomplete task of "Today".
 * - Handles missing estimatedMinutes gracefully (treats as unknown / default null).
 */
export const computeStudyQueue = (roadmap, completedTasks = []) => {
  if (!roadmap) {
    return {
      todayDayNumber: null,
      todayTasks: [],
      upNextDays: [],
      upNextTasks: [],
      currentFocusTask: null,
      allDone: false
    };
  }

  // Parse roadmapJson if passed as a string or SavedRoadmap entity
  let parsed = roadmap;
  if (typeof roadmap === 'string') {
    try {
      parsed = JSON.parse(roadmap);
    } catch {
      return { todayDayNumber: null, todayTasks: [], upNextDays: [], upNextTasks: [], currentFocusTask: null, allDone: false };
    }
  } else if (roadmap.roadmapJson) {
    try {
      parsed = typeof roadmap.roadmapJson === 'string' ? JSON.parse(roadmap.roadmapJson) : roadmap.roadmapJson;
    } catch {
      parsed = roadmap;
    }
  }

  // Parse completed tasks
  let completedSet = new Set();
  if (Array.isArray(completedTasks)) {
    completedSet = new Set(completedTasks);
  } else if (typeof completedTasks === 'string') {
    try {
      const arr = JSON.parse(completedTasks);
      if (Array.isArray(arr)) completedSet = new Set(arr);
    } catch {
      completedSet = new Set();
    }
  } else if (completedTasks && typeof completedTasks === 'object') {
    Object.keys(completedTasks).forEach(k => {
      if (completedTasks[k]) completedSet.add(k);
    });
  }

  // Also check if roadmap entity itself has completedTasksJson
  if (completedSet.size === 0 && roadmap.completedTasksJson) {
    try {
      const arr = JSON.parse(roadmap.completedTasksJson);
      if (Array.isArray(arr)) completedSet = new Set(arr);
    } catch {}
  }

  const allTasks = [];
  const phases = parsed.phases || [];

  phases.forEach((phase, pIdx) => {
    const dailyTasks = phase.dailyTasks || [];
    const suffixCounts = {};
    dailyTasks.forEach((task, tIdx) => {
      const taskId = getCanonicalTaskId(pIdx, task, tIdx, suffixCounts);
      const isDone = completedSet.has(taskId);
      const dayNumber = Number(task.dayNumber) || (tIdx + 1);

      allTasks.push({
        taskId,
        dayNumber,
        phaseIdx: pIdx,
        phaseTitle: phase.phaseTitle || phase.phase || `Phase ${pIdx + 1}`,
        task,
        isDone,
        estimatedMinutes: task.estimatedMinutes != null && !isNaN(task.estimatedMinutes) ? Number(task.estimatedMinutes) : null
      });
    });
  });

  if (allTasks.length === 0) {
    return {
      todayDayNumber: null,
      todayTasks: [],
      upNextDays: [],
      upNextTasks: [],
      currentFocusTask: null,
      allDone: true
    };
  }

  // Group tasks by dayNumber
  const dayMap = new Map();
  allTasks.forEach(item => {
    if (!dayMap.has(item.dayNumber)) {
      dayMap.set(item.dayNumber, []);
    }
    dayMap.get(item.dayNumber).push(item);
  });

  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);

  // Find the first (lowest) day that has at least one incomplete task
  const firstIncompleteDay = sortedDays.find(d => {
    const dayTasks = dayMap.get(d);
    return dayTasks.some(t => !t.isDone);
  });

  if (firstIncompleteDay === undefined) {
    // All tasks across all days are completed
    return {
      todayDayNumber: null,
      todayTasks: [],
      upNextDays: [],
      upNextTasks: [],
      currentFocusTask: null,
      allDone: true
    };
  }

  const todayDayNumber = firstIncompleteDay;
  const todayTasks = dayMap.get(todayDayNumber) || [];

  // Up next = tasks of the next 2 days after todayDayNumber
  const todayDayIndex = sortedDays.indexOf(todayDayNumber);
  const upNextDays = sortedDays.slice(todayDayIndex + 1, todayDayIndex + 3);
  const upNextTasks = upNextDays.flatMap(d => dayMap.get(d) || []);

  // Current learning focus = first incomplete task of Today, or first task of Today
  const currentFocusTask = todayTasks.find(t => !t.isDone) || todayTasks[0] || null;

  return {
    todayDayNumber,
    todayTasks,
    upNextDays,
    upNextTasks,
    currentFocusTask,
    allDone: false
  };
};

