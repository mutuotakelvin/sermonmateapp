# Prayer Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user set named prayer times, be reminded at each, log that they prayed with an optional note, and see a streak that grace absorbs rather than punishes.

**Architecture:** A pure streak/date module with full unit coverage; a Firestore API following the existing `lib/sermonApi.ts` pattern; and a new `lib/reminderScheduler.ts` that takes sole ownership of the notification schedule so prayer reminders and the daily verse can coexist. UI is a home row plus two screens.

**Tech Stack:** Expo (expo-router), React Native, TypeScript, Zustand, Firebase Web SDK v9 modular, expo-notifications, `node --test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-28-prayer-goals-design.md`
**Mockups:** `docs/prayer-goals-mockups.html`

## Global Constraints

- **Free feature.** Nothing here is Pro-gated. Only "Pray with me" spends quota, via the existing `generatePrayer` callable.
- **No guilt copy anywhere.** No "you lost your streak", no red for missed days, no "you're falling behind". Missed days are absent, not marked failures.
- **Dates are local, never UTC.** Use `localDateKey()` from Task 1. Never `toISOString().slice(0,10)` for anything user-facing.
- **Pre-filled slots are created `enabled: false`.** They are suggestions until the user turns them on. Never schedule notifications the user did not ask for.
- **Grace:** at most one absorbed miss per 7 consecutive days.
- **Streak when today is unlogged:** computed backward from yesterday, so it never reads as broken in the morning.
- **Theme:** all styling via `useTheme()` + `makeStyles(theme)` per `components/ui/Card.tsx`. No hardcoded colours.
- **Tests:** `node --test` style matching `lib/sanitizeAiText.test.ts`. Run with `npm test`. Test files are `lib/<name>.test.ts` — the npm script only globs `lib/**` and `components/**`.
- **Commits:** conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`) matching git history. Work on branch `feature/prayer-goals`.

## File Structure

**Create:**
- `lib/prayerStreak.ts` — pure date + streak logic. No I/O, no React.
- `lib/prayerStreak.test.ts` — unit tests.
- `lib/prayerApi.ts` — Firestore CRUD for slots and log entries.
- `lib/reminderScheduler.ts` — sole owner of the notification schedule.
- `lib/stores/prayer.ts` — Zustand store.
- `components/PrayerTimesCard.tsx` — home row.
- `components/PrayerSlotRow.tsx` — one slot row.
- `components/PrayerLogSheet.tsx` — log confirmation + optional note.
- `app/(protected)/prayer.tsx` — main screen.
- `app/(protected)/prayer-history.tsx` — history screen.

**Modify:**
- `lib/types.ts` — new types.
- `lib/notifications.ts` — delegate scheduling to `reminderScheduler`.
- `firestore.rules` — allow owner access to prayer subcollections.
- `app/(protected)/(tabs)/home.tsx` — mount the home row.
- `app/_layout.tsx` — notification response listener.
- `docs/local-android-build.md` — smoke test additions.

---

### Task 1: Streak and local-date logic

Pure functions, no dependencies. This is where the real logic risk lives, so it gets full test coverage first.

**Files:**
- Create: `lib/prayerStreak.ts`
- Test: `lib/prayerStreak.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `localDateKey(date: Date): string` — `"YYYY-MM-DD"` in device-local time.
  - `addDays(key: string, delta: number): string` — date arithmetic on keys.
  - `daysBetween(a: string, b: string): number` — absolute whole-day distance.
  - `computeStreak(loggedDates: string[], today: string): StreakResult`
  - `interface StreakResult { current: number; graceDates: string[] }`

- [ ] **Step 1: Write the failing tests**

