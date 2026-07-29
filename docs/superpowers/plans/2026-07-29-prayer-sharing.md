# Prayer Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop discarding AI-generated prayers — persist each one on its prayer log entry, show it in history, and let the user copy, listen to, share or card it.

**Architecture:** A generated prayer is always born from a logged moment, so it becomes an optional `prayer` field on `PrayerLogEntry` rather than a new collection. One store, one load path, no join. The four actions live in a single `PrayerActions` component used by both the post-generation modal and the history row.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, Zustand, Firebase Firestore, expo-clipboard, expo-speech, expo-router.

**Spec:** `docs/superpowers/specs/2026-07-29-prayer-sharing-design.md`

## Global Constraints

- Tests run with `npm test` — `node --experimental-strip-types --test "lib/**/*.test.ts" "components/**/*.test.ts"`. Only pure modules get unit tests; React components are verified by `npx tsc --noEmit` and on device.
- Test imports use `node:test` + `node:assert/strict`, and import source with an explicit `.ts` extension (see `lib/prayerStreak.test.ts`).
- Typecheck gate for every task: `npx tsc --noEmit` must exit 0.
- Styling goes through `useTheme()` + `makeStyles(theme)`. Never hardcode colours or spacing.
- Copy is pastoral, never competitive or guilt-inducing. No "don't break your streak", no red, no failure marks.
- Touch targets are at least 44pt.
- `lib/reminderScheduler.ts` is the only module allowed to call `cancelAllScheduledNotificationsAsync()`. Nothing in this plan touches the schedule.
- No new dependencies. `expo-clipboard`, `expo-speech`, `expo-sharing` and `react-native-view-shot` are already installed.
- No `firestore.rules` change — `prayerLog/{entryId}` already grants the owner read and write.

---

### Task 1: `momentsFor` selector

The one piece of this change with logic worth pinning. The history list must show entries carrying something re-readable — a note, a prayer, or both — and must not show a bare "I prayed" tick, which the calendar dot already represents.

**Files:**
- Create: `lib/prayerMoments.ts`
- Test: `lib/prayerMoments.test.ts`

**Interfaces:**
- Consumes: `PrayerLogEntry` from `lib/types.ts` (gains its `prayer?` field in Task 2; this task only reads `note`, `prayer` and `loggedAt`).
- Produces: `momentsFor(log: PrayerLogEntry[], limit: number): PrayerLogEntry[]`

- [ ] **Step 1: Write the failing test**

Create `lib/prayerMoments.test.ts`:

```ts
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

test('does not mutate the caller\'s array', () => {
  const log = [
    entry({ id: 'old', note: 'x', loggedAt: new Date('2026-07-27T09:00:00Z') }),
    entry({ id: 'new', note: 'x', loggedAt: new Date('2026-07-29T09:00:00Z') }),
  ];
  momentsFor(log, 10);
  assert.deepEqual(log.map((item) => item.id), ['old', 'new']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './prayerMoments.ts'`

- [ ] **Step 3: Implement**

Create `lib/prayerMoments.ts`:

```ts
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
```

Note: this file references `entry.prayer`, which does not exist on the type until Task 2. `npx tsc --noEmit` will fail until then; the unit tests, which run through `--experimental-strip-types`, will pass. Do not add the field here — Task 2 owns it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 8 new tests, 58 total.

- [ ] **Step 5: Commit**

```bash
git add lib/prayerMoments.ts lib/prayerMoments.test.ts
git commit -m "feat: momentsFor selects log entries worth re-reading"
```

---

### Task 2: Persist the prayer

The data layer. After this task a prayer can be written and read back; nothing calls it yet.

