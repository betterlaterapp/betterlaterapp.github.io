/**
 * Unit tests for sessions, "Do Before", report buckets and stat helpers.
 * Run with: npm run test:unit
 */
const test = require('node:test');
const assert = require('node:assert');

const Calc = require('../app/js/statsCalculations.js');
console.log = () => {};

const HOUR = 3600;
const DAY = 24 * HOUR;
const now = Math.floor(Date.now() / 1000);

function used(ts, extra) {
    return Object.assign({ clickType: 'used', timestamp: String(ts) }, extra);
}

test('entries close together form one session', () => {
    const actions = [
        used(now - 2 * DAY, { amount: 20, unit: 'pushups' }),
        used(now - 2 * DAY + 60, { amount: 15, unit: 'situps' }),
        { clickType: 'timed', timestamp: String(now - 2 * DAY + 120), duration: 1800 },
        used(now - DAY)
    ];
    const sessions = Calc.groupIntoSessions(actions);
    assert.strictEqual(sessions.length, 2);
    assert.strictEqual(sessions[0].entries.length, 3);
    assert.strictEqual(sessions[0].end, now - 2 * DAY + 120 + 1800);
});

test('Do Before uses the gap between sessions, not between entries', () => {
    const actions = [];
    for (let d = 4; d >= 1; d--) {
        actions.push(used(now - d * DAY, { amount: 20, unit: 'pushups' }));
        actions.push(used(now - d * DAY + 30, { amount: 15, unit: 'situps' }));
    }
    const doBefore = Calc.getDoBeforeTimestamp(actions, {}, null, now);
    const lastSessionEnd = now - DAY + 30;
    assert.ok(Math.abs(doBefore - (lastSessionEnd + DAY)) < 60, 'due about a day after the last session');
});

test('Do Before falls back to the baseline pace with one session', () => {
    const doBefore = Calc.getDoBeforeTimestamp([used(now - HOUR)], { timesDone: 7, usageTimeline: 'week' }, null, now);
    assert.strictEqual(doBefore, now - HOUR + DAY);
});

test('Do Before follows the active goal step', () => {
    const goal = { unit: 'times', currentAmount: 0, goalAmount: 14, measurementTimeline: 7, completionTimeline: 7, createdAt: (now - HOUR) * 1000 };
    const doBefore = Calc.getDoBeforeTimestamp([used(now - HOUR)], {}, goal, now);
    // Daily steps on a 7-day goal: day 1 rate is 2/week, so one session every 3.5 days
    assert.strictEqual(doBefore, now - HOUR + 3.5 * DAY);
});

test('typical amount per session is the median per type', () => {
    const sessions = Calc.groupIntoSessions([
        used(now - 3 * DAY, { amount: 10, unit: 'pushups' }),
        used(now - 2 * DAY, { amount: 20, unit: 'pushups' }),
        used(now - 2 * DAY + 10, { amount: 10, unit: 'pushups' }),
        used(now - DAY, { amount: 40, unit: 'pushups' })
    ]);
    assert.deepStrictEqual(Calc.getTypicalAmountPerSession(sessions), { pushups: 30 });
});

test('week buckets are 7 calendar days starting at midnight', () => {
    const edges = Calc.getReportBucketEdges('week', now);
    assert.strictEqual(edges.length, 8);
    edges.forEach(e => assert.strictEqual(new Date(e * 1000).getHours(), 0));
    assert.ok(edges[6] <= now && now < edges[7], 'today is the last bucket');
});

test('day buckets cover the whole day', () => {
    const edges = Calc.getReportBucketEdges('day', now);
    assert.strictEqual(edges.length, 25);
    assert.strictEqual(new Date(edges[0] * 1000).getHours(), 0);
    assert.ok(edges[24] > now);
});

test('average per day counts days with nothing logged', () => {
    const actions = [used(now - 9 * DAY), used(now)];
    // 10 calendar days, 2 entries
    assert.strictEqual(Calc.getAverageCountPerDay(actions), 0);
    assert.strictEqual(Calc.getAverageTimePerDay([
        { clickType: 'timed', timestamp: String(now - 3 * DAY), duration: 4000 }
    ]), 1000);
});

test('resist streak follows time order and counts timed sessions as doing it', () => {
    const actions = [
        { clickType: 'craved', timestamp: String(now - 5 * HOUR) },
        { clickType: 'craved', timestamp: String(now - 1 * HOUR) },
        { clickType: 'timed', timestamp: String(now - 3 * HOUR), duration: 60 },
        { clickType: 'craved', timestamp: String(now - 4 * HOUR) }
    ];
    assert.strictEqual(Calc.calculateResistStreak(actions), 2);
    assert.strictEqual(Calc.getCurrentResistStreak(actions), 1);
});