Create `lib/prayerStreak.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { localDateKey, addDays, daysBetween, computeStreak } from './prayerStreak.ts';

// Run with: npm test
//
// Streaks belong to the user's day, not UTC, and a missed day is absorbed rather
// than punished. Both rules are easy to get subtly wrong, so they are pinned here.

test('localDateKey uses local calendar fields, not UTC', () => {
  // 01:00 local. In Nairobi (UTC+3) the UTC date is the PREVIOUS day, so a
  // UTC-derived key would file this prayer under yesterday.
  assert.equal(localDateKey(new Date(2026, 6, 30, 1, 0, 0)), '2026-07-30');
  assert.equal(localDateKey(new Date(2026, 6, 30, 23, 30, 0)), '2026-07-30');
});

test('localDateKey zero-pads month and day', () => {
  assert.equal(localDateKey(new Date(2026, 0, 5, 12, 0, 0)), '2026-01-05');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-07-31', 1), '2026-08-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('daysBetween counts whole days regardless of order', () => {
  assert.equal(daysBetween('2026-07-30', '2026-07-24'), 6);
  assert.equal(daysBetween('2026-07-24', '2026-07-30'), 6);
});

test('consecutive logged days ending today', () => {
  const result = computeStreak(['2026-07-28', '2026-07-29', '2026-07-30'], '2026-07-30');
  assert.equal(result.current, 3);
  assert.deepEqual(result.graceDates, []);
});

test('today unlogged does not break the streak', () => {
  // Morning of the 30th, nothing prayed yet. The streak stands at 2.
  const result = computeStreak(['2026-07-28', '2026-07-29'], '2026-07-30');
  assert.equal(result.current, 2);
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
  const result = computeStreak(
    ['2026-07-27', '2026-07-29', '2026-07-30'],
    '2026-07-30',
  );
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
  // 29 absorbed; 21 absorbed (8 days earlier, outside the window).
  assert.equal(result.current, 9);
  assert.deepEqual(result.graceDates, ['2026-07-29', '2026-07-21']);
});

test('no logged days gives a zero streak', () => {
  assert.deepEqual(computeStreak([], '2026-07-30'), { current: 0, graceDates: [] });
});

test('duplicate entries on one day count once', () => {
  const result = computeStreak(['2026-07-30', '2026-07-30', '2026-07-29'], '2026-07-30');
  assert.equal(result.current, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './prayerStreak.ts'`

- [ ] **Step 3: Implement**

Create `lib/prayerStreak.ts`:

```ts
/**
 * Pure date and streak logic for the prayer routine. No I/O, no React — this is
 * the part with real logic risk, so it is kept isolated and fully tested.
 */

export interface StreakResult {
  /** Consecutive days ending today (or yesterday, if today is not logged yet). */
  current: number;
  /** Missed days inside the streak that grace absorbed, most recent first. */
  graceDates: string[];
}

/** At most one absorbed miss per this many consecutive days. */
const GRACE_WINDOW_DAYS = 7;

/**
 * "YYYY-MM-DD" from the LOCAL calendar fields. Never use toISOString() here:
 * UTC and local disagree near midnight, and a streak belongs to the user's day.
 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
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

/**
 * Walk backwards from today counting days with at least one prayer. A gap is
 * absorbed if no earlier-absorbed day sits within GRACE_WINDOW_DAYS; otherwise
 * the streak ends there.
 *
 * When today has nothing logged the walk starts at yesterday, so the streak does
 * not read as broken every morning before the user has had a chance to pray.
 */
export function computeStreak(loggedDates: string[], today: string): StreakResult {
  const logged = new Set(loggedDates);
  const graceDates: string[] = [];

  let cursor = logged.has(today) ? today : addDays(today, -1);
  let current = 0;
  let lastAbsorbed: string | null = null;

  // Bound the walk so a corrupt log can never spin forever.
  for (let guard = 0; guard < 3650; guard += 1) {
    if (logged.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    const canAbsorb =
      lastAbsorbed === null || daysBetween(cursor, lastAbsorbed) >= GRACE_WINDOW_DAYS;
    if (!canAbsorb) break;

    // Never absorb a gap that has no streak behind it — that would invent days.
    if (current === 0) break;

    lastAbsorbed = cursor;
    graceDates.push(cursor);
    cursor = addDays(cursor, -1);
  }

  return { current, graceDates };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/prayerStreak.ts lib/prayerStreak.test.ts
git commit -m "feat: prayer streak and local-date logic"
```

