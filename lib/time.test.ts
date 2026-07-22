import { test } from 'node:test';
import assert from 'node:assert/strict';

import { timeOfDay } from './time.ts';

// Run with: TZ=Africa/Nairobi npm test
//
// Regression test for the reminder showing 6:09 PM after 6:10 PM was picked.
//
// `new Date(0, 0, 0, h, m)` pins the time to 1899-12-31. Before 1928 Nairobi ran on
// Local Mean Time, UTC+02:27:16 — an offset that is NOT a whole number of minutes.
// Engines disagree about that remainder: Date arithmetic rounds it to +02:27 while
// ICU keeps the full +02:27:16. Construct with one and read back with the other and
// you land on 18:09:44, which `minute: '2-digit'` truncates (never rounds) to 6:09.
//
// So the invariant is not "the round-trip happens to work in this engine" — under
// Node's V8 the naive version round-trips fine, which is exactly why this only ever
// showed up on the device. The invariant is that we must never pin a time of day to
// a date whose UTC offset has a sub-minute component.

const offsetOf = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { timeZoneName: 'longOffset' }).format(d).split(', ').pop()!;

test('time of day sits at a whole-minute UTC offset', () => {
  const offset = offsetOf(timeOfDay(18, 10));
  // A zero offset formats as a bare "GMT", not "GMT+00:00".
  assert.match(
    offset,
    /^GMT([+-]\d{2}:\d{2})?$/,
    `offset ${offset} has a seconds component; a sub-minute offset truncates the displayed minute`,
  );
});

test('time of day is not pinned to the pre-1900 LMT era', () => {
  assert.ok(
    timeOfDay(18, 10).getFullYear() >= 1970,
    'times pinned before 1900 fall in the Local Mean Time era, where offsets carry seconds',
  );
});

test('round-trips through the fields the picker reads back', () => {
  const d = timeOfDay(18, 10);
  assert.equal(d.getHours(), 18);
  assert.equal(d.getMinutes(), 10);
});

test('formats as the label the user picked', () => {
  const label = timeOfDay(18, 10).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  assert.equal(label, '6:10 PM');
});

test('carries no seconds that could truncate downward', () => {
  const d = timeOfDay(18, 10);
  assert.equal(d.getSeconds(), 0);
  assert.equal(d.getMilliseconds(), 0);
});

test('handles midnight and noon', () => {
  assert.equal(timeOfDay(0, 0).getHours(), 0);
  assert.equal(timeOfDay(12, 0).getHours(), 12);
  assert.equal(
    timeOfDay(0, 5).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    '12:05 AM',
  );
});
