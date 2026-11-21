import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripPhasePrefix,
  computeTimeRanges,
  isPlaceholderSummary,
  getNextUnfinishedDay,
  computePhaseSummaries
} from './dayPlanHelpers.js';

test('stripPhasePrefix strips standard Phase prefixes', () => {
  assert.equal(stripPhasePrefix('Phase 1: Object-oriented design'), 'Object-oriented design');
  assert.equal(stripPhasePrefix('Phase 2 - Advanced Concurrency'), 'Advanced Concurrency');
  assert.equal(stripPhasePrefix('Phase 12: Microservices Architecture'), 'Microservices Architecture');
  assert.equal(stripPhasePrefix('Foundations of Data Science'), 'Foundations of Data Science');
  assert.equal(stripPhasePrefix(''), '');
  assert.equal(stripPhasePrefix(null), '');
});

test('computeTimeRanges calculates cumulative start and end minutes', () => {
  const blocks = [
    { kind: 'STUDY', minutes: 12 },
    { kind: 'PRACTICE', minutes: 12 },
    { kind: 'QUIZ', minutes: 6 }
  ];
  const timed = computeTimeRanges(blocks);
  assert.equal(timed.length, 3);
  assert.equal(timed[0].startMinutes, 0);
  assert.equal(timed[0].endMinutes, 12);
  assert.equal(timed[0].timeRangeLabel, '0 to 12');

  assert.equal(timed[1].startMinutes, 12);
  assert.equal(timed[1].endMinutes, 24);
  assert.equal(timed[1].timeRangeLabel, '12 to 24');

  assert.equal(timed[2].startMinutes, 24);
  assert.equal(timed[2].endMinutes, 30);
  assert.equal(timed[2].timeRangeLabel, '24 to 30');
});

test('computeTimeRanges handles empty or zero minute blocks safely', () => {
  assert.deepEqual(computeTimeRanges([]), []);
  assert.deepEqual(computeTimeRanges(null), []);
  const blocks = [{ minutes: 0 }, { minutes: 15 }];
  const timed = computeTimeRanges(blocks);
  assert.equal(timed[0].timeRangeLabel, '0 to 0');
  assert.equal(timed[1].timeRangeLabel, '0 to 15');
});

test('isPlaceholderSummary identifies empty and synthetic template summaries', () => {
  assert.equal(isPlaceholderSummary('', 'Inheritance'), true);
  assert.equal(isPlaceholderSummary(null, 'Inheritance'), true);
  assert.equal(isPlaceholderSummary('Study and practical application of Inheritance.', 'Inheritance'), true);
  assert.equal(isPlaceholderSummary('study and practical application of inheritance', 'Inheritance'), true);
  assert.equal(isPlaceholderSummary('Learn how polymorphism allows subclass substitution in OOP.', 'Inheritance'), false);
});

test('getNextUnfinishedDay returns first uncompleted dayNumber', () => {
  const tasks = [
    { id: 't1', task: { dayNumber: 1 } },
    { id: 't2', task: { dayNumber: 2 } },
    { id: 't3', task: { dayNumber: 3 } }
  ];
  assert.equal(getNextUnfinishedDay(tasks, {}), 1);
  assert.equal(getNextUnfinishedDay(tasks, { t1: true }), 2);
  assert.equal(getNextUnfinishedDay(tasks, { t1: true, t2: true }), 3);
  assert.equal(getNextUnfinishedDay(tasks, { t1: true, t2: true, t3: true }), null);
  assert.equal(getNextUnfinishedDay([]), null);
});

test('computePhaseSummaries groups and enriches phases accurately', () => {
  const phases = [
    { phaseNumber: 1, phaseTitle: 'Phase 1: Foundations' },
    { phaseNumber: 2, phaseTitle: 'Phase 2: Core Engineering' }
  ];
  const tasksByPhase = {
    0: [
      { id: '0-task-1', task: { dayNumber: 1, title: 'Day 1' } },
      { id: '0-task-2', task: { dayNumber: 2, title: 'Day 2' } }
    ],
    1: [
      { id: '1-task-3', task: { dayNumber: 3, title: 'Day 3' } },
      { id: '1-task-4', task: { dayNumber: 4, title: 'Day 4' } }
    ]
  };
  const completed = { '0-task-1': true, '0-task-2': true };

  const summaries = computePhaseSummaries(phases, tasksByPhase, completed);
  assert.equal(summaries.length, 2);
  assert.equal(summaries[0].cleanTitle, 'Foundations');
  assert.equal(summaries[0].totalDays, 2);
  assert.equal(summaries[0].completedDays, 2);
  assert.equal(summaries[0].isCompleted, true);
  assert.equal(summaries[0].percent, 100);

  assert.equal(summaries[1].cleanTitle, 'Core Engineering');
  assert.equal(summaries[1].totalDays, 2);
  assert.equal(summaries[1].completedDays, 0);
  assert.equal(summaries[1].isCompleted, false);
  assert.equal(summaries[1].firstUnfinishedDay, 3);
  assert.equal(summaries[1].percent, 0);
});