---

### Task 2: Types, Firestore API, and security rules

**Files:**
- Modify: `lib/types.ts` (append)
- Create: `lib/prayerApi.ts`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `localDateKey` from Task 1; `auth`, `db` from `lib/firebase.ts`.
- Produces:
  - `interface PrayerSlot { id: string; label: string; hour: number; minute: number; enabled: boolean }`
  - `interface PrayerLogEntry { id: string; slotId: string | null; loggedAt: Date; localDate: string; note?: string }`
  - `getPrayerSlots(): Promise<PrayerSlot[]>`
  - `savePrayerSlots(slots: PrayerSlot[]): Promise<void>`
  - `logPrayer(input: { slotId: string | null; note?: string }): Promise<PrayerLogEntry>`
  - `updatePrayerNote(entryId: string, note: string): Promise<void>`
  - `getPrayerLog(sinceDays: number): Promise<PrayerLogEntry[]>`
  - `DEFAULT_SLOTS: PrayerSlot[]`

- [ ] **Step 1: Add the types**

Append to `lib/types.ts`:

```ts
export interface PrayerSlot {
  id: string;
  label: string;
  hour: number;
  minute: number;
  /** Pre-filled suggestions start false — never schedule what wasn't asked for. */
  enabled: boolean;
}

export interface PrayerLogEntry {
  id: string;
  /** null when logged outside any slot ("I prayed just now"). */
  slotId: string | null;
  loggedAt: Date;
  /** "YYYY-MM-DD" in the user's local time. See lib/prayerStreak.ts. */
  localDate: string;
  note?: string;
}
```

- [ ] **Step 2: Implement the Firestore API**

Create `lib/prayerApi.ts`, following the collection-helper pattern in `lib/sermonApi.ts`:

```ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import { addDays, localDateKey } from './prayerStreak';
import type { PrayerLogEntry, PrayerSlot } from './types';

/** Suggestions shown on first run. Disabled until the user turns them on. */
export const DEFAULT_SLOTS: PrayerSlot[] = [
  { id: 'morning', label: 'Morning', hour: 6, minute: 30, enabled: false },
  { id: 'midday', label: 'Midday', hour: 13, minute: 0, enabled: false },
  { id: 'evening', label: 'Evening', hour: 21, minute: 0, enabled: false },
];

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to manage prayer times');
  return uid;
}

function configDoc() {
  return doc(db, 'users', requireUid(), 'prayer', 'config');
}

function logCollection() {
  return collection(db, 'users', requireUid(), 'prayerLog');
}

export async function getPrayerSlots(): Promise<PrayerSlot[]> {
  const snapshot = await getDoc(configDoc());
  if (!snapshot.exists()) return DEFAULT_SLOTS;
  const slots = snapshot.data()?.slots;
  return Array.isArray(slots) && slots.length > 0 ? (slots as PrayerSlot[]) : DEFAULT_SLOTS;
}

export async function savePrayerSlots(slots: PrayerSlot[]): Promise<void> {
  await setDoc(configDoc(), { slots, updatedAt: serverTimestamp() }, { merge: true });
}

export async function logPrayer(input: {
  slotId: string | null;
  note?: string;
}): Promise<PrayerLogEntry> {
  const now = new Date();
  const localDate = localDateKey(now);
  const payload = {
    slotId: input.slotId,
    localDate,
    loggedAt: serverTimestamp(),
    ...(input.note ? { note: input.note } : {}),
  };
  const ref = await addDoc(logCollection(), payload);
  return { id: ref.id, slotId: input.slotId, loggedAt: now, localDate, note: input.note };
}

export async function updatePrayerNote(entryId: string, note: string): Promise<void> {
  await updateDoc(doc(db, 'users', requireUid(), 'prayerLog', entryId), { note });
}

export async function getPrayerLog(sinceDays: number): Promise<PrayerLogEntry[]> {
  const since = addDays(localDateKey(new Date()), -sinceDays);
  const snapshot = await getDocs(
    query(
      logCollection(),
      where('localDate', '>=', since),
      orderBy('localDate', 'desc'),
      limit(500),
    ),
  );
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      slotId: data.slotId ?? null,
      // serverTimestamp() is null until the write lands; fall back so an offline
      // entry still renders immediately.
      loggedAt: data.loggedAt instanceof Timestamp ? data.loggedAt.toDate() : new Date(),
      localDate: data.localDate,
      note: data.note,
    };
  });
}
```

