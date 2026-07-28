# SermonMate: Prayer Goals & Routine Tracker

**Date:** 2026-07-28
**Status:** Approved (pending spec review)
**Mockups:** `docs/prayer-goals-mockups.html`

## Context

SermonMate reminds people of a daily verse but has no notion of a *practice*. The
user wants to set a goal like "pray three times a day", be reminded at the times
they chose, and have those prayers recorded so they can look back.

This is the prayer-routine tracker that has sat in the backlog since the
on-demand prayer work (scheduled prayer times → reminders → did-I-pray log). It
is also the highest-value item in the retention gap identified in
`docs/market-research-2026-07-28.md`: the app has reminders but nothing that
accrues, and habit mechanics are what keep devotional apps alive between AI
sessions.

## Decisions (locked during brainstorming)

- **The app reminds, records, and optionally leads.** A reminder fires; one tap
  logs "prayed". A secondary "Pray with me" generates a short prayer, reusing the
  existing `generatePrayer` callable.
- **Streaks with grace, never guilt.** Streaks are tracked, but a missed day is
  absorbed rather than punished. No broken-streak language anywhere.
- **Goals are named slots with times, plus ad-hoc logging.** Praying outside a
  slot still counts toward the day.
- **A log entry is a tap plus an optional note.** The note is never required.
- **Free, forever.** Only "Pray with me" spends AI quota. Habit features drive
  the daily return that makes people convert; gating them defeats the purpose.
- **Placement:** a row on the home screen, not a fourth tab.
- **First run:** Morning / Midday / Evening pre-filled, editable and deletable.
  Pre-filled slots are created **disabled**: they are shown as suggestions and
  begin scheduling reminders only once the user enables them. Silently arming
  three daily notifications because someone opened a screen would be the exact
  pushiness this feature is meant to avoid, and it is also how notification
  permissions get revoked.
- **Grace:** one missed day per rolling seven. "Rolling" means: when evaluating a
  zero-prayer day, it is absorbed if no other zero-prayer day was absorbed within
  the preceding six days. A second miss inside that window resets the streak.

## Architecture

### Data model (Firestore)

Firestore rather than AsyncStorage — unlike the mood log (`lib/moodStorage.ts`),
which is device-local, a streak must survive a reinstall or a new phone. Losing a
40-day streak to a handset upgrade is an uninstall-grade experience.

**`users/{uid}/prayer/config`** — one document; slots are few.

```
{
  slots: [{ id: string, label: string, hour: number, minute: number, enabled: boolean }],
  updatedAt: Timestamp
}
```

**`users/{uid}/prayerLog/{entryId}`** — one document per logged prayer.

```
{
  slotId: string | null,   // null = ad-hoc, logged outside any slot
  loggedAt: Timestamp,
  localDate: "YYYY-MM-DD", // the user's local date, written by the client
  note?: string
}
```

`localDate` is stored explicitly and is **not** derived from `loggedAt` at read
time. Streaks belong to the user's day, not UTC. Kenya is UTC+3, so a 21:00
prayer is already tomorrow in UTC; deriving the date server-side or in UTC would
break every Kenyan user's streak nightly. This deliberately differs from
`utcDay()` in `functions/src/index.ts`, which is correct there because quota
periods are ours to define.

Firestore rules: a user reads and writes their own `prayer/**` and `prayerLog/**`
documents. Nothing here is server-owned — unlike `pro`, a prayer log is not worth
money and needs no server-only lock.

### Scheduling

A new `lib/reminderScheduler.ts` becomes the **only** module that mutates the
notification schedule:

- `ensureChannels()` — creates the `daily-verse` and `prayer-times` Android
  channels. Separate channels so prayer nudges can be muted without losing the
  daily verse.
- `getExactAlarmStatus()` — moved verbatim from `lib/notifications.ts`.
- `rearmAll(reminderSettings, slots)` — sole owner of
  `cancelAllScheduledNotificationsAsync()`. Cancels once, then rebuilds the verse
  window *and* every enabled prayer slot in a single pass.