**Files:**
- Modify: `lib/types.ts:71-79`
- Modify: `lib/prayerApi.ts` (the `getPrayerLog` mapper, and a new function beside `updatePrayerNote`)
- Modify: `lib/stores/prayer.ts` (the `PrayerState` interface and the store body)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PrayerLogEntry.prayer?: string`
  - `updatePrayerText(entryId: string, prayer: string): Promise<void>` in `lib/prayerApi.ts`
  - `setPrayer(entryId: string, prayer: string): Promise<void>` on the store

- [ ] **Step 1: Add the field to the type**

In `lib/types.ts`, `PrayerLogEntry` becomes:

```ts
export type PrayerLogEntry = {
  id: string
  /** null when logged outside any slot ("I prayed just now"). */
  slotId: string | null
  loggedAt: Date
  /** "YYYY-MM-DD" in the user's local time. See lib/localDate.ts. */
  localDate: string
  note?: string
  /** The AI prayer generated for this moment, when one was asked for. */
  prayer?: string
}
```

- [ ] **Step 2: Read the field back**

In `lib/prayerApi.ts`, inside the `getPrayerLog` mapper, add `prayer` beside `note`:

```ts
    return {
      id: entry.id,
      slotId: data.slotId ?? null,
      // serverTimestamp() reads back null until the write lands, so an entry
      // logged offline still renders immediately with a sensible time.
      loggedAt: data.loggedAt instanceof Timestamp ? data.loggedAt.toDate() : new Date(),
      localDate: data.localDate,
      note: data.note,
      prayer: data.prayer,
    };
```

- [ ] **Step 3: Add the write**

In `lib/prayerApi.ts`, directly below `updatePrayerNote`:

```ts
export async function updatePrayerText(entryId: string, prayer: string): Promise<void> {
  await updateDoc(doc(db, 'users', requireUid(), 'prayerLog', entryId), { prayer });
}
```

- [ ] **Step 4: Add the store action**

In `lib/stores/prayer.ts`, extend the import:

```ts
import {
  getPrayerLog,
  getPrayerSlots,
  logPrayer as logPrayerRemote,
  savePrayerSlots,
  updatePrayerNote as updateNoteRemote,
  updatePrayerText as updatePrayerTextRemote,
} from '@/lib/prayerApi';
```

Add to the `PrayerState` interface, below `setNote`:

```ts
  setPrayer: (entryId: string, prayer: string) => Promise<void>;
```

Add to the store body, directly below `setNote`:

```ts
  setPrayer: async (entryId, prayer) => {
    const log = get().log.map((entry) => (entry.id === entryId ? { ...entry, prayer } : entry));
    set({ log });
    try {
      await updatePrayerTextRemote(entryId, prayer);
    } catch (error) {
      // Local state keeps the prayer deliberately. The user has already spent a
      // followUp quota unit on it, so they get to read, copy and share it; it
      // just will not survive a reload. Hiding it would waste the spend twice.
      console.error('Failed to save prayer', error);
    }
  },
```

- [ ] **Step 5: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: exit 0, no output. This also clears the Task 1 error, since `entry.prayer` now exists.

Run: `npm test`
Expected: PASS — 58 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/prayerApi.ts lib/stores/prayer.ts
git commit -m "feat: persist a generated prayer on its log entry"
```

---

### Task 3: `PrayerActions`

The four actions, defined once. Both the modal and the history row consume this.

**Files:**
- Create: `components/PrayerActions.tsx`

**Interfaces:**
- Consumes: `ListenButton` (`components/ListenButton.tsx`, prop `text: string`), `useToast()` (`showSuccess(title, message?)`, `showError(title, message?)`), `useTheme()`.
- Produces: `export default function PrayerActions({ text }: { text: string })`

- [ ] **Step 1: Build the component**

Create `components/PrayerActions.tsx`:

```tsx
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import ListenButton from '@/components/ListenButton';
import { useToast } from '@/components/ToastProvider';
import { useTheme, type AppTheme } from '@/lib/theme';

/**
 * Copy / Listen / Share / Card for a generated prayer.
 *
 * Defined once and used in both the post-generation modal and the history row.
 * The "8 of 4 today" bug (f4969bc) came from two places re-deriving one idea and
 * drifting apart; four actions in two places is the same trap.
 *
 * Kept local rather than beside formatVerseForShare in lib/verses.ts — a prayer
 * is not a verse, and that module has no other reason to know prayers exist.
 */
function formatPrayerForShare(text: string): string {
  return `${text}\n\n— SermonMate`;
}

export default function PrayerActions({ text }: { text: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(formatPrayerForShare(text));
      showSuccess('Copied');
    } catch {
      showError('Copy failed', 'Could not copy the prayer.');
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: formatPrayerForShare(text) });
    } catch {
      showError('Share failed', 'Could not open the share sheet.');
    }
  };

  // The card route already accepts arbitrary text — see the ShareCard comment
  // about cards carrying a whole message, story or prayer.
  const makeCard = () => router.push({ pathname: '/(protected)/card', params: { text } });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={copy}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Copy prayer"
      >
        <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Copy</AppText>
      </Pressable>

      <ListenButton text={text} />

      <Pressable
        onPress={share}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Share prayer"
      >
        <Ionicons name="share-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Share</AppText>
      </Pressable>

      <Pressable
        onPress={makeCard}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Make a card from this prayer"
      >
        <Ionicons name="image-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Card</AppText>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.md,
    marginTop: theme.space.sm,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  label: { color: theme.color.accent },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add components/PrayerActions.tsx
git commit -m "feat: PrayerActions — copy, listen, share, card"
```

---

### Task 4: Save the prayer instead of dropping it

The leak itself. `handlePrayWithMe` currently clears `sheetFor` before it has anywhere to put the text.

**Files:**
- Modify: `app/(protected)/prayer.tsx` — the store destructure (line ~36), `handlePrayWithMe` (line ~87), and the generated-prayer modal (line ~308)

**Interfaces:**
- Consumes: `setPrayer` from the store (Task 2), `PrayerActions` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Pull `setPrayer` off the store**

Change the destructure:

```ts
  const { slots, log, streak, load, setSlots, logPrayer, setNote, setPrayer } = usePrayerStore();
```

- [ ] **Step 2: Import `PrayerActions`**

Add beside the other component imports:

```ts
import PrayerActions from '@/components/PrayerActions';
```

- [ ] **Step 3: Persist before showing**

Replace `handlePrayWithMe` with:

```ts
  const handlePrayWithMe = async () => {
    // Capture the entry BEFORE anything clears the sheet. The old order cleared
    // sheetFor first and then had nowhere to put the text, which is why every
    // generated prayer was lost.
    const entryId = sheetFor?.entry.id;
    if (!entryId) return;

    setPraying(true);
    try {
      const text = await generatePrayer('A moment of prayer during my daily prayer time.');
      await setPrayer(entryId, text);
      setSheetFor(null);
      setGeneratedPrayer(text);
    } catch (error: any) {
      showError('Could not create a prayer', error?.message || 'Please try again.');
    } finally {
      setPraying(false);
    }
  };
```

- [ ] **Step 4: Offer the actions in the modal**

In the generated-prayer modal, add `PrayerActions` between the text and the button:

```tsx
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText variant="title">A prayer for now</AppText>
          <AppText variant="verse" style={styles.prayerText}>{generatedPrayer}</AppText>
          {!!generatedPrayer && <PrayerActions text={generatedPrayer} />}
          <PrimaryButton label="Amen" onPress={() => setGeneratedPrayer(null)} />
        </View>
```

"Amen" is now purely a dismiss — by the time it is tappable the prayer is saved.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

Run: `npm test`
Expected: PASS — 58 tests.

- [ ] **Step 6: Commit**

```bash
git add "app/(protected)/prayer.tsx"
git commit -m "fix: a generated prayer was discarded on Amen"
```

---

### Task 5: Show prayers in history

**Files:**
- Modify: `app/(protected)/prayer-history.tsx` — imports, the `noted` derivation (line ~51), the render block (line ~174), and `makeStyles`

**Interfaces:**
- Consumes: `momentsFor` (Task 1), `PrayerActions` (Task 3), `PrayerLogEntry.prayer` (Task 2).
- Produces: nothing new.

