# SermonMate: Visual Redesign (Warm Editorial System)

**Date:** 2026-07-10
**Status:** Approved (pending spec review)

## Context

The app works but "looks not that good" (bright iOS-blue + rainbow gradients, system fonts, inconsistent screens). The user provided a redesign PDF (`~/Documents/sermonmate/SermonMate Redesign.pdf`) defining a warm, editorial visual system plus two new features (Groups, Wallpapers).

That PDF is **three separate efforts**. Decomposed and sequenced during brainstorming: **(1) this visual redesign → (2) Groups → (3) Wallpapers**, each its own spec/plan/build cycle. This spec covers **only the visual redesign** — re-skinning every existing screen onto a new design system and adopting the mocked bottom-tab navigation. Groups and Wallpapers are out of scope here (the redesign lays the foundation they'll build on).

## Decisions (locked during brainstorming)

- **Light-only.** The warm-paper aesthetic is inherently light. Remove the Dark Mode toggle and all `isDark` branching. (A dark theme can be designed later.)
- **Scope: all screens**, including login / sign-up / onboarding (not in the mockups — extend the language to them).
- **Adopt the bottom tab bar.** Tabs now: **Home · Mood · Profile** (Groups tab added in phase 2). Retire the hamburger `ProfileDrawer` and mood-as-modal-from-home.
- **Home uses direction 1a** (calm/editorial) for now; direction 1b (community-forward) comes when Groups ships.
- **Approach:** centralized design tokens + a small primitives library, then refactor screens onto it.

## Design tokens — `lib/theme.ts` (new)

Single source of truth. No dark variant.

```ts
export const theme = {
  color: {
    paper: '#F2EDE4',        // app background
    surface: '#FBF8F2',      // cards on paper
    surfaceAlt: '#EDE6DA',   // insets, chips (unselected)
    border: '#E2D9CB',       // hairlines
    accent: '#B0532F',       // terracotta — buttons, links, selected, send
    accentText: '#FBF8F2',   // text on accent
    text: '#2A2420',         // primary text
    textMuted: '#7A6E62',    // secondary text
    // muted card palette (verse/mood/group/sermon cards, wallpapers)
    sage: '#7F9370',
    dustyBlue: '#7FA0C4',
    sand: '#D8CBB0',
    rust: '#A9503C',
    deepBlue: '#4E6B87',
    olive: '#8E9E72',
    blush: '#EFD8CC',        // 1a verse card
    charcoal: '#2E2A25',     // 1b dark verse card / dark surfaces
    danger: '#B23B2E',       // destructive (sign out, delete)
  },
  font: {
    // serif display — Newsreader; UI — Work Sans (loaded in Task 2)
    serif: 'Newsreader_500Medium',
    serifItalic: 'Newsreader_500Medium_Italic',
    sans: 'WorkSans_400Regular',
    sansMedium: 'WorkSans_500Medium',
    sansSemibold: 'WorkSans_600SemiBold',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 10, md: 16, lg: 20, pill: 999 },
} as const;

// text style presets consumed by AppText
export const textVariants = {
  display: { fontFamily: theme.font.serif, fontSize: 26, lineHeight: 32, color: theme.color.text },
  verse:   { fontFamily: theme.font.serifItalic, fontSize: 20, lineHeight: 30, color: theme.color.text },
  title:   { fontFamily: theme.font.sansSemibold, fontSize: 18, lineHeight: 24, color: theme.color.text },
  body:    { fontFamily: theme.font.sans, fontSize: 15, lineHeight: 22, color: theme.color.text },
  caption: { fontFamily: theme.font.sans, fontSize: 12, lineHeight: 16, color: theme.color.textMuted },
  label:   { fontFamily: theme.font.sansSemibold, fontSize: 11, lineHeight: 14, color: theme.color.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
} as const;
```

## Primitives — `components/ui/`

Thin, reusable, each one responsibility. Screens compose these instead of re-deriving styles.

- `Screen` — paper background + `SafeAreaView`; standard horizontal padding.
- `AppText` — `variant` prop keyed to `textVariants`; forwards style overrides.
- `Card` — `surface` background, `radius.md`, subtle border, standard padding; optional `tone` prop to use a muted palette color as the card background (verse/mood/group cards).
- `PrimaryButton` — terracotta fill, `accentText`, `radius.md`, ≥44px height, pressed/disabled states, optional loading spinner.
- `Chip` — pill; selected = accent fill, unselected = `surfaceAlt`.
- `TabBar` — the bottom navigation (see below).

## Fonts — `app/_layout.tsx` (modify)

Replace Lora with **Newsreader** + **Work Sans** via `@expo-google-fonts/newsreader` and `@expo-google-fonts/work-sans`, loaded through the existing `useFonts` splash-gate. Families used: `Newsreader_500Medium`, `Newsreader_500Medium_Italic`, `WorkSans_400Regular`, `WorkSans_500Medium`, `WorkSans_600SemiBold`. Remove the Lora import/usage (the verse screen moves to Newsreader).

## Navigation restructure

Adopt the mocked bottom tab bar. Current state: `app/(protected)/(tabs)/_layout.tsx` hides the tab bar (`tabBarStyle: { display: 'none' }`) and only registers `home`; profile is the hamburger `ProfileDrawer`; mood is a modal launched from home.

New structure (`app/(protected)/(tabs)/`):
- **`_layout.tsx`** — visible custom `TabBar` with three tabs: **Home**, **Mood**, **Profile** (leave a clearly-marked seam to add **Groups** as the 2nd tab in phase 2).
- **`home.tsx`** — Home 1a; remove the hamburger menu button (profile is now a tab).
- **`mood.tsx`** (new tab; move/rename existing `app/(protected)/mood-history.tsx` content here) — mood calendar/history with a prominent "How do you feel today?" action that opens the existing `MoodModal` check-in flow.
- **`profile.tsx`** — full profile screen (migrate the useful content out of `components/ProfileDrawer.tsx`: name/email/avatar, Report Issue, Delete Account, Sign Out, Terms/Privacy links, version). Restyled.

Retire `components/ProfileDrawer.tsx`. The verse screen, sermon modal, and mood check-in remain modals/pushed screens launched from Home/Mood, restyled.

## Screen restyle inventory

Each restyled onto tokens + primitives (light-only, no `isDark`):

| Screen | Key changes |
|---|---|
| Home (`(tabs)/home.tsx`) | 1a layout: serif "Good evening, {name}", blush verse card, Generate-sermon card (terracotta send button, muted chips), This Week's Mood, "Create a Wallpaper" row placeholder (links nowhere yet — phase 3), no hamburger. |
| Verse of the Day (`(protected)/verse.tsx`) | Replace teal gradient + Lora with warm system: blush/charcoal verse card, Newsreader verse, terracotta toggle/switch, muted reminder card. |
| Generate + Generated Sermon (`components/SermonModal.tsx`) | Cream modal, serif title, muted section cards, terracotta copy/update actions, muted "Choose Card Color" swatches. |
| Mood check-in (`components/MoodModal.tsx`) | Muted outline mood tiles (selected = terracotta outline + dot), terracotta primary buttons, chips. |
| Mood calendar (`(tabs)/mood.tsx`) | Warm calendar surface, terracotta selection, muted distribution bars. |
| Profile (`(tabs)/profile.tsx`) | New tab screen from drawer content; terracotta/danger actions; real Terms/Privacy links (still `sermonmate.bobakdevs.com` — a known pre-Play follow-up, unchanged here). |
| Login / Sign-up (`(public)/login.tsx`, `sign-up.tsx`) | Extend warm system: paper bg, serif wordmark/headline, Work Sans fields, terracotta primary button. |
| Onboarding (`components/Onboarding.native.tsx`) | Warm slides, terracotta pagination/CTA. |
| Toasts / modals / confirmations (`components/Toast*`, `ConfirmationModal`) | Recolor to warm system. |

## Removals

- Dark Mode toggle + all `isDark` / `getStyles(isDark)` branching across screens.
- `lib/stores/theme.ts` dark logic — simplify or remove (screens read static tokens). If removed, delete its usages.
- Lora font.
- `components/ProfileDrawer.tsx` (content migrated to Profile tab).
- `utils/colors.ts` iOS palette usages migrate to `theme.color` (delete once unreferenced).

## Data flow / behavior

Pure presentational change — no backend, store-shape, or navigation-*data* changes beyond the tab restructure. All existing features (auth, sermon generation, mood, verse, reminders) keep working; only their presentation and entry points (drawer→tab) change.

## Error handling

No new error paths. Preserve existing try/catch + toast patterns while restyling. Font-load failure keeps the existing splash-gate fallback (render proceeds without blocking).

## Testing

No automated test framework (established constraint); none added. Per screen: `npx tsc --noEmit` + `npm run lint` with no new errors. Then an on-device pass (Waydroid): every restyled screen renders in the warm system, the bottom tab bar navigates Home/Mood/Profile, mood check-in opens from the Mood tab, profile actions work from the Profile tab, sign-out/auth screens render correctly, and no dark-mode remnants remain.

## Notes for later phases (not in scope)

- **Groups** (phase 2): add the Groups tab (2nd position), switch Home to direction 1b.
- **Wallpapers** (phase 3): wire the "Create a Wallpaper" entry point; wallpaper gallery + editor + social share.
