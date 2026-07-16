# Wallpaper Creation — Design

**Date:** 2026-07-16
**Status:** Approved pending spec review
**Branch:** `feature/wallpapers` (off `main`)
**Mockup:** `docs/superpowers/mockups/wallpapers-gallery-editor.png`

## Goal

A wallpaper creator: browse a gallery of gradient backgrounds by category, pick one, drop
text on it (today's verse or a line from a saved reflection), choose font and text color,
then download to Photos or share. Reuses the existing 9:16 card-capture pipeline.

## Context — most of this already exists

The "Create a card" feature (`app/(protected)/card.tsx`) already renders a **9:16 portrait**
`ShareCard` (gradient + verse text + reference + wordmark) and captures it at native pixel
density (`lib/cardCapture.ts` — comment: "wallpaper-grade"), with save-to-Photos and OS
share. Wallpapers is this engine plus a gallery, more backgrounds, text sources, fonts, and
colors. We **reuse** `cardCapture.ts` and `splitVerseString` verbatim and **extend**
`ShareCard`; we do **not** duplicate the pipeline and do **not** modify `card.tsx`.

## Decisions (locked with user)

1. **Sharing:** one **Share** button → OS share sheet (`shareCardImage`) + a **Download to
   Photos** button (`saveCardImage`). **No** bespoke X/Facebook/Instagram/Threads buttons —
   mobile can't reliably push a pre-filled image to those apps; the OS sheet already lists
   them if installed.
2. **Relationship to "Create a card":** new Wallpapers surface, **reuse** `cardCapture.ts`
   and **extend** `ShareCard`. Leave `card.tsx` untouched.
3. **Text sources (v1):** *Verse of the Day* and *My Reflections* (a line from a saved
   reflection). **No** free-form custom text in v1.
4. **Backgrounds:** clean `LinearGradient` backgrounds (no diagonal-stripe texture in v1), a
   curated set categorized Nature / Sky / Minimal.
5. **Navigation:** a "Wallpapers" row on Home → gallery → editor (stacked screens, like
   `card.tsx`). Not a new tab.

## Non-goals (out of scope)

- Custom free-form text, the diagonal-stripe texture, per-network social buttons, saving
  wallpapers to a library, and any change to `card.tsx`.

## Architecture

### Data — `lib/wallpapers.ts` (new)

```ts
export type WallpaperCategory = 'Nature' | 'Sky' | 'Minimal';

export interface Wallpaper {
  key: string;
  label: string;
  category: WallpaperCategory;
  gradient: [string, string]; // top -> bottom
}

export const WALLPAPERS: Wallpaper[]; // ~6-8 curated entries, e.g.
// Nature: misty forest, calm meadow; Sky: dawn sky, night sky;
// Minimal: minimal paper, sunset ridge (exact hex chosen at implementation, in the
// muted card-palette spirit of CARD_THEMES).

export const WALLPAPER_CATEGORIES: ('All' | WallpaperCategory)[]; // ['All','Nature','Sky','Minimal']

export type WallpaperFont = 'serif' | 'sans';

export interface TextColorOption { key: string; label: string; color: string; }
export const TEXT_COLORS: TextColorOption[]; // white, tan, cream, near-black
```

### Renderer — extend `components/ShareCard.tsx`

Add optional props that **override** the theme-derived values; when absent, current behavior
is unchanged (so `card.tsx` keeps working):

```ts
type Props = {
  content: CardContent;
  themeKey: CardThemeKey;
  position: CardPosition;
  width?: number;
  // NEW (all optional):
  gradient?: [string, string];  // overrides theme.gradient
  textColor?: string;           // overrides theme.textColor (also used for reference)
  font?: WallpaperFont;         // 'serif' (default, current look) | 'sans'
  fullBleed?: boolean;          // true → no border radius (for a saved wallpaper)
};
```

- `gradient ?? theme.gradient`, `textColor ?? theme.textColor` (reference uses `textColor`
  at reduced opacity when overridden, else `theme.refColor`).
- `font === 'sans'` → render the verse with the sans family (`theme.font.sans` via a style
  override) instead of the serif `variant="verse"`.
- `fullBleed` → `borderRadius: 0` on the card container.
- Wordmark stays.

### Gallery — `app/(protected)/wallpapers.tsx` (new)

- Header with a back button + "Wallpapers" title (mirrors `card.tsx` header).
- Category filter chips (`WALLPAPER_CATEGORIES`); selected chip filters the grid; "All"
  shows everything.
- 2-column grid of tiles: each tile is a `LinearGradient` swatch (the wallpaper's gradient)
  with its `label`. Tap → `router.push({ pathname: '/(protected)/wallpaper-editor',
  params: { wallpaper: key } } as never)`.

### Editor — `app/(protected)/wallpaper-editor.tsx` (new)

- Reads `params.wallpaper` (the background key); looks it up in `WALLPAPERS`.
- Live preview: `<ShareCard ref position="centered" gradient={wp.gradient}
  textColor={selectedColor} font={selectedFont} content={content} />`.
- **Source** segmented control: `Verse of the Day` | `My Reflections`.
  - *Verse of the Day* → `content = { text, reference }` from
    `bundledVerseSource.getVerseForDate(new Date())` in the current `translation`.
  - *My Reflections* → opens a **reflection picker** (a modal): loads `getSermons()`, lists
    reflections (title + date); tapping one whose `verses` has >1 entry shows a second step
    to pick a verse; then `content = splitVerseString(chosenVerseString)`. Empty state if
    the user has no reflections yet.
- **Font** toggle: Serif / Sans. **Text color:** the `TEXT_COLORS` swatches.
- **Download to Photos** (`captureCardToFile` → `saveCardImage`) and **Share**
  (`captureCardToFile` → `shareCardImage`), with the exact busy-state + toast handling from
  `card.tsx:38-63`. The wallpaper `ShareCard` renders with `fullBleed` (no rounded corners)
  for **both preview and capture** — one instance, WYSIWYG, so the saved image matches the
  preview exactly (a phone wallpaper should not have rounded corners).

### Navigation — `app/(protected)/(tabs)/home.tsx`

Add a "Wallpapers" entry row modeled on the existing "Create a card" row
(`home.tsx:355-371`): a `Card` with an icon, label ("Wallpapers"), subtitle ("Make a
wallpaper from a verse or reflection"), chevron, pressing → `router.push('/(protected)/wallpapers' as never)`.

## Data flow

```
Home "Wallpapers" row ──> gallery (filter + grid)
   └─ tap tile ──> editor?wallpaper=<key>
        ├─ source: Verse of Day ──> bundledVerseSource today ──> content
        ├─ source: My Reflections ──> getSermons() ──> pick reflection ──> pick verse
        │                            ──> splitVerseString ──> content
        ├─ font + textColor ──> ShareCard preview (gradient from wallpaper)
        └─ Download / Share ──> captureCardToFile(fullBleed) ──> saveCardImage / shareCardImage
```

## Error handling

- Capture/save/share failures: identical to `card.tsx` — `showError`/`showInfo` toasts,
  `busy` guard, permission-denied message on save.
- Reflection load failure in the picker: `console.error` + empty list (matches the app's
  `getSermons` convention).

## Testing / verification

No test runner (eslint + tsc). Verify:
1. `npx tsc --noEmit` clean; `npx eslint` clean on touched/new files.
2. `card.tsx` still compiles and renders unchanged (ShareCard back-compat).
3. Drive: Home → Wallpapers opens the gallery; category chips filter; a tile opens the
   editor with that background; Verse-of-Day and My-Reflections sources both populate the
   preview; font + color update live; Download saves a full-bleed image to Photos; Share
   opens the OS sheet.

## Files touched

| File | Change |
|---|---|
| `lib/wallpapers.ts` (new) | background set + categories + text colors + font type |
| `components/ShareCard.tsx` (modify) | optional gradient/textColor/font/fullBleed overrides (back-compatible) |
| `app/(protected)/wallpapers.tsx` (new) | gallery: category chips + 2-col gradient grid |
| `app/(protected)/wallpaper-editor.tsx` (new) | editor: source/font/color, download/share, reflection picker |
| `app/(protected)/(tabs)/home.tsx` (modify) | add a "Wallpapers" entry row |