- [ ] **Step 3: Add the security rules**

In `firestore.rules`, inside `match /users/{uid}`, directly after the `sermons` block:

```
      match /prayer/{docId} {
        allow read, write: if isOwner(uid);
      }

      match /prayerLog/{entryId} {
        allow read, write: if isOwner(uid);
      }
```

- [ ] **Step 4: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/prayerApi.ts firestore.rules
git commit -m "feat: prayer slots and log persistence"
```

---

### Task 3: Extract the reminder scheduler

The risky refactor, done on its own so it can be reviewed and reverted independently. Behaviour of the daily verse must not change.

`lib/notifications.ts:124` currently carries the note *"cancels ALL scheduled notifications app-wide… switch to per-identifier cancellation if another type is ever added."* This task is that switch.

**Files:**
- Create: `lib/reminderScheduler.ts`
- Modify: `lib/notifications.ts`

**Interfaces:**
- Consumes: `ReminderSettings`, `ReminderStatus` from `lib/notifications.ts`; `PrayerSlot` from `lib/types.ts`.
- Produces:
  - `ensureChannels(): void`
  - `canScheduleExactAlarms(): Promise<boolean>` (moved)
  - `openExactAlarmSettings(): Promise<void>` (moved)
  - `rearmAllSerialized(settings: ReminderSettings, slots: PrayerSlot[]): Promise<ReminderStatus>`
    — **the only export callers should use.** `rearmAll` is the unserialized inner
    function and is not exported; the wrapper preserves the existing `inFlight`
    guarantee that two callers cannot interleave cancel/schedule and double the
    notification window.
  - `PRAYER_CHANNEL_ID = 'prayer-times'`
  - `PRAYER_CATEGORY_ID = 'prayer-reminder'`
  - `updatePrayerNote` (Task 2) is what `PrayerLogSheet`'s `onSaveNote` calls.

- [ ] **Step 1: Create the scheduler with the moved helpers**

Create `lib/reminderScheduler.ts`. Move `loadPermissionsSdk`, `canScheduleExactAlarms`, `openExactAlarmSettings`, and the `ANDROID_12` constant out of `lib/notifications.ts` verbatim — including the lazy-require of `react-native-permissions`, which must not become an eager import (its spec calls `TurboModuleRegistry.getEnforcing('RNPermissions')` at import scope and would white-screen an un-rebuilt client).

Then add:

```ts
export const VERSE_CHANNEL_ID = 'daily-verse';
export const PRAYER_CHANNEL_ID = 'prayer-times';

