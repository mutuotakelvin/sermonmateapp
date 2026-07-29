import { test } from 'node:test';
import assert from 'node:assert/strict';

import { momentsFor } from './prayerMoments.ts';
import type { PrayerLogEntry } from './types.ts';

// Run with: npm test
//
// The history list is for things worth re-reading. A bare "I prayed" tick is
// already a dot on the calendar, so repeating it as a card would be noise.

function entry(over: Partial<PrayerLogEntry> & { id: string }): PrayerLogEntry {
  return {
    slotId: null,
    loggedAt: new Date('2026-07-29T09:00:00Z'),
    localDate: '2026-07-29',
    ...over,
  };
}

test('includes an entry that has only a note', () => {
  const result = momentsFor([entry({ id: 'a', note: 'for mum' })], 10);
  assert.deepEqual(result.map((item) => item.id), ['a']);
});

test('includes an entry that has only a prayer', () => {
  const result = momentsFor([entry({ id: 'a', prayer: 'Father, in this hour' })], 10);
  assert.deepEqual(result.map((item) => item.id), ['a']);
});

test('includes an entry carrying both', () => {
  const result = momentsFor([entry({ id: 'a', note: 'for mum', prayer: 'Father' })], 10);
  assert.deepEqual(result.map((item) => item.id), ['a']);
});

test('excludes a bare logged moment', () => {
  const result = momentsFor([entry({ id: 'a' })], 10);
  assert.deepEqual(result, []);
});

test('treats whitespace-only text as absent', () => {
  const result = momentsFor([entry({ id: 'a', note: '   ', prayer: '\n' })], 10);
  assert.deepEqual(result, []);
});

test('orders newest first regardless of input order', () => {
  const result = momentsFor(
    [
      entry({ id: 'old', note: 'x', loggedAt: new Date('2026-07-27T09:00:00Z') }),
      entry({ id: 'new', note: 'x', loggedAt: new Date('2026-07-29T09:00:00Z') }),
      entry({ id: 'mid', note: 'x', loggedAt: new Date('2026-07-28T09:00:00Z') }),
    ],
    10,
  );
  assert.deepEqual(result.map((item) => item.id), ['new', 'mid', 'old']);
});

test('respects the cap', () => {
  const log = Array.from({ length: 25 }, (_, index) =>
    entry({ id: `e${index}`, note: 'x', loggedAt: new Date(2026, 6, index + 1) }),
  );
  assert.equal(momentsFor(log, 10).length, 10);
});

test("does not mutate the caller's array", () => {
  const log = [
    entry({ id: 'old', note: 'x', loggedAt: new Date('2026-07-27T09:00:00Z') }),
    entry({ id: 'new', note: 'x', loggedAt: new Date('2026-07-29T09:00:00Z') }),
  ];
  momentsFor(log, 10);
  assert.deepEqual(log.map((item) => item.id), ['old', 'new']);
});
