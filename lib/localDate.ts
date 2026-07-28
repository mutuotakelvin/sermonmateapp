/**
 * Calendar-day helpers that answer "which day is this for the user?" — never
 * "which day is this in UTC?".
 *
 * `toISOString().split('T')[0]` looks like the same thing and is not. It
 * converts to UTC first, so east of Greenwich a local midnight lands on the
 * previous day and west of it a late evening lands on the next one. That has
 * already produced two bugs here: the home screen's week strip rendering a
 * Tuesday check-in under Wed, and the prayer streak breaking overnight.
 *
 * Keys are "YYYY-MM-DD" strings. They carry no time and no zone, so comparing
 * and diffing them stays whole-day even across offset changes.
 */

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  // Local noon, not midnight: a DST jump can move midnight onto the adjacent
  // day, and noon is far enough from any transition to be safe.
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function addDays(key: string, delta: number): string {
  const date = parseKey(key);
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(parseKey(a).getTime() - parseKey(b).getTime());
  return Math.round(ms / 86_400_000);
}
