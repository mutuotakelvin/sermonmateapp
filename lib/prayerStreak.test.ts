import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeStreak, computeBestStreak } from './prayerStreak.ts';

// Run with: npm test
//
// A streak here is pastoral, not competitive: one prayer carries a day, and a
// single miss is absorbed rather than punished. Both rules are easy to break
// silently, so they are pinned.

test('consecutive logged days ending today', () => {
  const result = computeStreak(['2026-07-28', '2026-07-29', '2026-07-30'], '2026-07-30');
  assert.equal(result.current, 3);
  assert.deepEqual(result.graceDates, []);
});

test('today unlogged does not break the streak', () => {
  // Morning of the 30th, nothing prayed yet. The streak still stands at 2 —
  // it must not read as broken before the day has had a chance to happen.
  const result = computeStreak(['2026-07-28', '2026-07-29'], '2026-07-30');
  assert.equal(result.current, 2);
});

test('one prayer carries the day regardless of how many slots exist', () => {
  const result = computeStreak(['2026-07-30'], '2026-07-30');
  assert.equal(result.current, 1);
});

test('a single miss is absorbed by grace and the streak continues', () => {
  const result = computeStreak(
    ['2026-07-26', '2026-07-27', '2026-07-29', '2026-07-30'],
    '2026-07-30',
  );
  // 30, 29, [28 absorbed], 27, 26
  assert.equal(result.current, 4);
  assert.deepEqual(result.graceDates, ['2026-07-28']);
});

test('a second miss within seven days ends the streak', () => {
  const result = computeStreak(['2026-07-27', '2026-07-29', '2026-07-30'], '2026-07-30');
  // 30, 29, [28 absorbed], 27, then 26 missed with grace already spent.
  assert.equal(result.current, 3);
  assert.deepEqual(result.graceDates, ['2026-07-28']);
});

test('misses more than six days apart are each absorbed', () => {
  const logged = [
    '2026-07-20', '2026-07-22', '2026-07-23', '2026-07-24',
    '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-30',
  ];
  const result = computeStreak(logged, '2026-07-30');
  // 29 absorbed; 21 absorbed too — eight days earlier, outside the window.
  assert.equal(result.current, 9);
  assert.deepEqual(result.graceDates, ['2026-07-29', '2026-07-21']);
});

test('no logged days gives a zero streak', () => {
  assert.deepEqual(computeStreak([], '2026-07-30'), { current: 0, graceDates: [] });
});

test('grace never invents a streak out of nothing', () => {
  // Nothing logged for days. Absorbing here would report a streak the user
  // never had.
  const result = computeStreak(['2026-07-01'], '2026-07-30');
  assert.equal(result.current, 0);
  assert.deepEqual(result.graceDates, []);
});

test('duplicate entries on one day count once', () => {
  const result = computeStreak(['2026-07-30', '2026-07-30', '2026-07-29'], '2026-07-30');
  assert.equal(result.current, 2);
});

test('a streak spanning a month boundary is continuous', () => {
  const result = computeStreak(['2026-06-29', '2026-06-30', '2026-07-01'], '2026-07-01');
  assert.equal(result.current, 3);
});

// Best streak — the number that keeps someone going after a break. It uses the
// same grace rule as the current streak, so the two can never disagree about
// what counts as continuous.

test('best streak is the longest run, not the current one', () => {
  const logged = [
    '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05',
    // long gap
    '2026-07-20', '2026-07-21',
  ];
  assert.equal(computeBestStreak(logged), 5);
});

test('best streak absorbs a single miss the same way the current streak does', () => {
  const logged = ['2026-07-01', '2026-07-02', '2026-07-04', '2026-07-05'];
  // 3rd absorbed by grace -> one run of 4
  assert.equal(computeBestStreak(logged), 4);
});

test('best streak does not bridge a gap of two or more days', () => {
  const logged = ['2026-07-01', '2026-07-02', '2026-07-05', '2026-07-06'];
  assert.equal(computeBestStreak(logged), 2);
});

test('best streak will not spend grace twice inside seven days', () => {
  const logged = ['2026-07-01', '2026-07-03', '2026-07-05'];
  // 2nd absorbed -> run of 2; 4th cannot also be absorbed, so the run restarts.
  assert.equal(computeBestStreak(logged), 2);
});

test('best streak of an empty log is zero', () => {
  assert.equal(computeBestStreak([]), 0);
});

test('best streak counts a single day', () => {
  assert.equal(computeBestStreak(['2026-07-09']), 1);
});

test('best streak ignores duplicate entries on one day', () => {
  assert.equal(computeBestStreak(['2026-07-09', '2026-07-09', '2026-07-10']), 2);
});