- [ ] **Step 1: Import and derive**

Add imports:

```ts
import PrayerActions from '@/components/PrayerActions';
import { momentsFor } from '@/lib/prayerMoments';
```

Replace the `noted` line:

```ts
  const moments = useMemo(() => momentsFor(log, 10), [log]);
```

Add the expand state beside `monthOffset`:

```ts
  // Which prayer is expanded. One at a time — the list is for skimming.
  const [expandedId, setExpandedId] = useState<string | null>(null);
```

Add a label helper below `countFor`:

```ts
  const slotLabel = (slotId: string | null) =>
    slots.find((slot) => slot.id === slotId)?.label ?? 'Prayer';
```

- [ ] **Step 2: Replace the render block**

Replace the whole `{noted.length > 0 && (…)}` block with:

```tsx
        {moments.length > 0 && (
          <>
            <AppText variant="label" style={styles.sectionLabel}>Recent moments</AppText>
            {moments.map((entry) => (
              <View key={entry.id} style={styles.noteCard}>
                <AppText variant="caption">
                  {entry.loggedAt.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  {' · '}
                  {slotLabel(entry.slotId)}
                </AppText>

                {!!entry.note && <AppText variant="body">{entry.note}</AppText>}

                {!!entry.prayer && (
                  <>
                    <Pressable
                      onPress={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                      accessibilityRole="button"
                      accessibilityLabel={
                        expandedId === entry.id ? 'Collapse prayer' : 'Expand prayer'
                      }
                    >
                      <AppText
                        variant="verse"
                        style={styles.prayerText}
                        numberOfLines={expandedId === entry.id ? undefined : 3}
                      >
                        {entry.prayer}
                      </AppText>
                    </Pressable>
                    <PrayerActions text={entry.prayer} />
                  </>
                )}
              </View>
            ))}
          </>
        )}
```

- [ ] **Step 3: Add the style**

In `makeStyles`, beside `noteCard`:

```ts
  prayerText: { marginTop: theme.space.xs },
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

Run: `npm test`
Expected: PASS — 58 tests.

- [ ] **Step 5: Commit**

```bash
git add "app/(protected)/prayer-history.tsx"
git commit -m "feat: history shows prayers alongside notes"
```

---

### Task 6: Make the `PRAY_WITH_ME` button work

The action is declared in `lib/reminderScheduler.ts:84` but `app/_layout.tsx` only handles `LOG_PRAYER`, so today it opens the app and does nothing.

It logs the moment and hands the entry to the screen. It deliberately does **not** generate: that costs a `followUp` quota unit, and a notification action is easy to hit half-asleep.

**Files:**
- Modify: `app/_layout.tsx:156-163`
- Modify: `app/(protected)/prayer.tsx` — params type (line ~34) and a new effect

**Interfaces:**
- Consumes: `usePrayerStore.getState().logPrayer(slotId)` returning `Promise<PrayerLogEntry | null>` (existing).
- Produces: the route param `prayWithMe=<entryId>` on `/(protected)/prayer`.

- [ ] **Step 1: Branch on the action**

Replace the `screen === 'prayer'` block in `app/_layout.tsx`:

```ts
    if (screen === 'prayer') {
      handledResponseId.current = id;
      const slotId = typeof data?.slotId === 'string' ? data.slotId : null;

      if (action === 'LOG_PRAYER') {
        usePrayerStore.getState().logPrayer(slotId).catch(() => {});
        router.push('/(protected)/prayer' as never);
        return;
      }

      if (action === 'PRAY_WITH_ME') {
        // Log the moment now, then hand the entry to the screen so it can open
        // that entry's sheet with the button ready. Generation costs quota, so
        // it waits for a deliberate tap rather than firing on a notification.
        usePrayerStore.getState().logPrayer(slotId)
          .then((entry) => {
            router.push(
              (entry ? `/(protected)/prayer?prayWithMe=${entry.id}` : '/(protected)/prayer') as never,
            );
          })
          .catch(() => router.push('/(protected)/prayer' as never));
        return;
      }

      router.push('/(protected)/prayer' as never);
    }