export function ensureChannels(): void {
  if (Platform.OS !== 'android') return;
  Notifications.setNotificationChannelAsync(VERSE_CHANNEL_ID, {
    name: 'Daily Verse',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch((error) => console.error('Error creating verse channel:', error));
  // Its own channel so prayer nudges can be muted without losing the daily verse.
  Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
    name: 'Prayer Times',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch((error) => console.error('Error creating prayer channel:', error));
}

/**
 * Sole owner of the notification schedule. Cancels everything once, then rebuilds
 * the verse window AND every enabled prayer slot in one pass.
 *
 * Centralising the cancel is the point: scheduling the two independently would
 * mean editing the verse reminder time silently destroys prayer reminders.
 */
export async function rearmAll(
  settings: ReminderSettings,
  slots: PrayerSlot[],
): Promise<ReminderStatus> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const enabledSlots = slots.filter((slot) => slot.enabled);
    if (!settings.reminderEnabled && enabledSlots.length === 0) return 'disabled';

    const granted = await requestNotificationPermission();
    if (!granted) return 'unavailable';

    if (settings.reminderEnabled) await scheduleVerseWindow(settings);
    for (const slot of enabledSlots) await schedulePrayerSlot(slot);

    return (await canScheduleExactAlarms()) ? 'ok' : 'inexact';
  } catch (error) {
    console.error('Error arming reminders:', error);
    return 'unavailable';
  }
}
```

`scheduleVerseWindow` is the body of the current `runReschedule` from the `const now = new Date()` line through the `for` loop, unchanged. `schedulePrayerSlot` is new:

```ts
async function schedulePrayerSlot(slot: PrayerSlot): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${slot.label} prayer`,
      // Deliberately unpressured. No "don't break your streak".
      body: "A few minutes, whenever you're ready.",
      data: { screen: 'prayer', slotId: slot.id },
      categoryIdentifier: PRAYER_CATEGORY_ID,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: slot.hour,
      minute: slot.minute,
      channelId: PRAYER_CHANNEL_ID,
    },
  });
}
```

`PRAYER_CATEGORY_ID` is defined in Task 8; for this task export `export const PRAYER_CATEGORY_ID = 'prayer-reminder';` from this file and set no actions yet.

Move the `inFlight` serialization wrapper here unchanged and re-export it as `rearmAllSerialized`, keeping the guarantee that two callers cannot interleave cancel/schedule.

- [ ] **Step 2: Make `notifications.ts` delegate**

`lib/notifications.ts` keeps `ReminderSettings`, `ReminderStatus`, the verse content helpers, and `configureNotifications()` (which now calls `ensureChannels()`). Replace `rescheduleDailyVerse` with:

```ts
import { rearmAllSerialized } from './reminderScheduler';
import { getPrayerSlots } from './prayerApi';

/**
 * Kept for existing callers. Reads the current prayer slots so re-arming the
 * verse reminder never drops them.
 */
export async function rescheduleDailyVerse(settings: ReminderSettings): Promise<ReminderStatus> {
  const slots = await getPrayerSlots().catch(() => []);
  return rearmAllSerialized(settings, slots);
}
```

Re-export `canScheduleExactAlarms` and `openExactAlarmSettings` from `notifications.ts` so existing importers (the verse screen) keep working unchanged.

- [ ] **Step 3: Verify nothing broke**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, 27+ tests pass.

Then grep for stale importers:

Run: `grep -rn "cancelAllScheduledNotificationsAsync" lib app components`
Expected: exactly one hit, in `lib/reminderScheduler.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/reminderScheduler.ts lib/notifications.ts
git commit -m "refactor: single owner for the notification schedule"
```

---

### Task 4: Prayer store

**Files:**
- Create: `lib/stores/prayer.ts`

**Interfaces:**
- Consumes: `getPrayerSlots`, `savePrayerSlots`, `logPrayer`, `getPrayerLog` (Task 2); `computeStreak`, `localDateKey` (Task 1); `rearmAllSerialized` (Task 3).
- Produces: `usePrayerStore` with `{ slots, log, streak, loading, load(), setSlots(slots), logPrayer(slotId, note?), todayCount() }`.

- [ ] **Step 1: Implement, following `lib/stores/mood.ts`**

