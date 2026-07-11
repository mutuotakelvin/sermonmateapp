# SermonMate: Reframe to a Daily Companion (Phase 1)

**Date:** 2026-07-11
**Status:** Approved (pending spec review)

## Context

SermonMate is repositioning from an "AI sermon generator" to a **daily Christian
companion** — the Christian counterpart to apps like Stoic, where AI is the quiet
engine rather than the product. This is the first of four phased efforts:

1. **Reframe (this spec)** — replace "sermon"/"generate" language with warmer,
   companion framing, and make the home read as a daily spiritual flow.
2. Non-AI core value — journal + prayer journal (future).
3. Insights — mood/journal trends (future).
4. New AI surfaces framed spiritually — "Pray with AI", "Ask a Bible question" (future).

This spec covers **Phase 1 only**.

## Decisions (locked during brainstorming)

- **The noun "sermon" → "Reflection"** in all user-facing copy ("A Reflection",
  "My Reflections", "Save reflection").
- **The action "Generate a sermon" → "Daily Reflection"** as the card title, with
  the send action reading as **"Reflect on this."**
- **Mood-path output keeps the label "Encouragement"** (already in place) — the two
  flavors are Reflection (topic-driven) and Encouragement (mood-driven); both are
  the same devotional content, labeled by context.
- **Scope guardrail — user-facing copy + light home IA only.** No code identifiers,
  no backend, no data model, no Cloud Function, no Firestore collection, and no app
  name changes. Renaming those internals is a large, risky refactor with zero user
  benefit and is explicitly out of scope. The app is still called **SermonMate**
  (wordmark unchanged) — a store/branding rename is a separate future decision.
- **Surface the mood check-in as a first-class daily prompt** on the home screen
  (its own card under the verse), instead of a small chip buried in the reflect card.

## Component 1: Copy map — user-facing strings

Change **only the display strings** below. Do not touch style keys
(`viewSermonButtonText`, `generateCard`, `sermonCard`, …), handler names, types,
or the `generateSermon`/`generateMoodSermon`/`saveSermon` identifiers.

### `app/(protected)/(tabs)/home.tsx`
- Greeting subtitle (line ~184): `"Let's prepare something meaningful today"` →
  **`"A quiet moment with God, one day at a time"`**
- Card title (line ~193): `"Generate a sermon"` → **`"Daily Reflection"`**
- Add a one-line subtitle under the card title: **`"Reflect on Scripture around
  whatever's on your heart."`** (`AppText variant="caption"`, muted).
- Success toast (line ~104): `showSuccess('Sermon generated', 'Your sermon is ready')`
  → **`showSuccess('Reflection ready', 'Your reflection is ready to read')`**
- Network error (line ~110): `'Could not reach the sermon service. Please check your
  internet connection.'` → **`'Could not reach the reflection service. Please check
  your internet connection.'`**
- Delete success (line ~149): `showSuccess('Sermon deleted', 'The sermon has been
  deleted permanently')` → **`showSuccess('Reflection removed', 'The reflection has
  been deleted')`**
- Delete fallback (line ~155): `'Failed to delete sermon'` → **`'Failed to delete
  reflection'`**
- Section title (line ~281): `"My Sermons"` → **`"My Reflections"`**
- Empty state (line ~284): `"No saved sermons yet"` → **`"No reflections yet"`**
- Empty subtext (line ~286): `"Generate and save your first sermon to see it here"`
  → **`"Save your first reflection to see it here"`**
- Delete modal title (line ~353): `"Delete Sermon?"` → **`"Delete reflection?"`**
- Delete modal message (line ~354): `"This sermon will be deleted permanently. This
  action cannot be undone."` → **`"This reflection will be deleted permanently. This
  action cannot be undone."`**

### `components/SermonModal.tsx`
- Header label (line ~63): non-mood label `'Sermon'` → **`'Reflection'`** (mood path
  stays `'Encouragement'`).
- Loading text (line ~162): `'Preparing your sermon…'` → derive from `isEncouragement`:
  **`'Preparing your reflection…'`** normally, **`'Creating your encouragement…'`**
  for the mood path.
- Title placeholder (line ~172): `"Sermon title"` → **`"Reflection title"`**.
- Save-title validation (line ~105): `'Please enter a title for your sermon'` →
  **`'Please enter a title for your reflection'`**.
