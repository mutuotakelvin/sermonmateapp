import { test } from 'node:test';
import assert from 'node:assert/strict';

import { localDateKey, addDays, daysBetween } from './localDate.ts';

// Run with: npm test
//
// A calendar day belongs to the user, not to UTC. toISOString() answers a
// different question and has now produced two separate bugs in this app, so the
// rule lives here with the cases that catch it.

test('localDateKey uses local calendar fields, not UTC', () => {
  // Local midnight. East of Greenwich this is the PREVIOUS day in UTC, which is
  // exactly what broke the home screen's week strip: every cell was shifted a
  // day, so a Tuesday check-in rendered under Wed.
  assert.equal(localDateKey(new Date(2026, 6, 26, 0, 0, 0)), '2026-07-26');
  // Late evening. West of Greenwich this is the NEXT day in UTC.
  assert.equal(localDateKey(new Date(2026, 6, 26, 23, 59, 0)), '2026-07-26');
});

test('localDateKey zero-pads month and day', () => {
  assert.equal(localDateKey(new Date(2026, 0, 5, 12, 0, 0)), '2026-01-05');
});

test('a week built from local midnight maps each index to the right weekday', () => {
  // Regression for the home screen: Sunday 26 Jul 2026 + 2 must be Tue 28 Jul.
  const weekStart = new Date(2026, 6, 26, 0, 0, 0);
  const cell = new Date(weekStart);
  cell.setDate(cell.getDate() + 2);
  assert.equal(localDateKey(cell), '2026-07-28');
  assert.equal(cell.getDay(), 2); // Tuesday
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-07-31', 1), '2026-08-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('daysBetween counts whole days regardless of order', () => {
  assert.equal(daysBetween('2026-07-30', '2026-07-24'), 6);
  assert.equal(daysBetween('2026-07-24', '2026-07-30'), 6);
});

test('daysBetween is unaffected by daylight-saving style hour shifts', () => {
  // Keys carry no time, so arithmetic stays whole-day even where the local
  // offset changes between the two dates.
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});
