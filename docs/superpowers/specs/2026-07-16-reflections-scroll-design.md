# Reflections Horizontal Scroll + View All — Design

**Date:** 2026-07-16
**Status:** Approved (pending spec review)
**Branch:** to be created from `main` (feature branch)

## Problem

The home screen's "My Reflections" section (`app/(protected)/(tabs)/home.tsx:308-352`)
renders **every** saved reflection in a 2-column wrapping grid. As a user saves more
reflections, this grid grows unbounded down the page, pushing everything below it away
and cluttering the home screen.

## Goal

Make "My Reflections" on home a compact **horizontal scroll** of recent reflections with
a **"View all →"** link to a dedicated full-list page. Home stays a fixed, short height no
matter how many reflections exist.

## Non-goals

- No changes to reflection generation, the `SermonModal` reading/editing flow, or the
  `sermons` data model.
- No new dependencies, Cloud Functions, or Firestore changes.
- Not touching the wallpaper, prayer, or story features (separate sub-projects).

## Decisions (locked with user)

1. **Home strip:** show the **6 most recent** reflections as fixed-width cards in a
   horizontal scroll. The "View all →" link appears **only when there are more than 6**
   reflections.
2. **Full page format:** reuse the existing **2-column grid** card layout.
3. **Delete placement:** delete lives on the **full page only**. The small home-strip
   cards have no trash button.

## Architecture

Three units:

### 1. `components/ReflectionCard.tsx` (new, presentational)

Extracted from the card markup currently inline in `home.tsx:321-348`. Pure presentational
component — no data loading, no navigation logic.

**Props:**
```ts
interface ReflectionCardProps {
  sermon: SavedSermon;
  variant: 'strip' | 'grid';
  onPress: (sermon: SavedSermon) => void;
  onDelete?: (sermon: SavedSermon) => void; // rendered only when provided
}
```

**Behavior:**
- Renders tone-colored `Card`, serif title (2 lines), interpretation excerpt (2 lines),
  and date footer — identical visuals to today. The `COLOR_TONE_MAP` (colorId → tone) and
  the `getSermonTone` fallback currently in `home.tsx:31-39,185-187` **move into this
  component**, since it is now the only place that maps a reflection's color to a tone.
  Both `COLOR_TONE_MAP` and `getSermonTone` are then removed from `home.tsx`.
- `variant="strip"`: fixed width (~160px), `minHeight` ~160, no trash button (ignores
  `onDelete` even if passed — strip cards never delete).
- `variant="grid"`: current 48%-width behavior, renders the trash button when `onDelete`
  is provided.
- Tapping the card body calls `onPress(sermon)`; tapping the trash (grid only) calls
  `onDelete(sermon)`. The trash `Pressable` must stop the press from bubbling to the card
  (as the current code does via an absolutely-positioned overlay).

**Depends on:** `Card`, `AppText`, `Ionicons`, `theme`, `SavedSermon` type.

### 2. `app/(protected)/reflections.tsx` (new, full "View all" page)

A stacked screen (pushed on top of the tabs, same as `verse.tsx` / `card.tsx`).

**Layout:** header with a back button + "My Reflections" title (mirrors `verse.tsx:74-83`),
then the 2-column grid of `ReflectionCard variant="grid"` inside a vertical `ScrollView`.

**Owns:**
- Loading: `getSermons()` on mount; reload after a delete.
- Read/edit: its own `SermonModal` instance, opened on card press (read/edit an existing
  reflection — `sermon={null}`, `savedSermon={tapped}`).
- Delete: `deleteSermon()` + `ConfirmationModal`, wired exactly like the current home
  handlers (`home.tsx:156-183`), moved here.
- Empty state: if a user reaches this page with zero reflections (edge case — the link is
  hidden on home when empty, but deep-linking or deleting the last one is possible), show
  the same "No reflections yet" empty state.

**Depends on:** `ReflectionCard`, `SermonModal`, `ConfirmationModal`, `getSermons`,
`deleteSermon`, `useRouter`, `useToast`, `Screen`, `AppText`, `theme`.

### 3. `app/(protected)/(tabs)/home.tsx` (edited — net simpler)

- **Replace** the inline grid (`home.tsx:319-350`) with a horizontal `ScrollView`
  (`horizontal`, `showsHorizontalScrollIndicator={false}`) of `ReflectionCard variant="strip"`,
  sliced to the first 6 of `savedSermons` (already newest-first from
  `getSermons` → `orderBy('createdAt', 'desc')`).
- **Section header:** wrap the "My Reflections" title in a row matching the existing
  `moodCardHeader` pattern (`home.tsx:269-278`) with a "View all →" `Pressable` on the
  right that calls `router.push('/(protected)/reflections')`. Render the link only when
  `savedSermons.length > 6`.
- **Card press:** keep the existing `handleSermonCardPress` (opens `SermonModal` to read).
- **Remove from home:** `handleDeletePress`, `handleConfirmDelete`, `handleCancelDelete`,
  the `deleteModalVisible` / `sermonToDelete` / `deleting` state, and the
  `ConfirmationModal` render. Delete now lives only on the full page. Also remove the now-unused
  `deleteSermon` import.
- **Empty state:** unchanged ("No reflections yet").
- **Focus reload:** replace the mount-only `loadSavedSermons()` in the `useEffect`
  (`home.tsx:80-84`) with a focus-aware reload using expo-router's `useFocusEffect`
  (from `@react-navigation/native` / `expo-router`), so a delete performed on the full
  page is reflected when the user navigates back to home. `loadMoodEntries` /
  `getWeeklySummary` can stay on the mount effect or move to focus — keep their current
  mount behavior to limit scope; only `loadSavedSermons` needs focus reload.

## Data flow

```
getSermons() ──> savedSermons (home)      ──> slice(0,6) ──> strip cards
getSermons() ──> reflections (full page)  ──> full grid   ──> grid cards
                                                              └─ delete ─> deleteSermon() ─> reload full page
home regains focus ──> useFocusEffect ──> loadSavedSermons() ──> strip reflects deletes
```

Each screen loads independently via `getSermons()` (matching the app's current
per-screen pattern for sermons — mood/verse use zustand stores, sermons do not, and this
change does not introduce one). `getSermons` is a single Firestore query; the duplicate
fetch on navigation is acceptable and simpler than introducing a shared store.

## Error handling

- Load failures: same as today — `console.error` + set list to `[]` (both screens).
- Delete failures (full page): same as today — `showError` toast, keep the item.
- No new error surfaces introduced.

## Testing / verification

No test framework in this repo (eslint + tsc only). Verify by:
1. `npx tsc --noEmit` clean and `npx eslint` clean on the two new files + `home.tsx`.
2. Drive the app (rebuilt dev client): confirm home shows a capped horizontal strip,
   "View all" appears only past 6 reflections, the full page shows the grid, delete works
   on the full page, and a delete there is reflected on home after navigating back
   (focus reload).

## Files touched

| File | Change |
|---|---|
| `components/ReflectionCard.tsx` | New — presentational card, `strip`/`grid` variants |
| `app/(protected)/reflections.tsx` | New — full "View all" page (load, grid, read/edit, delete) |
| `app/(protected)/(tabs)/home.tsx` | Edit — horizontal strip + "View all" link; remove delete flow; focus reload |
