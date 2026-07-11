# SermonMate: Shareable Verse Cards (Phase 2)

**Date:** 2026-07-11
**Status:** Approved (pending spec review)

## Context

Phase 2 of the daily-companion direction. Builds the "Create a Wallpaper" home entry
(currently a "coming soon" stub) into a real feature: turn a verse or reflection into a
beautifully designed **portrait card** the user can **share as an image** (organic growth
loop — every shared card carries the `SermonMate` wordmark) or **save to their photo
library** to use as a phone wallpaper.

This is a **non-AI** feature — pure rendering + native capture — which fits the vision's
"AI is the engine, not the product" principle (the app gains delight/value with no model
calls). Sharing today is text-only (`Share.share({ message })`); this adds image cards.

(Journal + prayer journal are deferred to the backlog.)

## Decisions (locked during brainstorming)

- **Format:** a single **portrait 9:16** card (serves both phone wallpaper and story/status
  share). No square/feed format in v1.
- **4 background themes**, user picks one per card: **Cream Paper**, **Terracotta**,
  **Dusk** (evening blue + gold), **Charcoal + Gold**. Gradient backgrounds via
  `expo-linear-gradient`.
- **Text position is user-selectable**, two options only: **Centered** and
  **Bottom-anchored** (verse in the lower third, top left clear for the phone clock). The
  "editorial top-left" option was rejected.
- **Actions:** **Share** (image, via the OS share sheet) + **Save to Photos**.
- **Content sources:** the app's existing content — **Verse of the Day** and **saved
  reflections** (a reflection's verse). No free-text editor; the entry points supply the
  content.
- Every card shows a small **`SermonMate` wordmark** (brand travels with shares).
- **Out of scope (v1):** custom colors, photo/image backgrounds, square format, in-app
  verse picker or text editor, AI verse suggestions, setting the wallpaper programmatically
  (we save to Photos; the user sets it themselves).

## File structure & responsibilities

- **`lib/cards.ts`** — card *data & pure helpers* (no native deps): the `CardContent` and
  `CardPosition` types, `CardThemeKey`, the `CARD_THEMES` array (4 themes, each
  `{ key, label, gradient:[string,string], barColor, textColor, refColor, wordmarkColor }`
  built from `lib/theme.ts` tokens), and `splitVerseString(raw): CardContent` (best-effort
  parse of a reflection's verse string into `{ text, reference? }`).
- **`components/ShareCard.tsx`** — *pure presentational* portrait card. Props:
  `{ content: CardContent; themeKey: CardThemeKey; position: CardPosition }`. Renders the
  gradient, top accent bar, verse (serif, `AppText`), reference, and wordmark. No capture,
  share, or IO logic. Fixed 9:16 aspect (width from a passed-in size or the screen width).
- **`lib/cardCapture.ts`** — *native IO*, isolated so the pure data module stays light:
  - `captureCardToFile(ref): Promise<string>` — `react-native-view-shot` `captureRef` →
    PNG tmpfile at ~1080×1920, returns the file uri.
  - `shareCardImage(uri): Promise<void>` — `expo-sharing` `shareAsync(uri)` (reliable
    cross-platform image share; falls back to a "sharing unavailable" toast if
    `Sharing.isAvailableAsync()` is false).
  - `saveCardImage(uri): Promise<'saved' | 'denied'>` — request `expo-media-library`
    permission, then `saveToLibraryAsync(uri)`.
- **`app/(protected)/card.tsx`** — the *card creator screen* (new route, same non-tab
  protected-screen pattern as `app/(protected)/verse.tsx`). Receives `text` and
  `reference` route params. Holds `themeKey` + `position` state, renders a live
  `<ShareCard>` (with a `ref`), a horizontal 4-theme selector, a 2-option position
  segmented control, and **Share** / **Save** buttons wired to the `cardCapture` helpers.

## Data model

```ts
type CardContent = { text: string; reference?: string };
type CardPosition = 'centered' | 'bottom';
type CardThemeKey = 'cream' | 'terracotta' | 'dusk' | 'charcoal';
```

The reference line renders only when `reference` is present.

## Entry points

The entry points are the content picker (no in-app editing in v1):

- **Home** — rename the "Create a Wallpaper" card to **"Create a card"** (subtitle:
  "Share a verse or save it as a wallpaper") and route to `/card` seeded with **today's
  verse** (`bundledVerseSource` → structured `{ text, reference }`), replacing the current
  "coming soon" toast.
- **Reflection reading view** (`components/SermonModal.tsx`) — add a **"Create card"**
  action that routes to `/card` seeded from the reflection's first verse string, parsed via
  `splitVerseString` (`{ text, reference? }`).
- **Verse-of-the-Day screen** (`app/(protected)/verse.tsx`) — add the same "Create card"
  affordance (it already holds the structured verse); low-cost, high-fit.

Route params are strings (expo-router). `reference` is optional/empty when absent.

## Capture / share / save (native)

- New dependencies: **`react-native-view-shot`**, **`expo-media-library`**,
  **`expo-sharing`** (+ `expo-media-library` config plugin in `app.config` with a save
  permission; iOS `NSPhotoLibraryAddUsageDescription`).
- **These are new native modules → a development rebuild is required** before the feature
  runs (`npx expo run:android`, then launch in Waydroid) — same situation as when
  expo-notifications was added. The plan will flag this as a human step; it is NOT verifiable
  by `tsc`/`lint` alone.
- Capture resolution: render/capture the card so the PNG is ~1080×1920 (wallpaper-grade).
  Use `captureRef`'s `width`/`height` (or the card laid out at screen width × device pixel
  ratio) to reach that.

## Error handling

- **Save, permission denied:** `saveCardImage` returns `'denied'` → show an error toast
  ("Allow photo access to save cards") — no crash.
- **Capture failure:** helpers reject → caught in `card.tsx` → error toast; screen stays
  usable.
- **Share unavailable / cancelled:** `Sharing.isAvailableAsync()` false → info toast;
  a user-cancelled share sheet is a no-op (no error).
- Buttons disable while a capture/save is in flight (reuse the existing loading-button
  pattern).

## Testing

No automated test framework (established; none added). Per file: `npx tsc --noEmit`
(expect 0) + `npm run lint` (baseline 14 problems — no new ones). Because the feature needs
new native modules, the real verification is a **human on-device pass after a dev rebuild**:
1. Home "Create a card" → creator opens with today's verse; all 4 themes and both positions
   render correctly (bottom-anchored leaves the top clear).
2. From a reflection, "Create card" seeds that reflection's verse (reference parsed when
   present, omitted cleanly when not).
3. **Share** produces an image (not text) in the share sheet.
4. **Save to Photos** prompts for permission the first time, then the card image appears in
   the gallery at wallpaper resolution.

## Out of scope

Journal/prayer journal (backlog), custom colors, photo backgrounds, square format, in-app
text editing, AI suggestions, and programmatic wallpaper-setting. No changes to the
reflection generation, Firestore, or auth.