This refactor is the point of the module. `lib/notifications.ts:125` currently
calls `cancelAllScheduledNotificationsAsync()`, which cancels *every* pending
notification. Scheduling prayer reminders independently would mean that editing
the verse reminder time silently destroys them — the same class of defect as the
reminder that fired at 10:00 instead of 07:27. Centralising the cancel makes it
structurally impossible rather than a rule to remember.

`lib/notifications.ts` keeps verse-content concerns and delegates scheduling.

Prayer slots use expo-notifications' **daily repeating trigger**, not the verse's
14-day rolling window. The window exists because each day's verse text differs; a
prayer nudge is identical every day, so one repeating notification per slot needs
no refresh. The existing `ReminderStatus` ('disabled' | 'unavailable' | 'inexact'
| 'ok') and its "Turn on exact alarms" affordance apply unchanged.

### Streak calculation

A pure function over the set of logged `localDate` values — no server
involvement, no stored counter to drift out of sync.

- A day **counts** if at least one prayer was logged on that local date. Not all
  slots. Hitting 1 of 3 keeps the streak; the calendar distinguishes "all" from
  "some" visually but both preserve it.
- **Grace:** one zero-prayer day per rolling seven is absorbed and the streak
  continues. Once spent, a further miss resets the streak — quietly.
- When today has no entry yet, the streak is computed **backward from
  yesterday**. Otherwise it reads as broken every morning at 00:01, which is
  precisely the waking guilt this design exists to avoid.

## Screens

Detailed mockups with annotations live in `docs/prayer-goals-mockups.html`.

1. **Home row** — today's progress (`1 of 3 today · 12 day streak`) with a dot per
   slot; a dashed ring marks the slot nearest to now.
2. **Prayer times** — streak header, today's slots with tick state and inline
   notes, and an "I prayed just now" ad-hoc button.
3. **Notification** — lock-screen actions "I prayed" and "Pray with me". Copy is
   unpressured ("A few minutes, whenever you're ready").
4. **Log sheet** — confirms the entry and offers an optional note. The entry is
   written *before* the sheet appears, so dismissing it loses nothing.
5. **Slot editor** — label and time, plus the existing inexact-alarm warning.
6. **History** — month calendar (all / some / grace) and recent notes.

## Error handling

- **Offline:** Firestore offline persistence covers logging and streak
  computation with no signal; writes sync later. This matters for the Kenyan
  market specifically.
- **Notification permission denied:** `ReminderStatus` 'unavailable'. The screen
  degrades to a manual tracker rather than breaking.
- **Exact alarms off:** 'inexact' warning, reusing the component built for the
  daily verse.
- **Notification action while the app is killed:** the principal technical risk.
  JS is not running to write the entry, and `expo-notifications` surfaces the
  response only on next launch, so the log may be written late or dropped.
  Verify on a real device early in implementation. **Fallback if unreliable:** the
  action opens the app directly to the prayer screen with the relevant slot ready
  to tap — one extra tap, no lost data.
- **"Pray with me" over quota:** surfaces the `FOLLOW_UP_LIMIT_REACHED` message
  already handled in `lib/sermonAi.ts`. Logging is unaffected — the record must
  never depend on an AI call succeeding.

## Testing

- **Unit (`node --test`, matching `lib/sanitizeAiText.test.ts`):** streak and
  grace calculation over date sets — consecutive days, single miss absorbed,
  second miss resets, grace window rolling correctly, today-not-yet-logged not
  breaking the streak. Plus local-date derivation at the timezone boundary: a
  21:00 Nairobi prayer must land on today.
- **On device (added to the smoke test in `docs/local-android-build.md`):**
  reminders firing at the set times; editing the verse reminder time leaving
  prayer reminders intact (the regression this design exists to prevent); the
  notification action from cold, backgrounded and foregrounded states; offline
  logging syncing on reconnect.

## Out of scope

- The prayer **list** (people and requests, marking prayers answered). The
  optional note seeds it; if it earns its keep, the list grows out of History
  rather than arriving as a separate feature.
- Migrating the mood log from AsyncStorage to Firestore. Related and probably
  worth doing, but not this change.
- Sharing or community accountability.