```ts
import { create } from 'zustand';

import { computeStreak, localDateKey, type StreakResult } from '@/lib/prayerStreak';
import {
  getPrayerLog,
  getPrayerSlots,
  logPrayer as logPrayerRemote,
  savePrayerSlots,
} from '@/lib/prayerApi';
import type { PrayerLogEntry, PrayerSlot } from '@/lib/types';

/** Enough history for the month view and any plausible streak. */
const HISTORY_DAYS = 400;

interface PrayerState {
  slots: PrayerSlot[];
  log: PrayerLogEntry[];
  streak: StreakResult;
  loading: boolean;
  load: () => Promise<void>;
  setSlots: (slots: PrayerSlot[]) => Promise<void>;
  logPrayer: (slotId: string | null, note?: string) => Promise<PrayerLogEntry | null>;
  todayCount: () => number;
}

function recompute(log: PrayerLogEntry[]): StreakResult {
  return computeStreak(log.map((entry) => entry.localDate), localDateKey(new Date()));
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  slots: [],
  log: [],
  streak: { current: 0, graceDates: [] },
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const [slots, log] = await Promise.all([getPrayerSlots(), getPrayerLog(HISTORY_DAYS)]);
      set({ slots, log, streak: recompute(log), loading: false });
    } catch (error) {
      console.error('Failed to load prayer data', error);
      set({ loading: false });
    }
  },

  setSlots: async (slots) => {
    set({ slots });
    await savePrayerSlots(slots);
  },

  logPrayer: async (slotId, note) => {
    try {
      const entry = await logPrayerRemote({ slotId, note });
      const log = [entry, ...get().log];
      set({ log, streak: recompute(log) });
      return entry;
    } catch (error) {
      console.error('Failed to log prayer', error);
      return null;
    }
  },

  todayCount: () => {
    const today = localDateKey(new Date());
    return get().log.filter((entry) => entry.localDate === today).length;
  },
}));
```

Note: rescheduling after `setSlots` is the caller's job — the screen owns the `ReminderSettings` it must pass to `rearmAllSerialized`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/stores/prayer.ts
git commit -m "feat: prayer routine store"
```

---

### Task 5: Prayer times screen

**Files:**
- Create: `components/PrayerSlotRow.tsx`, `components/PrayerLogSheet.tsx`, `app/(protected)/prayer.tsx`

**Interfaces:**
- Consumes: `usePrayerStore` (Task 4), `useTheme`/`AppTheme`, `PrimaryButton`, `AppText`, `Screen`, `ConfirmationModal`.
- Produces: route `/prayer`.

Screen composition, per mockup section 2:
1. Streak header — `Card` with `theme.color.charcoal` background, `streak.current` in serif, seven day-dots for the current week (`full` = logged, `grace` = in `streak.graceDates`, plain = neither).
2. One `PrayerSlotRow` per slot, sorted by `hour`/`minute`.
3. `PrimaryButton` variant ghost: "I prayed just now" → `logPrayer(null)` then open `PrayerLogSheet`.

- [ ] **Step 1: Build `PrayerSlotRow`**

```tsx
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { useTheme, type AppTheme } from '@/lib/theme';
import type { PrayerSlot } from '@/lib/types';

