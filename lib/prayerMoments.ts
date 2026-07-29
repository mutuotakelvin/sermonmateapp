import type { PrayerLogEntry } from './types';

/**
 * The history screen's "recent moments" list: entries carrying something worth
 * re-reading — a note, a prayer, or both.
 *
 * A bare "I prayed" tick is deliberately excluded. The calendar already shows it
 * as a dot, and repeating every tick as a card would bury the handful of entries
 * that actually say something.
 */
export function momentsFor(log: PrayerLogEntry[], limit: number): PrayerLogEntry[] {
  return log
    .filter((entry) => Boolean(entry.note?.trim() || entry.prayer?.trim()))
    // filter() already returned a fresh array, so sorting it cannot disturb the
    // store's copy.
    .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
    .slice(0, limit);
}