- Update toast (line ~119): `('Sermon updated', 'Your sermon has been updated')` →
  **`('Reflection updated', 'Your reflection has been updated')`**.
- Save toast (line ~129): `('Sermon saved', 'Your sermon has been saved')` →
  **`('Reflection saved', 'Your reflection has been saved')`**.
- Save-error fallback (line ~135): `'Failed to save sermon'` → **`'Failed to save
  reflection'`**.
- Sticky button label (line ~233): `savedSermon ? 'Update' : 'Save sermon'` →
  `savedSermon ? 'Update' : **'Save reflection'**`.

### `components/Onboarding.native.tsx`
- `'Generate Sermons'` → **`'Daily Reflections'`**; description → **`'Get a short,
  personalized reflection on Scripture for whatever's on your heart — in a few taps.'`**
- `'Share Sermons'` → **`'Share Reflections'`** (update its description to say
  "reflections" if it references sermons).
- `'Save Sermons'` → **`'Save Reflections'`**; description (line ~166) → **`'Keep your
  favorite reflections in one place. Access them anytime, anywhere.'`**

### `app/(protected)/(tabs)/mood.tsx`
- `'View Full Sermon'` (line ~403) → **`'View Encouragement'`** (the mood result is an
  encouragement).

**Not changed:** the `SermonMate` wordmark on `login.tsx`/`sign-up.tsx`, the
`sermonmate.bobakdevs.com` URLs in `profile.tsx` (tracked separately), and all
console.error strings (developer-facing, not user-visible) — leave those as-is.

## Component 2: Home mood prompt — `app/(protected)/(tabs)/home.tsx`

Make mood a first-class daily action, per the companion vision (verse → mood →
reflect):

- **Add a "How are you feeling today?" card directly under the Verse of the Day
  card**, above the Daily Reflection card. It is a single tappable `Card` (full
  width) with a warm title `AppText variant="title"` **"How are you feeling today?"**,
  a short caption **"A quick check-in — takes a few seconds."**, and a trailing
  chevron. `onPress` calls the existing `setMoodModalVisible(true)` — reusing the
  current mood flow (`MoodModal`) with no changes to it.
- **Remove the small "Mood" chip** currently inside the reflect card's `chipsRow`
  (lines ~218–226) — mood now has its own prominent entry point, so the buried chip
  is redundant. The topic chips (`chips.map(...)`) stay.
- Everything else on the home screen keeps its order: greeting → verse → **mood
  prompt (new)** → Daily Reflection → This Week's Mood → My Reflections → Create a
  Wallpaper.

No new screens, no new state (reuse `moodModalVisible`), no backend. Styling reuses
existing `Card` + theme tokens; the new card follows the same paper/rounded pattern
as the Wallpaper row.

## Data flow

Unchanged. `Sermon` shape, `generateSermon`/`generateMoodSermon`, `MoodModal`,
`SermonModal`, and the save/delete handlers all keep their current behavior and
signatures. This phase edits strings and adds one presentational card + its press
handler wiring (to an existing setter).

## Error handling

No new error paths. The reworded toasts fire on exactly the same conditions as
before (generate success/error, save/update, delete success/error, share/copy).

## Testing

No automated test framework (established); none added. Per file: `npx tsc --noEmit`
+ `npm run lint` with no new errors. On-device pass:
1. Home reads as a companion: greeting → verse → **"How are you feeling today?"**
   card → **"Daily Reflection"** card (no "generate"/"sermon" wording) → **"My
   Reflections"**.
2. Tapping the mood card opens the existing mood flow; the old in-card "Mood" chip
   is gone; topic chips still work.
3. Generating shows **"Preparing your reflection…"**, the reading view header reads
   **"Reflection"** (topic path) / **"Encouragement"** (mood path), the sticky button
   reads **"Save reflection"**, and success toast reads **"Reflection ready."**
4. Delete confirm reads **"Delete reflection?"**; onboarding and the mood tab's
   **"View Encouragement"** button read correctly. No "sermon" text remains in the
   main flow (the `SermonMate` wordmark is intentionally kept).

## Out of scope

Phases 2–4 (journal, prayer journal, insights, new AI surfaces). Any code/identifier
rename, backend/prompt change, Firestore/collection rename, or app-name/store-listing
change. The privacy/terms URLs and key rotation (pre-Play tasks) are tracked
separately.