```

- [ ] **Step 2: Open the sheet for that entry**

In `app/(protected)/prayer.tsx`, widen the params type:

```ts
  const params = useLocalSearchParams<{ slotId?: string; prayWithMe?: string }>();
```

Extend the React import to include `useEffect` and `useRef`:

```ts
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add this effect below the existing `useFocusEffect`:

```ts
  // Arriving from the "Pray with me" notification action. The moment is already
  // logged by the handler in app/_layout.tsx, so all this does is open its sheet
  // — the ref stops it reopening every time the log reloads on focus.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    const entryId = params.prayWithMe;
    if (!entryId || openedFor.current === entryId) return;

    const entry = log.find((item) => item.id === entryId);
    if (!entry) return; // load() has not landed yet; this re-runs when it does

    openedFor.current = entryId;
    const slot = slots.find((item) => item.id === entry.slotId);
    setSheetFor({ entry, title: slot ? `${slot.label} prayer logged` : 'Prayer logged' });
  }, [params.prayWithMe, log, slots]);
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

Run: `npm test`
Expected: PASS — 58 tests.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx "app/(protected)/prayer.tsx"
git commit -m "fix: 'Pray with me' notification action did nothing"
```

---

### Task 7: Device checks

Two things no unit test can see, plus the regression this whole change exists to prevent.

**Files:**
- Modify: `docs/local-android-build.md` (append)

- [ ] **Step 1: Append the checks**

Add at the end of `docs/local-android-build.md`:

```markdown
### Generated prayers (added 2026-07-29)

- [ ] Log a prayer, tap "Pray with me", wait for the prayer, tap Amen. Reopen
      prayer history — the prayer is there. **This is the regression:** before
      this change Amen discarded it, and the quota spend with it.
- [ ] The same prayer survives `adb shell am force-stop com.sermonmate.app` and a
      relaunch, i.e. it came back from Firestore rather than local state.
- [ ] Copy pastes the prayer plus the SermonMate line. Listen reads it aloud.
      Share opens the OS sheet with the text.
- [ ] "Card" opens the card editor with the prayer already in it. Check a LONG
      prayer (400+ characters): `ShareCard` steps font size down by text length,
      and a full prayer is the longest text that path has ever been handed.
- [ ] Tap "Pray with me" on a prayer notification. It opens the app with the
      sheet already up for that moment, and **no prayer is generated** until the
      button is tapped — the point is that a notification tap never spends quota.
- [ ] Aeroplane mode: generating fails with a toast, and no empty or half-written
      entry is left behind in history.
```

- [ ] **Step 2: Commit**

```bash
git add docs/local-android-build.md
git commit -m "docs: device checks for generated prayers"
```

---

## Self-review notes

**Spec coverage.** Every section of the spec maps to a task: data model → Task 2; fixing the leak → Task 4; `PrayerActions` → Task 3; history → Tasks 1 and 5; notification → Task 6; error handling → distributed across Tasks 2 (write failure), 3 (copy/share failure) and 4 (generation failure); testing → Tasks 1 and 7. The spec's "no `firestore.rules` change" is recorded under Global Constraints.

**Known cross-task typecheck gap.** Task 1 writes `entry.prayer` before Task 2 adds the field, so `npx tsc --noEmit` fails between those two commits while `npm test` passes. This is called out in Task 1 Step 3. Running Task 2 immediately after Task 1 closes it. The alternative — moving the type change into Task 1 — would split ownership of `PrayerLogEntry` across two tasks, which is worse.

**Type consistency.** `updatePrayerText` is the API name throughout; `setPrayer` is the store name throughout; `momentsFor(log, limit)` keeps the same signature in Tasks 1 and 5; `prayWithMe` is the param spelling in both Task 6 steps.

**Ordering.** Tasks 1–3 are independent of each other. Task 4 needs 2 and 3. Task 5 needs 1, 2 and 3. Task 6 needs 2. Task 7 needs everything.
