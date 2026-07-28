// Extension is required: this module is loaded by node --experimental-strip-types
// via prayerStreak.test.ts, and that resolver takes the specifier literally.
// Metro resolves the explicit extension too, so the app bundle is unaffected.
import { addDays, daysBetween } from './localDate.ts';

/**
 * Streak logic for the prayer routine. Pure — no I/O, no React — because this is
 * where the real logic risk lives.
 *
 * The rules are deliberately forgiving. A streak in a devotional app is meant to
 * encourage a practice, not to grade one, so a day counts on a single prayer and
 * an occasional miss is absorbed rather than punished.
 */

export interface StreakResult {
  /** Consecutive days ending today, or yesterday if today is not logged yet. */
  current: number;
  /** Missed days inside the streak that grace absorbed, most recent first. */
  graceDates: string[];
}

/** At most one absorbed miss per this many consecutive days. */
const GRACE_WINDOW_DAYS = 7;

/** Safety bound so a corrupt log can never spin the walk forever. */
const MAX_WALK_DAYS = 3650;

/**
 * Walk backwards from today, counting days with at least one prayer. A gap is
 * absorbed when no already-absorbed day sits within GRACE_WINDOW_DAYS of it;
 * otherwise the streak ends there.
 *
 * When today has nothing logged the walk starts at yesterday, so the streak
 * never reads as broken in the morning before the user has had a chance to pray.
 */
export function computeStreak(loggedDates: string[], today: string): StreakResult {
  const logged = new Set(loggedDates);
  const graceDates: string[] = [];

  let cursor = logged.has(today) ? today : addDays(today, -1);
  let current = 0;
  let lastAbsorbed: string | null = null;
  // Absorbed days are held here until another prayed day proves they bridged to
  // something. A gap that merely trails off the start of history is not grace —
  // committing it would spend the allowance on nothing and mark a "grace day" on
  // a date the user was simply not using the app yet.
  let pending: string[] = [];

  for (let guard = 0; guard < MAX_WALK_DAYS; guard += 1) {
    if (logged.has(cursor)) {
      current += 1;
      graceDates.push(...pending);
      pending = [];
      cursor = addDays(cursor, -1);
      continue;
    }

    // Grace can only extend a streak that already exists — absorbing a gap with
    // nothing behind it would report days the user never prayed.
    if (current === 0) break;

    const canAbsorb =
      lastAbsorbed === null || daysBetween(cursor, lastAbsorbed) >= GRACE_WINDOW_DAYS;
    if (!canAbsorb) break;

    lastAbsorbed = cursor;
    pending.push(cursor);
    cursor = addDays(cursor, -1);
  }

  return { current, graceDates };
}

/**
 * The longest run the user has ever managed, under the same grace rule as
 * `computeStreak`. Shown alongside the current streak because current-only
 * punishes a fresh start: after a break it reads as though the good months never
 * happened.
 *
 * Walks forward through the distinct logged days rather than backward from
 * today, since "best" has no anchor date.
 */
export function computeBestStreak(loggedDates: string[]): number {
  const days = [...new Set(loggedDates)].sort();
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  let lastAbsorbed: string | null = null;

  for (let i = 1; i < days.length; i += 1) {
    const gap = daysBetween(days[i - 1], days[i]);

    if (gap === 1) {
      run += 1;
    } else if (
      // One missing day can be bridged, and only if grace is not already spent
      // inside the window.
      gap === 2
      && (lastAbsorbed === null || daysBetween(days[i], lastAbsorbed) >= GRACE_WINDOW_DAYS)
    ) {
      lastAbsorbed = addDays(days[i], -1);
      run += 1;
    } else {
      run = 1;
    }

    if (run > best) best = run;
  }

  return best;
}
