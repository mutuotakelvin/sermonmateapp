# SermonMate: Daily Verse Reminder + Verse of the Day

**Date:** 2026-07-10
**Status:** Approved (pending spec review)

## Context

SermonMate is pivoting from an AI-first app to a retention-focused Bible companion. This is the **first** of several retention features (later: study/help groups, home-screen widget). It must feel modern and premium — polish is a first-class requirement, not an afterthought.

This feature is intentionally scoped small and shippable: a **daily local notification** that surfaces a memory verse at a user-chosen time, and a **Verse of the Day** screen. No backend — everything runs on-device via `expo-notifications`. It also establishes the **verse-content source** that later features reuse.

Out of scope for v1 (deferred): saved "My Memory Verses" list, memorization/review tracker, server push delivery, an external Bible API.

## Decisions (locked during brainstorming)

- **Verse source:** bundled curated list now, behind a small `VerseSource` interface so an API-backed source can be added later without reworking the reminder.
- **Translations:** bundle **both WEB and KJV** (public domain); user picks via a toggle.
- **Verse-of-the-day selection:** deterministic by date — the same verse for every user each day (enables a future "share today's verse" in groups).
- **Scope:** daily reminder notification + Verse of the Day screen. Nothing more.
- **Reminder time:** user-configurable, default **08:00**.
- **Notification delivery:** rolling-window local notifications (Approach A) — schedule the next ~14 days, each carrying that day's actual verse text; top up on app open.
- **Visual direction:** "calm & premium" — a display serif (**Lora**) for verse text, a **sky & sea** signature gradient (cyan → teal), system sans for UI chrome.

## Architecture

Fully client-side. New units, each with one responsibility:

```
lib/verseData.ts      curated verse content (both translations) — data only
lib/verses.ts         VerseSource interface + BundledVerseSource + date→verse logic
lib/stores/verse.ts   Zustand store (AsyncStorage-persisted): translation, reminder prefs
lib/notifications.ts  expo-notifications wrapper: permission, schedule/cancel window
components/VerseOfDayCard.tsx   home-screen preview card
app/(protected)/verse.tsx      Verse of the Day screen
```

### 1. Verse content — `lib/verseData.ts`

A bundled array of curated, well-known memory verses. Start with ~60–100 entries, cycled deterministically.

```ts
export type Translation = 'WEB' | 'KJV';
export interface BundledVerse {
  id: string;         // stable, e.g. "john-3-16"
  reference: string;  // "John 3:16"
  text: Record<Translation, string>;
}
export const VERSES: BundledVerse[];
```

**Content sourcing (important):** verse text must come from a **public-domain WEB/KJV dataset**, not hand-typed from memory — scripture accuracy is non-negotiable. During implementation, pull WEB and KJV text from a public-domain source (e.g. a WEB/KJV JSON corpus) for a curated reference list, and verify a sample against a second source before shipping.

### 2. Verse source — `lib/verses.ts`

```ts
export interface DailyVerse { verse: BundledVerse; date: Date; }
export interface VerseSource {
  getVerseForDate(date: Date): BundledVerse;
  getUpcoming(from: Date, days: number): DailyVerse[];
}
export const bundledVerseSource: VerseSource;
```

`getVerseForDate` selects `VERSES[daysSinceEpoch(date) % VERSES.length]` — deterministic, same for all users, stable across app restarts. `getUpcoming` returns the next `days` days for notification scheduling.

### 3. Settings store — `lib/stores/verse.ts`

Zustand store persisted to AsyncStorage (mirrors the existing `theme` store pattern). Device-local — no Firestore.

```ts
interface VerseSettings {
  translation: Translation;              // default 'WEB'
  reminderEnabled: boolean;              // default false until user opts in
  reminderHour: number;                  // default 8
  reminderMinute: number;                // default 0
  // actions: setTranslation, setReminderEnabled, setReminderTime, load
}
```

Changing any reminder field triggers a reschedule (see §4).

### 4. Notifications — `lib/notifications.ts`

Wraps `expo-notifications`:

- `configureNotifications()` — set the foreground handler and create the Android channel `daily-verse`.
- `requestPermission(): Promise<boolean>`.
- `rescheduleDailyVerse(settings)` — cancel all existing verse notifications, then, if `reminderEnabled` and permission granted, schedule the next 14 days from `getUpcoming(today, 14)`. Each notification: title "Verse of the Day", body = the day's verse text in the chosen translation + reference, trigger at the chosen hour/minute on that date, `data: { screen: 'verse' }`.
- `topUpSchedule(settings)` — called on app open; idempotent reschedule so the window always covers ~2 weeks ahead.

