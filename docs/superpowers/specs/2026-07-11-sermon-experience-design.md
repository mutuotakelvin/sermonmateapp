# SermonMate: Sermon-First Experience + Mood Refresh

**Date:** 2026-07-11
**Status:** Approved (pending spec review)

## Context

On-device review of the warm redesign surfaced UX problems in the app's *core* flow — sermons:
- The sermon result is a cramped bottom-sheet modal with **collapsible** Verses/Sermon/Story sections. Users miss the collapse; content is hidden. (NN/G: on mobile, avoid accordions when users view multiple sections often — don't hide important content.)
- The generate→result transition feels abrupt (a modal pops mid-air).
- **Save** is not prominent/accessible.
- The mood check-in's **bouncy** spring/pulse select animation "looks bad."

Research (devotional-app UX): these apps should feel like *a quiet reading space*, single-focus; critical actions (Save) should be persistently accessible. This spec reworks the sermon presentation into a calm, sermon-first reading view and refreshes the mood check-in. **No backend/data changes** — same `Sermon` shape, same handlers. It builds on the warm design system (`lib/theme.ts`, `components/ui/`).

## Decisions (locked during brainstorming)

- **Sermon result = full-screen reading view, one scroll, sermon-first.** Order: topic → the sermon message (lead) → verses as inline scripture cards → story. Nothing collapsed. Chosen over a tabbed layout (tabs still hide content behind a tap).
- **Sticky Save.** A persistent bottom bar with a full-width Save action, always visible.
- **Reuse the existing `SermonModal` component** (reworked into the reading view) so call sites (Home generate, Home edit-saved, mood encouragement) keep working with the same props — no new route/param plumbing.
- **Generate flow:** open the reading view immediately in a calm "Preparing your sermon…" loading state, then fill.
- **Mood: remove the bounce.** Gentle 150ms fade on select.
- **Mood: bold per-mood confirmation screen** (the "Emotional UI" reference) — each mood in its own confident color. A deliberate accent moment that departs from the muted system.
- Encouragement (mood) results reuse the same reading view.

## Component 1: Sermon reading view — `components/SermonModal.tsx` (rework)

Keep the exported interface unchanged: `{ visible, sermon, savedSermon, topic, onClose, onSave }`. Internally, replace the bottom-sheet + `react-native-collapsible` sections with a **full-screen reading layout**:

- Presentation: full-screen `Modal` (`presentationStyle="fullScreen"` / `animationType="slide"`), paper background.
- **Header row:** `‹` close (calls `onClose`) · "Sermon" (or "Encouragement" when it's a mood entry — derive from title/props) · a **share** icon (shares the full text via RN `Share`).
- **Topic/title:** `AppText variant="display"` (Newsreader serif).
- **THE MESSAGE:** a `label` heading + the sermon body (`interpretation`) in `AppText variant="body"` with generous line-height — **first and prominent**.
- **SCRIPTURE:** a `label` heading + each verse rendered as an inline `Card` (surface or subtle blush tone) with the verse in `AppText variant="verse"` (serif) and its reference as `label`. All verses shown; never collapsed.
- **A STORY:** a `label` heading + the story body in `body`.
- **Card color swatches:** the existing 6 muted `Card tone` swatches shrink to a small single row just above the sticky bar (keeps the sermon-card-tint feature without stealing focus). Selection state preserved.
- **Sticky bottom bar:** a full-width terracotta `<PrimaryButton>` — label **"Save sermon"** for a new sermon, **"Update"** when `savedSermon` is set; plus a share icon button. The bar is pinned (outside the ScrollView) so it's always visible. `loading` bound to the saving state.
- **Loading state:** when `visible` but content not yet ready (see Component 2), the whole view shows a calm centered "Preparing your sermon…" with a gentle `ActivityIndicator` (no bounce). Copy varies for mood ("Creating your encouragement…").
- Remove `react-native-collapsible` usage. Swap the deprecated `Clipboard` import from `react-native` to `expo-clipboard` (already a dependency; used by `verse.tsx`). Copy actions (per section) remain available as small inline icon buttons in each section header.
- Preserve all behavior: `saveSermon`/`updateSermon`, color selection, share/copy, `onSave`/`onClose`.

## Component 2: Generate flow — `app/(protected)/(tabs)/home.tsx`

Rework `handleGenerate` so the reading view is the destination, shown immediately in a loading state:
1. On send/chip, set the sermon reading view `visible` with a `generating` flag (no `sermon` yet) → the view shows "Preparing your sermon…".
2. `await generateSermon(topic)`; on success set the `sermon` + clear `generating` → the view fills with content.
3. On error, close the view and show the existing error toast.

`SermonModal` gains an explicit `loading?: boolean` prop; Home passes `loading={generating}`. When `loading` is true the view renders the calm loading state regardless of `sermon`. Editing a saved sermon (`handleSermonCardPress`) opens the same view directly with content (no loading). No change to the underlying `generateSermon` call or error handling.

## Component 3: Mood check-in — `components/MoodModal.tsx` (rework)

- **Remove the bounce.** Delete the `pulseScale` sequence and the spring entrance in `AnimatedMoodChip`; use a gentle `withTiming` fade/opacity (≈150ms) on select. Tiles stay warm-muted for the grid.
- **New flow:**
  1. **Mood grid** (calm select). Tapping a mood advances to →
  2. **Per-mood confirmation screen** (full-color): background = that mood's confident color; a large Ionicons mood face, the mood name in large serif (`display`), the date, the reason **chips** (`<Chip>` adapted for on-color contrast) + an "add a reason" text input, and a send/continue `<PrimaryButton>` (or an on-color send button). Text/controls chosen for ≥4.5:1 contrast on the mood color.
  3. **Generating** (calm "Creating your encouragement…") → the resulting encouragement opens in the **sermon reading view** (Component 1), same as a sermon.
- Preserve all behavior: `selectedMood`/`selectedReasons`/`customReason` state, `generateMoodSermon`, `addMoodEntry`, the completion/`onComplete` flow, reset-on-visible.
- **Mood color map** (add to `lib/theme.ts` as `theme.moodColor`, reusable): each mood → `{ bg, on }` where `bg` is the confident color and `on` is the text/icon color meeting contrast. Proposed: Happy `#E0A22E`/charcoal, Grateful `#5E9B6B`/white, Hopeful `#5B8DC9`/white, Peaceful `#3FA39C`/white, Anxious `#C4913F`/charcoal, Sad `#6E86A8`/white, Overwhelmed `#A96A93`/white, Angry `#C0553A`/white. (Home's weekly dots stay on the muted tokens — the bold colors are only the mood-confirm accent.)

## Data flow

Home: type/chip → open reading view (`generating`) → `generateSermon` → fill → Save (sticky) → `onSave`. Mood: grid → per-mood confirm (reasons) → `generateMoodSermon` → reading view → save entry (already saved via `addMoodEntry`). Same `Sermon` shape throughout; the reading view is the single result surface for both.

## Error handling

Generate error → close reading view + existing error toast (no half-rendered state). Mood-generate error → return to the confirm screen + toast (existing behavior). Share/copy failures → toast (existing). No new error paths.

## Testing

No automated test framework (established); none added. Per file: `npx tsc --noEmit` + `npm run lint` with no new errors. On-device pass:
1. Home generate → calm "Preparing…" → lands in the full-screen reading view; the **sermon message reads first**, verses visible as scripture cards, story below — no collapsibles.
2. **Save** is obvious (sticky bottom) and one tap; saved sermon opens in the same view with "Update".
3. Share/copy work; card-color row still tints the saved card.
4. Mood select has **no bounce**; picking a mood shows the **bold per-mood confirm screen** (correct color + readable), reasons + add-a-reason work; encouragement opens in the reading view.

## Out of scope

Groups, Wallpapers, and any backend/prompt changes. The `Sermon` data shape and Cloud Function are unchanged.
