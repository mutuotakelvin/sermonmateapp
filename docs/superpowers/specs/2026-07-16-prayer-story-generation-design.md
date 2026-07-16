# On-Demand Story + Prayer Generation — Design

**Date:** 2026-07-16
**Status:** Approved pending spec review
**Branch:** `feature/prayer-story-generation` (off `main`)

## Problem / Goal

Two changes to the reflection reading experience (`SermonModal`), both driven by the same
insight — not every user wants every section, and generating them all up front wastes
Claude tokens:

1. **Story becomes on-demand.** Today every reflection/mood generation bundles a `story`
   into one Claude call (`functions/src/index.ts`). Slim that call to Scripture + Message
   only, and let the user generate a story with a button when they want one.
2. **Add prayer generation.** A new "Pray about this" action generates a short prayer from
   what the user just read, shown inline. Ephemeral (not stored) — a browsable prayer list
   and the prayer-routine tracker are separate, backlogged features.

Both render as inline sections at the bottom of the reading, styled like the existing
"A Story" section. No modal, no new tab, no new Firestore collection.

## Non-goals (backlogged, separate specs)

- Prayer **routine tracker** (scheduled prayer times + reminders + did-I-pray logging).
- A browsable **saved-prayers list** / prayers tab.
- Prayer **reminders** (depend on the unmerged exact-alarm branch).

## Decisions (locked with user)

1. Story is **on-demand via a button**, not auto-included ("not all users need it").
2. Prayer renders **inline at the bottom of the reading**, styled the same as the story
   section — **no modal**.
3. Prayer is **ephemeral**: generated, readable, copyable, **not saved** (regenerate on
   next open). No prayer storage exists yet.
4. Story generation and prayer generation are both **quota-free** follow-ups — they do NOT
   consume a daily AI-generation unit (the parent reflection/mood already did). Only the
   top-level `generateSermon`/`generateMoodSermon` calls are quota-gated.

## Story persistence (call out for review)

Unlike prayer, the reflection data model **already has a `story` field**
(`SavedSermon.story`, `functions` Sermon). To avoid a migration and avoid losing existing
data, the story reuses that field:

- **Legacy saved reflections** that already have a stored non-empty `story` still display
  it (no "Add a story" button needed — it's already there).
- A **newly generated** on-demand story is held in `SermonModal` state and **saved with the
  reflection** when the user taps Save/Update (populating the existing `story` field).
- Reflections saved **without** generating a story simply have an empty `story`; reopening
  shows the "Add a story" button again.

Prayer has no such field and stays ephemeral. If the reviewer prefers story to also be
ephemeral (never saved), that's a smaller change — but saving it reuses existing plumbing
and is better UX, so this is the default.

## Architecture

### Server — `functions/src/index.ts`

- **Slim the reflection prompt.** `SYSTEM_PROMPT` drops the `story` key: the model returns
  only `verses` (array of 2) and `interpretation`. Update the `Sermon` interface to
  `{ verses: string[]; interpretation: string }`, the `generate()` return, and the
  validation (no longer require `story`).
- **New `generateStory`** callable: `requireAuth`, **skips `enforceAiQuota`**,
  `claude-haiku-4-5`. Input `{ context: string }` (the reflection/encouragement's
  interpretation text). Returns `{ story: string }` (plain text — no JSON schema needed;
  read the text block directly). System prompt: write a short, vivid story that
  illustrates the reflection.
- **New `generatePrayer`** callable: same shape — `requireAuth`, no quota,
  `claude-haiku-4-5`, input `{ context: string }`, returns `{ prayer: string }`. System
  prompt: write a short, heartfelt prayer responding to the reflection.

Both new functions reuse the existing `ANTHROPIC_API_KEY` secret and the `requireAuth`
helper. They deliberately bypass `enforceAiQuota`/`refundAiQuota` (quota-free).

### Types — `lib/types.ts`

- `Sermon.story` becomes **optional**: `{ verses: string[]; interpretation: string; story?: string }`.
- `SavedSermon.story` becomes **optional**: `story?: string`.
  (Existing docs with a stored story keep working; new generations start without one.)

### Client wrappers

- `lib/sermonAi.ts`: `generateSermon`/`generateMoodSermon` return types drop the required
  `story`. Add **`generateStory(context: string): Promise<string>`** here (same
  reflection domain), mirroring the existing callable pattern + `toAiError` mapping.
- `lib/prayerAi.ts` (**new**): `generatePrayer(context: string): Promise<string>`,
  mirroring `sermonAi.ts` (callable + `AiLimitError`/`toAiError` — though quota errors
  won't fire since the function is quota-free, keep the mapping for network/other errors).

### UI — `components/SermonModal.tsx`

Add two pieces of local state seeded in the existing `useLayoutEffect` open-reset:
- `story` (string): initialized from `savedSermon?.story ?? sermon?.story ?? ''`.
- `prayer` (string): always initialized to `''` (ephemeral).
- plus `storyLoading` / `prayerLoading` booleans.

**"A Story" section** (replaces the current always-rendered one at `SermonModal.tsx:214-221`):
- If `story` is non-empty → render it with the existing copy button (unchanged look).
- Else → an **"Add a story"** button; on press, `storyLoading` spinner, call
  `generateStory(displaySermon.interpretation)`, `setStory(result)`, then render it.

**"A Prayer" section** (new, directly below "A Story"):
- A **"Pray about this"** button; on press, `prayerLoading` spinner, call
  `generatePrayer(displaySermon.interpretation)`, `setPrayer(result)`, then render the
  prayer with a copy button — styled identically to "A Story".

**Save / share wiring:**
- `handleSave` uses the local `story` state (not `displaySermon.story`) for both the
  `saveSermonApi` and `updateSermon` payloads, so an on-demand story is persisted.
- `handleShare` uses the local `story`; **prayer is not included** in share (it has its own
  copy button and is ephemeral).

## Data flow

```
generateSermon/generateMoodSermon (quota-gated) ──> { verses, interpretation }  (no story)
   │
   └─ SermonModal renders Message + Scripture
        ├─ "Add a story"  ──> generateStory(interpretation) [quota-free] ──> story (saved on Save)
        └─ "Pray about this" ──> generatePrayer(interpretation) [quota-free] ──> prayer (ephemeral)
Legacy saved reflection with stored story ──> story shown directly (no button)
```

## Error handling

- Story/prayer generation failure: toast via the existing `useToast` (`showError`), leave
  the button in place to retry. Reuse the network-vs-generic message pattern from
  `home.tsx` generation.
- No quota path to handle (functions are quota-free), but keep `toAiError` for
  network/unavailable errors.

## Testing / verification

No test runner in this repo (eslint + tsc). Verify:
1. `npx tsc --noEmit` clean; `npx eslint` clean on touched files.
2. `functions/` build: `cd functions && npm run build` clean.
3. Drive the app: a fresh reflection shows Message + Scripture and no story until "Add a
   story" is tapped; "Pray about this" generates an inline prayer; copy works on both;
   saving a reflection after generating a story persists it (reopen shows it); a prayer is
   gone on reopen; a legacy reflection with a stored story still shows it.

## Files touched

| File | Change |
|---|---|
| `functions/src/index.ts` | slim reflection prompt (drop story); add `generateStory` + `generatePrayer` (quota-free) |
| `lib/types.ts` | `Sermon.story` / `SavedSermon.story` → optional |
| `lib/sermonAi.ts` | drop required story from return types; add `generateStory()` |
| `lib/prayerAi.ts` (new) | `generatePrayer()` callable wrapper |
| `components/SermonModal.tsx` | on-demand "Add a story" + new "A Prayer" section; save/share wiring |