Rationale for rolling window: local notification content is fixed at schedule time, so to show the *actual verse* in the banner offline we pre-schedule real content and refresh it whenever the app opens.

### 5. Verse of the Day screen — `app/(protected)/verse.tsx`

Focal layout:
- Slim header: "Verse of the Day" + formatted date.
- **Hero verse card**: large rounded card, sky & sea gradient (`expo-linear-gradient`, already a dep), verse text in **Lora serif**, centered, line-height ~1.5, airy padding; reference below in small letter-spaced uppercase sans. Fade/slide-in ≈400ms via Reanimated (already a dep), skipped under reduced-motion.
- Actions row: **Share** (React Native `Share` API) and **Copy** (`expo-clipboard`, already a dep) as icon buttons (`@expo/vector-icons`, never emoji).
- **Translation toggle**: segmented control `WEB | KJV`, updates the verse text in place.
- **Reminder settings card**: enable `Switch`, and a time row that opens `@react-native-community/datetimepicker`. Toggling/changing time calls the store, which reschedules.
- Permission-denied state: if the user enables the reminder but denies OS permission, show a gentle inline note ("Turn on notifications in Settings to get your daily verse") — the screen otherwise works fully.

### 6. Home screen card — `components/VerseOfDayCard.tsx`

A compact preview card pinned at the top of `home.tsx`: same sky & sea gradient, a serif snippet of today's verse + reference, and a "Read today's verse" affordance. Tapping routes to `/verse`. Added above the existing "Generate a sermon" card.

### 7. Wiring — root layout

- **Fonts:** load Lora via `@expo-google-fonts/lora` + `useFonts` in the root layout, gating the splash screen until loaded (`expo-splash-screen` already configured).
- **Notification bootstrap:** call `configureNotifications()` once at startup; on app foreground, `topUpSchedule(settings)`.
- **Deep link:** an `expo-notifications` response listener routes taps carrying `data.screen === 'verse'` to `/verse`.

### 8. Config — `app.config.js`

- Add the `expo-notifications` plugin (icon/color for the notification).
- Android: add `POST_NOTIFICATIONS` to permissions (Android 13+ runtime permission).
- Bump `versionCode`/`version` when this ships (tracked at release, not here).

## Visual system (applies to this feature)

- **Signature gradient (sky & sea):** light `['#22D3EE', '#0891B2']`, dark `['#0E7490', '#155E75']`. White text on gradient (contrast ≥ 4.5:1); reference at ~90% white.
- **Typography:** Lora (`Lora_500Medium` / `Lora_600SemiBold`) for verse text only; system sans for all UI. Reference label: uppercase, letter-spacing ~1.5, small.
- **Surfaces:** reuse existing theme tokens (light `#fff`/`#111827`; dark `#111827`/`#fff`) for chrome; 16px card radius and soft shadows consistent with the current home cards.
- **Motion:** 300–400ms ease for entrance and toggles; respect `prefers-reduced-motion` (RN `AccessibilityInfo.isReduceMotionEnabled`).
- **Touch targets:** ≥44px; icon buttons padded accordingly.

## New dependencies

- `expo-notifications` (local scheduled notifications)
- `@react-native-community/datetimepicker` (reminder time picker)
- `@expo-google-fonts/lora` (verse serif; `expo-font` already present)

`expo-linear-gradient`, `react-native-reanimated`, `expo-clipboard`, `@expo/vector-icons` are already dependencies.

## Data flow

App open → `configureNotifications()` → if `reminderEnabled`, ensure permission → `topUpSchedule(settings)`. Verse screen → `getVerseForDate(today)` rendered in the chosen translation. Settings change → store updates + `rescheduleDailyVerse`. Notification tap → listener routes to `/verse`.

## Error handling

- Permission denied → inline non-blocking note; feature works in-app.
- Notifications unavailable (e.g. web) → guard all `expo-notifications` calls; degrade to in-app only.
- Verse source empty/out-of-range → `getVerseForDate` is modulo-indexed so it can't go out of range; a defensive fallback verse is returned if `VERSES` is somehow empty.

## Testing

No automated test framework exists in this repo (established constraint) and none is added. Verify via `npx tsc --noEmit` + `npm run lint` (no new errors), plus a manual pass:
1. Set reminder ~1 minute ahead → notification fires with the correct verse text + reference in the chosen translation.
2. Tap the notification → app opens to the Verse of the Day screen.
3. Toggle WEB/KJV → verse text updates in place; choice persists across restart.
4. Change the time / disable → schedule updates (verify via a fresh notification).
5. Deny OS permission → inline note shows; screen still usable.
6. Verse of the day matches the date and is identical on a second device/reinstall.
7. Home card shows today's verse and routes to the screen.