export default function PrayerSlotRow({
  slot, logged, note, isNext, onLog, onEdit,
}: {
  slot: PrayerSlot;
  logged: boolean;
  note?: string;
  isNext: boolean;
  onLog: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const time = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;

  return (
    <Pressable onPress={onEdit} style={[styles.card, isNext && styles.next]}>
      <Pressable onPress={onLog} hitSlop={8} style={[styles.tick, logged && styles.tickDone, isNext && !logged && styles.tickNext]}>
        {logged ? <AppText style={styles.check}>✓</AppText> : null}
      </Pressable>
      <View style={styles.main}>
        <AppText variant="body" style={styles.name}>{slot.label}</AppText>
        <AppText variant="caption">{time}</AppText>
        {note ? <AppText variant="caption" style={styles.note}>{note}</AppText> : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, padding: theme.space.lg, marginBottom: theme.space.sm,
  },
  next: { borderColor: theme.color.accent },
  tick: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center',
  },
  tickDone: { backgroundColor: theme.color.sage, borderColor: theme.color.sage },
  tickNext: { borderColor: theme.color.accent, borderStyle: 'dashed' },
  check: { color: theme.color.accentText },
  main: { flex: 1 },
  name: { fontWeight: '600' },
  note: { fontStyle: 'italic' },
});
```

- [ ] **Step 2: Build `PrayerLogSheet`**

A `Modal` with `transparent`, containing a bottom sheet. Critically: **the entry is already written before this opens.** The sheet only offers to attach a note, so dismissing it loses nothing.

Props: `{ visible: boolean; slotLabel: string; onSaveNote: (note: string) => void; onPrayWithMe: () => void; onClose: () => void }`.
Body: title `${slotLabel} logged`, subtitle "Anything you want to remember?", a `TextInput` bound to local state, `PrimaryButton` "Done" (calls `onSaveNote` when non-empty, then `onClose`), and a ghost button "Pray with me".

- [ ] **Step 3: Build the screen**

`app/(protected)/prayer.tsx` mounts `usePrayerStore().load()` on focus, renders the three pieces above, and wires "Pray with me" to the existing `generatePrayer` from `lib/prayerAi.ts`. Catch its error and show it via `useToast().showError` — the follow-up quota message is already human-readable.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/PrayerSlotRow.tsx components/PrayerLogSheet.tsx "app/(protected)/prayer.tsx"
git commit -m "feat: prayer times screen with one-tap logging"
```

---

### Task 6: Slot editing

**Files:**
- Modify: `app/(protected)/prayer.tsx`

Per mockup section 5: tapping a row opens an edit sheet with label `TextInput`, a time picker (reuse the `DateTimePicker` usage already in the verse screen — see `app/(protected)/verse.tsx`, and note `lib/time.ts:timeOfDay` exists for hour/minute → `Date`), a Save, and a Delete.

- [ ] **Step 1: Add the edit sheet and wire it**

On save: update the slot in `usePrayerStore().setSlots(...)`, then call `rearmAllSerialized(reminderSettings, slots)` and surface an `'inexact'` result with the existing exact-alarm warning component from the verse screen.

**The reminder must be re-armed after every slot change** — enabling a slot without re-arming means no notification ever fires.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/prayer.tsx"
git commit -m "feat: add, edit and delete prayer times"
```

---

### Task 7: Home row

**Files:**
- Create: `components/PrayerTimesCard.tsx`
- Modify: `app/(protected)/(tabs)/home.tsx`

Per mockup section 1: label "Prayer times", subtitle `${todayCount} of ${enabledSlots.length} today · ${streak.current} day streak` (omit the streak clause when `current === 0`), and one dot per enabled slot with a dashed ring on the next upcoming one. Tapping routes to `/prayer`.

- [ ] **Step 1: Build the card and mount it**

Insert between the "Daily Reflection" card and the "My Reflections" section in `home.tsx`, matching the surrounding card markup.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/PrayerTimesCard.tsx "app/(protected)/(tabs)/home.tsx"
git commit -m "feat: prayer times row on home"
```

---

### Task 8: Notification actions

The highest-risk task. **Verify on a real device before building further on it.**

**Files:**
- Modify: `lib/reminderScheduler.ts`, `app/_layout.tsx`

- [ ] **Step 1: Register the category**

In `lib/reminderScheduler.ts`, inside `ensureChannels()`:

```ts
Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY_ID, [
  { identifier: 'LOG_PRAYER', buttonTitle: 'I prayed', options: { opensAppToForeground: false } },
  { identifier: 'PRAY_WITH_ME', buttonTitle: 'Pray with me', options: { opensAppToForeground: true } },
]).catch((error) => console.error('Error creating prayer category:', error));
```

