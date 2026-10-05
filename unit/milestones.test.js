/**
 * Unit tests for the goal milestone engine (no browser needed).
 * Run with: npm run test:unit
 */
const test = require('node:test');
const assert = require('node:assert');

global.StatsCalculationsModule = require('../app/js/statsCalculations.js');
const GoalMilestonesModule = require('../app/js/goalMilestones.js');
const Calc = global.StatsCalculationsModule;

const DAY_MS = 24 * 60 * 60 * 1000;
console.log = () => {};

function makeGoal(overrides) {
    return Object.assign({
        unit: 'times',
        currentAmount: 0,
        goalAmount: 7,
        measurementTimeline: 7,
        completionTimeline: 28,
        createdAt: Date.now()
    }, overrides);
}

function countsPerStep(goal) {
    const schedule = Calc.calculateMilestoneSchedule(goal);
    const counts = Calc.getGoalStepPlan(goal).map(() => 0);
    schedule.forEach(m => counts[m.stepIndex]++);
    return counts;
}

// Action at a given offset (ms) from goal start
function actionAt(goal, offsetMs, extra) {
    return Object.assign({ clickType: 'used', timestamp: Math.floor((goal.createdAt + offsetMs) / 1000) }, extra);
}

test('increasing goal from 0 ramps in weekly steps that start in week 1', () => {
    const goal = makeGoal({ currentAmount: 0, goalAmount: 7, completionTimeline: 28 });
    const counts = countsPerStep(goal);
    assert.strictEqual(counts.length, 4);
    assert.ok(counts[0] >= 1, 'week 1 has milestones');
    for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], 'never steps down');
    assert.strictEqual(counts[3], 7, 'final week is at the goal rate');
});

test('short increasing goal ramps daily instead of bunching at the end', () => {
    const goal = makeGoal({ currentAmount: 1, goalAmount: 7, completionTimeline: 7 });
    const schedule = Calc.calculateMilestoneSchedule(goal);
    assert.ok(schedule.length >= 4, 'about half a week of extra sessions');
    assert.ok(schedule[0].timestamp - goal.createdAt < 4 * DAY_MS, 'first milestone in the first half');
});

test('decreasing goal tapers by a constant percentage per week', () => {
    const goal = makeGoal({ currentAmount: 80, goalAmount: 10, completionTimeline: 21 });
    const rates = Calc.getGoalStepPlan(goal).map(s => s.rate);
    assert.ok(Math.abs(rates[0] / 80 - rates[1] / rates[0]) < 1e-9);
    assert.ok(Math.abs(rates[1] / rates[0] - rates[2] / rates[1]) < 1e-9);
    assert.ok(Math.abs(rates[2] - 10) < 1e-9);
});

test('taper to zero ends with a milestone-free final week', () => {
    const goal = makeGoal({ currentAmount: 20, goalAmount: 0, completionTimeline: 28 });
    const counts = countsPerStep(goal);
    assert.strictEqual(counts[3], 0);
    assert.ok(counts[0] > counts[1] && counts[1] > counts[2]);
});

test('total milestone count matches the schedule', () => {
    const goal = makeGoal({ currentAmount: 3, goalAmount: 9, completionTimeline: 14 });
    assert.strictEqual(Calc.calculateTotalMilestones(goal), Calc.calculateMilestoneSchedule(goal).length);
});

test('do more: missed milestones expire instead of piling up', () => {
    const goal = makeGoal({ currentAmount: 7, goalAmount: 7, completionTimeline: 14, createdAt: Date.now() - 3.5 * DAY_MS });
    // Daily milestones; skip days 1-2, do it once on day 3
    const actions = [actionAt(goal, 2.5 * DAY_MS)];
    const result = GoalMilestonesModule.generateScheduleMilestones(goal, actions, false);
    assert.deepStrictEqual(result.all.slice(0, 3).map(m => m.status), ['missed', 'missed', 'completed']);
    assert.strictEqual(result.track.status, 'on-track', 'one session back on schedule clears "behind"');
});

test('do more: extra sessions bank toward upcoming milestones', () => {
    const goal = makeGoal({ currentAmount: 7, goalAmount: 7, completionTimeline: 14, createdAt: Date.now() - 0.5 * DAY_MS });
    const actions = [actionAt(goal, 0.1 * DAY_MS), actionAt(goal, 0.2 * DAY_MS)];
    const result = GoalMilestonesModule.generateScheduleMilestones(goal, actions, false);
    assert.strictEqual(result.track.status, 'ahead');
    assert.strictEqual(result.track.count, 2);
    assert.strictEqual(result.next.index, 3);
});

test('do less: a slip costs one milestone, then the plan carries on', () => {
    const goal = makeGoal({ currentAmount: 7, goalAmount: 7, completionTimeline: 14, createdAt: Date.now() - 4.5 * DAY_MS });
    // Allowed one use per day after each daily milestone; use 3 times on day 2
    const actions = [1.2, 1.4, 1.6].map(d => actionAt(goal, d * DAY_MS));
    const result = GoalMilestonesModule.generateScheduleMilestones(goal, actions, true);
    assert.deepStrictEqual(result.all.slice(0, 4).map(m => m.status), ['completed', 'missed', 'completed', 'completed']);
    assert.strictEqual(result.track.status, 'on-track');
});

test('do less: allowance is available once the wait has passed', () => {
    const goal = makeGoal({ currentAmount: 7, goalAmount: 7, completionTimeline: 14, createdAt: Date.now() - 1.5 * DAY_MS });
    const waited = GoalMilestonesModule.generateScheduleMilestones(goal, [], true);
    assert.strictEqual(waited.next.availableNow, true);

    const used = GoalMilestonesModule.generateScheduleMilestones(goal, [actionAt(goal, 1.2 * DAY_MS)], true);
    assert.strictEqual(used.next.availableNow, false);
});

test('time goals count minutes in session-sized milestones', () => {
    const goal = makeGoal({ unit: 'minutes', currentAmount: 60, goalAmount: 180, chunkSize: 60 });
    assert.strictEqual(Calc.getActionMilestoneUnits(goal, { clickType: 'timed', duration: 7200 }), 2);
    assert.strictEqual(Calc.getActionMilestoneUnits(goal, { clickType: 'used' }), 0);
});

test('spending goals without a chunk get about one milestone per day', () => {
    const goal = makeGoal({ unit: 'dollars', currentAmount: 100, goalAmount: 100, completionTimeline: 7 });
    assert.strictEqual(Calc.getMilestoneUnitSize(goal), 14);
    assert.strictEqual(Calc.calculateMilestoneSchedule(goal).length, 7);
});
