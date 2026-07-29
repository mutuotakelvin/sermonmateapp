# Generated Prayers: Keep, Copy, Listen, Share, Card

**Date:** 2026-07-29
**Status:** Approved, not yet planned
**Follows:** `2026-07-28-prayer-goals-design.md`

## The problem

`handlePrayWithMe` (`app/(protected)/prayer.tsx:87`) generates a prayer, puts it
in React state, and shows it in a modal whose only button sets that state back to
`null`. The prayer is never written anywhere. Every prayer the AI has produced for
a user is already gone, and each one cost a `followUp` quota unit to make
(`functions/src/index.ts:329`).

So the feature is not "add sharing to prayers". It is "stop throwing prayers
away", and then let people do the obvious things with the ones they keep.

## Scope

Generated prayers persist, appear in prayer history, and carry four actions:
copy, listen, share as text, and turn into a card. The dead `PRAY_WITH_ME`
notification button starts working.

**Explicitly out of scope:** regenerating a prayer, editing prayer text, deleting
a prayer independently of its log entry, filtering the calendar by prayers.

## Data model

A prayer is always born from a logged moment, so it belongs to that moment. One
collection, one load path, no join.

```ts
// lib/types.ts — PrayerLogEntry gains one field beside the existing note?
export type PrayerLogEntry = {
  id: string
  slotId: string | null
  loggedAt: Date
  localDate: string
  note?: string
  prayer?: string   // new
}
```

Changes:

- `getPrayerLog` maps `prayer: data.prayer` through, exactly as it does `note`.
- `prayerApi.ts` gains `updatePrayerText(entryId, prayer)`, mirroring the
  existing `updatePrayerNote`.
- `lib/stores/prayer.ts` gains `setPrayer(entryId, prayer)`, mirroring `setNote`:
  optimistic local update, then the remote write.

**No `firestore.rules` change.** `prayerLog/{entryId}` already grants the owner
read and write, and a new field on an existing doc needs no new rule.

## Fixing the leak

The current order in `handlePrayWithMe` clears `sheetFor` before there is
anywhere to put the text, which is the mechanical cause of the loss. The new
order:

1. Capture `sheetFor.entry.id` into a local before clearing anything.
2. `await generatePrayer(...)`.
3. `await setPrayer(entryId, text)`.
4. Show the modal.

"Amen" stops being destructive. By the time it can be tapped the prayer is
already saved, so dismissing the modal is dismissing a view, not discarding data
— the same rule `PrayerLogSheet` already follows for the log entry itself.

## `components/PrayerActions.tsx`

One component, props `{ text: string; tint?: string }`, rendered in both the
post-generation modal and every history row. Defined once on purpose: the
`8 of 4 today` bug fixed earlier the same day was caused by two places
re-deriving one idea and drifting apart.

| Action | Implementation |
|---|---|
| Copy | `Clipboard.setStringAsync(text)`, success toast |
| Listen | `<ListenButton text={text} />` — renders nothing when speech is unavailable |
| Share | `Share.share({ message: formatPrayerForShare(text) })` |
| Make card | `router.push({ pathname: '/(protected)/card', params: { text } })` |

This mirrors `app/(protected)/verse.tsx:70-83`, which already does copy and
text-share this way. `expo-clipboard`, `expo-speech` and `react-native-view-shot`
are all existing dependencies; nothing new is installed.

`formatPrayerForShare` is a local helper inside `PrayerActions.tsx`, adding the
SermonMate attribution line. It deliberately does *not* go next to
`formatVerseForShare` in `lib/verses.ts` — a prayer is not a verse, and that
module has no other reason to know prayers exist.

The card needs no new route. `app/(protected)/card.tsx` already accepts arbitrary
`?text=` params, and `ShareCard`'s own comment records that cards were widened to
carry "a whole message, story or prayer".

## History

`prayer-history.tsx:51` currently builds `noted` — up to 10 entries that have a
note. It becomes `moments`: entries that have a note **or** a prayer, newest
first, capped at 10.

Each row renders the date, the slot label, the note if present, then the prayer
clamped to roughly three lines with a tap to expand, then `PrayerActions`.

The filter moves out of the component as a pure `momentsFor(log, limit)` helper,
following the precedent set by `lib/prayerStreak.ts` — it is the one piece of
this change with logic worth testing directly.

## Notification

`app/_layout.tsx:158` handles only `LOG_PRAYER`, so the `PRAY_WITH_ME` button
declared in `lib/reminderScheduler.ts:84` opens the app and does nothing.

New branch: log the moment exactly as `LOG_PRAYER` does, then push
`/(protected)/prayer?prayWithMe=<entryId>`. The screen opens the log sheet for
that entry with "Pray with me" ready to tap.

It deliberately does **not** generate on arrival. Generation costs a `followUp`
quota unit, and a notification action is easy to hit half-asleep or by accident.
Quota is spent on a deliberate second tap, never on a notification tap alone.

## Error handling

- **Generation fails** — the existing `showError` path. Nothing is written and no
  entry is modified.
- **Generation succeeds, the write fails** — `setPrayer` follows `setNote`: local
  state updates first, so the user can still read, copy and share the prayer they
  just spent quota on. The failure is logged; the prayer will not survive a
  reload. Showing it and losing it later beats never showing it at all.
- **Speech unavailable** — `ListenButton` already renders nothing rather than
  offering a dead control.
- **Share sheet unavailable** — caught and surfaced via `showError`, as in
  `verse.tsx:74`.

## Testing

**Unit** — `momentsFor`:

- includes an entry with only a note
- includes an entry with only a prayer
- includes an entry with both
- excludes an entry with neither
- orders newest first
- respects the cap

**Device** — the two things unit tests cannot see:

- A generated prayer survives `adb shell am force-stop` and a relaunch, and is
  still in history.
- A long prayer (400+ characters) in the card editor. `ShareCard` steps font size
  down by text length, and a full prayer is the longest text that path has ever
  been given.

## Files

**Create:**
- `components/PrayerActions.tsx`
- `lib/prayerMoments.ts` + `lib/prayerMoments.test.ts` (`momentsFor`)

**Modify:**
- `lib/types.ts` — `prayer?` on `PrayerLogEntry`
- `lib/prayerApi.ts` — map `prayer` through, add `updatePrayerText`
- `lib/stores/prayer.ts` — add `setPrayer`
- `app/(protected)/prayer.tsx` — persist before showing; honour `prayWithMe` param
- `app/(protected)/prayer-history.tsx` — `moments` list with actions
- `app/_layout.tsx` — `PRAY_WITH_ME` branch
- `docs/local-android-build.md` — the two device checks above