- [ ] **Step 2: Handle the response**

In `app/_layout.tsx`, add a response listener:

```ts
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const slotId = notification.request.content.data?.slotId as string | undefined;
    if (actionIdentifier === 'LOG_PRAYER') {
      usePrayerStore.getState().logPrayer(slotId ?? null).catch(() => {});
      return;
    }
    if (notification.request.content.data?.screen === 'prayer') {
      router.push({ pathname: '/prayer', params: slotId ? { slotId } : {} });
    }
  });
  return () => sub.remove();
}, []);
```

- [ ] **Step 3: Verify on device — this is a gate, not a formality**

Build and install, set a slot one minute ahead, then test all three states:

| App state | Expected |
|---|---|
| Foregrounded | "I prayed" logs immediately, row ticks |
| Backgrounded | "I prayed" logs; entry present on next open |
| **Force-stopped** | **Uncertain — this is what we are testing** |

Run: `adb shell am force-stop com.sermonmate.app`, wait for the notification, tap "I prayed", then reopen and check whether the entry exists.

**If the force-stopped case drops the entry:** change `LOG_PRAYER` to `opensAppToForeground: true` and log from the deep-linked screen instead. One extra tap, no lost data. Record which path was taken in the spec's error-handling section.

- [ ] **Step 4: Commit**

```bash
git add lib/reminderScheduler.ts app/_layout.tsx
git commit -m "feat: log a prayer from the notification"
```

---

### Task 9: History screen

**Files:**
- Create: `app/(protected)/prayer-history.tsx`

Per mockup section 6: a month grid (7 columns) where each day is `sage` if every enabled slot was logged, `sand` if some were, `sand` with a dashed accent outline if it is in `streak.graceDates`, and plain `surfaceAlt` otherwise. **No red, no failure marks.** Below it, a legend and the most recent entries that carry a note.

- [ ] **Step 1: Build the screen and link it from the prayer screen header**

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/prayer-history.tsx" "app/(protected)/prayer.tsx"
git commit -m "feat: prayer history calendar and notes"
```

---

### Task 10: Smoke test additions

**Files:**
- Modify: `docs/local-android-build.md`

- [ ] **Step 1: Append the device checks**

```markdown
### Prayer times

- [ ] Enabling a slot schedules a reminder that fires at the set minute.
- [ ] **Regression:** with prayer slots enabled, change the daily verse reminder
      time. Both the verse reminder AND every prayer reminder must survive.
      (This is the failure `lib/reminderScheduler.ts` exists to prevent.)
- [ ] "I prayed" from the notification, tested foregrounded, backgrounded and
      after `adb shell am force-stop com.sermonmate.app`.
- [ ] Log a prayer in aeroplane mode; confirm it appears immediately and is still
      there after reconnecting and restarting.
- [ ] Pre-filled Morning/Midday/Evening arrive DISABLED on a fresh install and
      schedule nothing until switched on.
- [ ] A prayer logged between 00:00 and 02:59 local is filed under that morning's
      date, not the previous day.
```

- [ ] **Step 2: Commit**

```bash
git add docs/local-android-build.md
git commit -m "docs: prayer times smoke test"
```

---

## Self-review notes

**Spec coverage:** data model → Task 2; scheduling and the cancel-all fix → Task 3; streak with grace → Task 1; all six mockup screens → Tasks 5–7, 9; error handling → Tasks 4 (offline via store fallbacks), 6 (inexact alarms), 8 (killed app); testing → Tasks 1 and 10.

**Deferred deliberately:** the prayer list, and migrating the mood log off AsyncStorage. Both are named out of scope in the spec.

**Known open risk:** Task 8's force-stopped behaviour. The fallback is specified rather than assumed, and the task is ordered after the core feature works so a bad result degrades one interaction instead of blocking the feature.
