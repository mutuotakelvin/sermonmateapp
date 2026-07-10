# Visual Redesign (Warm Editorial System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin every existing screen onto a warm editorial design system (paper + terracotta, Newsreader + Work Sans, muted cards) and adopt a bottom tab bar — light-only, no behavior changes.

**Architecture:** A single design-tokens module (`lib/theme.ts`) + a small primitives library (`components/ui/`) become the one source of truth. Each screen is then *refactored onto* those tokens/primitives (not rewritten): swap hardcoded colors/fonts for tokens, use primitives, and remove all `isDark`/dark-mode branching. A visible bottom tab bar (Home · Mood · Profile) replaces the hidden-tabs + hamburger-drawer navigation. Spec: `docs/superpowers/specs/2026-07-10-visual-redesign-design.md`.

**Tech Stack:** Expo SDK 54 / expo-router 6, React Native 0.81, `@expo-google-fonts/newsreader`, `@expo-google-fonts/work-sans`, expo-font, Zustand.

## Global Constraints

- **Light-only.** Remove the Dark Mode toggle and ALL `isDark` / `getStyles(isDark)` branching. Every screen renders with the static tokens below. Files currently branching on `isDark`/`useThemeStore`: `app/(protected)/(tabs)/home.tsx`, `app/(protected)/(tabs)/profile.tsx`, `app/(protected)/mood-history.tsx`, `app/(protected)/verse.tsx`, `components/ProfileDrawer.tsx`, `components/ConfirmationModal.tsx`, `components/VerseOfDayCard.tsx`.
- **This is a reskin, not a rewrite.** Preserve every screen's existing behavior, data flow, handlers, and copy. Only change presentation (colors, fonts, spacing, layout to match the mockup) and the drawer→tab navigation. Do NOT touch `lib/sermonApi.ts`, `lib/stores/auth.ts`, `lib/verses.ts`, `lib/notifications.ts`, `functions/`, or firebase config.
- **NO automated test framework** exists and none is added. "Verify" = `npx tsc --noEmit` and `npm run lint` with NO NEW errors vs baseline. Current baseline after the daily-verse branch: **1 pre-existing tsc error** (`app/(public)/onboarding.tsx` — `Cannot find module '@/components/Onboarding'`, resolves on native) and **21 lint problems (4 errors, 17 warnings)**. Only ensure your change adds none. (Task 11 fixes the onboarding module error as a side effect.)
- Install RN/Expo packages with `npx expo install` (installs run through Bun on this machine — fine). If an install hangs >3 min, kill/retry once, then report BLOCKED.
- **Design tokens (exact values — use verbatim from `lib/theme.ts`, never hardcode hex in screens):** paper `#F2EDE4`, surface `#FBF8F2`, surfaceAlt `#EDE6DA`, border `#E2D9CB`, accent `#B0532F`, accentText `#FBF8F2`, text `#2A2420`, textMuted `#7A6E62`, sage `#7F9370`, dustyBlue `#7FA0C4`, sand `#D8CBB0`, rust `#A9503C`, deepBlue `#4E6B87`, olive `#8E9E72`, blush `#EFD8CC`, charcoal `#2E2A25`, danger `#B23B2E`.
- **Fonts:** Newsreader (serif — display/verses), Work Sans (all UI). No Lora, no system-font UI text.
- **Icons:** `@expo/vector-icons` (Ionicons) only — never emoji as UI icons.
- **Mockups to match** are committed at `docs/superpowers/mockups/redesign-home-mood-sermon.png` (Home 1a/1b, Mood check-in, Generated Sermon) and `docs/superpowers/mockups/redesign-verse-calendar.png` (Verse of Day, Mood Calendar). Screen tasks below say which to Read.

---

### Task 1: Design tokens + fonts

**Files:**
- Create: `lib/theme.ts`
- Modify: `app/_layout.tsx` (swap Lora → Newsreader + Work Sans in the existing `useFonts` splash-gate)
- Modify: `package.json` (via `npx expo install`)

**Interfaces:**
- Consumes: nothing.
- Produces: `import { theme, textVariants } from '@/lib/theme'` — `theme.color.*`, `theme.font.*`, `theme.space.*`, `theme.radius.*`; `textVariants` keyed `display|verse|title|body|caption|label`. Font families loaded app-wide: `Newsreader_500Medium`, `Newsreader_500Medium_Italic`, `WorkSans_400Regular`, `WorkSans_500Medium`, `WorkSans_600SemiBold`.

- [ ] **Step 1: Install fonts**

Run: `npx expo install @expo-google-fonts/newsreader @expo-google-fonts/work-sans`

- [ ] **Step 2: Create `lib/theme.ts`**

```ts
import type { TextStyle } from 'react-native';

export const theme = {
  color: {
    paper: '#F2EDE4',
    surface: '#FBF8F2',
    surfaceAlt: '#EDE6DA',
    border: '#E2D9CB',
    accent: '#B0532F',
    accentText: '#FBF8F2',
    text: '#2A2420',
    textMuted: '#7A6E62',
    sage: '#7F9370',
    dustyBlue: '#7FA0C4',
    sand: '#D8CBB0',
    rust: '#A9503C',
    deepBlue: '#4E6B87',
    olive: '#8E9E72',
    blush: '#EFD8CC',
    charcoal: '#2E2A25',
    danger: '#B23B2E',
  },
  font: {
    serif: 'Newsreader_500Medium',
    serifItalic: 'Newsreader_500Medium_Italic',
    sans: 'WorkSans_400Regular',
    sansMedium: 'WorkSans_500Medium',
    sansSemibold: 'WorkSans_600SemiBold',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 10, md: 16, lg: 20, pill: 999 },
} as const;

export const textVariants: Record<
  'display' | 'verse' | 'title' | 'body' | 'caption' | 'label',
  TextStyle
> = {
  display: { fontFamily: theme.font.serif, fontSize: 26, lineHeight: 32, color: theme.color.text },
  verse: { fontFamily: theme.font.serifItalic, fontSize: 20, lineHeight: 30, color: theme.color.text },
  title: { fontFamily: theme.font.sansSemibold, fontSize: 18, lineHeight: 24, color: theme.color.text },
  body: { fontFamily: theme.font.sans, fontSize: 15, lineHeight: 22, color: theme.color.text },
  caption: { fontFamily: theme.font.sans, fontSize: 12, lineHeight: 16, color: theme.color.textMuted },
  label: {
    fontFamily: theme.font.sansSemibold, fontSize: 11, lineHeight: 14,
    color: theme.color.textMuted, letterSpacing: 1.5, textTransform: 'uppercase',
  },
};
```

- [ ] **Step 3: Load the fonts in `app/_layout.tsx`**

In `app/_layout.tsx`, replace the Lora import and `useFonts` call. Change:

```tsx
import { Lora_500Medium, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
```
to:
```tsx
import { Newsreader_500Medium, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, useFonts } from '@expo-google-fonts/work-sans';
```
and change the hook:
```tsx
const [fontsLoaded, fontError] = useFonts({ Lora_500Medium, Lora_600SemiBold });
```
to:
```tsx
const [fontsLoaded, fontError] = useFonts({
  Newsreader_500Medium,
  Newsreader_500Medium_Italic,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
});
```
Leave the rest of `_layout.tsx` (splash gate, notification bootstrap, deep link) unchanged.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → Expected: `1` (baseline). Run: `npm run lint 2>&1 | tail -2` → baseline (4 errors / 17 warnings). Note: the verse screen/card still reference `Lora_500Medium` (now unloaded) → they fall back to system font until Tasks 4/5 restyle them; acceptable mid-plan.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts app/_layout.tsx package.json package-lock.json bun.lockb 2>/dev/null; git add -A
git commit -m "Add warm design tokens; load Newsreader + Work Sans (drop Lora)"
```

---

### Task 2: UI primitives

**Files:**
- Create: `components/ui/Screen.tsx`, `components/ui/AppText.tsx`, `components/ui/Card.tsx`, `components/ui/PrimaryButton.tsx`, `components/ui/Chip.tsx`

**Interfaces:**
- Consumes: `theme`, `textVariants` (Task 1).
- Produces (used by all screen tasks):
  - `<Screen>` — `{ children, style? }`: paper-bg `SafeAreaView`, `flex:1`, `paddingHorizontal: theme.space.lg`.
  - `<AppText variant style ...Text props>` — `variant: keyof typeof textVariants` (default `'body'`); merges `textVariants[variant]` then `style`.
  - `<Card tone? style children>` — `tone?: keyof typeof theme.color` (default surface); `borderRadius: theme.radius.md`, `padding: theme.space.lg`, border when untoned.
  - `<PrimaryButton onPress label loading? disabled? style>` — terracotta fill, `accentText` label (Work Sans semibold), height 52, `radius.md`, spinner when `loading`, dimmed when `disabled`.
  - `<Chip label selected onPress>` — pill; selected → accent fill + accentText; else surfaceAlt + text.

- [ ] **Step 1: Create the primitives**

`components/ui/Screen.tsx`:
```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

export default function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.paper },
  inner: { flex: 1, paddingHorizontal: theme.space.lg },
});
```

`components/ui/AppText.tsx`:
```tsx
import React from 'react';
import { Text, TextProps } from 'react-native';
import { textVariants } from '@/lib/theme';

type Variant = keyof typeof textVariants;
export default function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[textVariants[variant], style]} />;
}
```

`components/ui/Card.tsx`:
```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

type Tone = keyof typeof theme.color;
export default function Card({ children, tone, style }: { children: React.ReactNode; tone?: Tone; style?: ViewStyle }) {
  const toned = tone ? { backgroundColor: theme.color[tone] } : styles.surface;
  return <View style={[styles.base, toned, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  base: { borderRadius: theme.radius.md, padding: theme.space.lg },
  surface: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
});
```

`components/ui/PrimaryButton.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';
import AppText from './AppText';

export default function PrimaryButton({
  label, onPress, loading, disabled, style,
}: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} style={[styles.btn, off && styles.off, style]}>
      {loading
        ? <ActivityIndicator color={theme.color.accentText} />
        : <AppText style={styles.label}>{label}</AppText>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.5 },
  label: { fontFamily: theme.font.sansSemibold, fontSize: 16, color: theme.color.accentText },
});
```

`components/ui/Chip.tsx`:
```tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import AppText from './AppText';

export default function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.sel : styles.unsel]}>
      <AppText style={{ fontFamily: theme.font.sansMedium, fontSize: 14, color: selected ? theme.color.accentText : theme.color.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  chip: { height: 40, paddingHorizontal: theme.space.lg, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  sel: { backgroundColor: theme.color.accent },
  unsel: { backgroundColor: theme.color.surfaceAlt },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `1`. Run: `npm run lint 2>&1 | tail -2` → baseline.

- [ ] **Step 3: Commit**

```bash
git add components/ui
git commit -m "Add UI primitives (Screen, AppText, Card, PrimaryButton, Chip)"
```

---

### Task 3: Bottom tab navigation (Home · Mood · Profile)

**Files:**
- Modify: `app/(protected)/(tabs)/_layout.tsx` (visible bottom tab bar)
- Create: `app/(protected)/(tabs)/mood.tsx` (new Mood tab — moves the mood-history screen)
- Delete: `app/(protected)/mood-history.tsx` (content relocated to the Mood tab)
- Modify: `app/(protected)/(tabs)/profile.tsx` (un-hide as a tab; absorb the drawer's extra content)
- Delete: `components/ProfileDrawer.tsx` (retired)
- Modify: `app/(protected)/(tabs)/home.tsx` (remove the hamburger button + `ProfileDrawer` usage ONLY — full home restyle is Task 4)

**Interfaces:**
- Consumes: `theme` (Task 1).
- Produces: three tabs routed via expo-router — `home`, `mood`, `profile`. Route to the mood tab with `router.push('/(protected)/(tabs)/mood' as never)`. A commented seam marks where the **Groups** tab (2nd position) is added in phase 2.

Context: today `(tabs)/_layout.tsx` hides the tab bar and only registers `home`; `profile.tsx` is hidden (`href: null`); mood lives at `app/(protected)/mood-history.tsx` and is opened via `router.push('/mood-history')`; the hamburger in `home.tsx` opens `components/ProfileDrawer.tsx`. This task makes the tab bar visible and relocates mood + profile into tabs.

- [ ] **Step 1: Move the mood screen into a tab**

```bash
git mv "app/(protected)/mood-history.tsx" "app/(protected)/(tabs)/mood.tsx"
```
Then, in the moved `mood.tsx`, update any self-referential route strings and the default export name to `MoodTab` (keep all logic/behavior). Fix any relative import paths broken by the move (imports of `@/...` are unaffected; only `../`-relative ones, if any, change). Do NOT restyle yet (Task 8).

- [ ] **Step 2: Repoint mood navigation**

Find callers of the old route and update them:
```bash
grep -rn "mood-history" app components --include="*.tsx"
```
Replace each `router.push('/mood-history')` (and any `href="/mood-history"`) with `router.push('/(protected)/(tabs)/mood' as never)`. (The "More" link in `home.tsx`'s weekly-mood section and the `MoodModal` completion path are the likely call sites.)

- [ ] **Step 3: Absorb ProfileDrawer content into the Profile tab**

`components/ProfileDrawer.tsx` (retired) contains, beyond what `(tabs)/profile.tsx` already has: **Report Issue**, **Delete Account**, **Sign Out**, **Terms & Conditions / Privacy Policy** links, **Version** text ("Powered by bobakdevs"), and a **Dark Mode** toggle. Move all of these into `app/(protected)/(tabs)/profile.tsx` EXCEPT the Dark Mode toggle (dropped — light-only). Preserve the exact URLs and handlers (`Linking.openURL('https://sermonmate.bobakdevs.com/terms')` etc. stay as-is). This task just relocates the content and wires it; visual polish is Task 9.

- [ ] **Step 4: Remove the hamburger + drawer from home**

In `app/(protected)/(tabs)/home.tsx`: delete the `ProfileDrawer` import, the `drawerVisible` state, the `<ProfileDrawer .../>` element, and the menu `Pressable` (the `Ionicons name="menu"` button). Leave the rest of home untouched (Task 4 restyles it). Then delete the file:
```bash
git rm components/ProfileDrawer.tsx
```

- [ ] **Step 5: Make the tab bar visible with three tabs**

Replace `app/(protected)/(tabs)/_layout.tsx` with:
```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { theme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: theme.font.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      {/* PHASE 2 SEAM: add the Groups tab here (2nd position):
          <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ... }} /> */}
      <Tabs.Screen name="mood" options={{ title: 'Mood', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Verify**

Run: `grep -rn "ProfileDrawer\|mood-history" app components --include="*.tsx"` → Expected: no output (all references gone). Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `1`. Run: `npm run lint 2>&1 | tail -2` → no new problems.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Adopt bottom tab bar (Home/Mood/Profile); retire hamburger drawer and mood-history route"
```

---

> **Screen-restyle tasks (4–11): shared method.** Each task refactors ONE existing screen/component onto the design system. The implementer MUST:
> 1. **Read its mockup image** (named per task) to match layout/hierarchy.
> 2. Replace every hardcoded color with a `theme.color.*` token and every font with `theme.font.*` (or use `<AppText variant>`).
> 3. Use primitives (`Screen`, `Card`, `PrimaryButton`, `Chip`, `AppText`) where they fit; keep bespoke layout in local `StyleSheet` using tokens.
> 4. **Delete all `isDark` / `useThemeStore` / `getStyles(isDark)` branching** — styles become static.
> 5. **Preserve all behavior, handlers, state, and copy.** No logic changes.
> 6. Never use emoji as icons; keep Ionicons.
> Verify each with `npx tsc --noEmit` (≤ baseline 1 error) + `npm run lint` (no new problems).

### Task 4: Home screen (direction 1a)

**Files:** Modify `app/(protected)/(tabs)/home.tsx`
**Mockup:** Read `docs/superpowers/mockups/redesign-home-mood-sermon.png` — the LEFT phone in the top row ("Good evening, Kelvin").

**Interfaces:** Consumes theme + primitives + the existing `VerseOfDayCard` (restyled in Task 5). No exported interface.

- [ ] **Step 1: Restyle home to direction 1a**

Apply, matching the mockup:
- `<Screen>` paper background; greeting **"Good evening, {firstName}"** in `AppText variant="display"` (Newsreader serif), subtitle in `caption`. No hamburger (removed in Task 3).
- Keep `<VerseOfDayCard />` at top (it restyles itself in Task 5).
- "Generate a sermon" in a `Card`: `title` label, the `TextInput` (border `theme.color.border`, text `theme.color.text`, Work Sans), and a **circular terracotta send button** (`theme.color.accent`, `Ionicons name="arrow-up"`). Chips row uses `<Chip>` — the "Mood" chip stays visually distinct (accent-filled) and opens the mood flow; topic chips (Hope/Faith/Healing/Gratitude) are `<Chip>`.
- "This Week's Mood" `Card` — recolor the weekday dots to muted tokens; replace the mood-color map (currently bright `#FCD34D` etc.) with muted palette tokens (`sage`/`dustyBlue`/`sand`/`rust`/`deepBlue`/`olive`/`blush`/`accent`), keeping one distinct color per mood. "More" link → `theme.color.accent`, routes to the Mood tab.
- "My Sermons" grid: replace the bright `COLOR_OPTIONS` gradient list with muted solid `Card tone` backgrounds (map the 6 color ids to muted tokens: `1→sage, 2→sand, 3→dustyBlue, 4→olive, 5→blush, 6→rust`); card title in serif `display`-ish (size ~18) on the tone, description in body. Keep delete button + press handlers.
- Add a **"Create a Wallpaper"** row (a `Card` with an icon + "Create a Wallpaper" + chevron) that currently does nothing — `onPress` shows a toast `showSuccess('Coming soon', 'Wallpapers arrive in a future update')`. (Placeholder per spec; phase 3 wires it.)
- Remove all `isDark`/`getStyles(isDark)`; make styles static with tokens.

- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add "app/(protected)/(tabs)/home.tsx" && git commit -m "Restyle Home (direction 1a) onto warm system"`

---

### Task 5: Verse of the Day screen + home card

**Files:** Modify `app/(protected)/verse.tsx`, `components/VerseOfDayCard.tsx`
**Mockup:** Read `docs/superpowers/mockups/redesign-verse-calendar.png` — the LEFT phone ("Verse of the Day", dark verse card).

- [ ] **Step 1: Restyle both**
- `verse.tsx`: `<Screen>`; header "Verse of the Day" in `display` serif + date in `caption`. Replace the teal `LinearGradient` hero with a **solid charcoal `Card tone="charcoal"`**; verse text in `AppText variant="verse"` colored `theme.color.paper`/cream; reference as `label` at ~90% cream; share/copy as circular buttons on a translucent cream overlay. WEB/KJV segmented control: selected segment = `theme.color.accent`/charcoal fill per mockup, using tokens. Reminder `Card` (surface) with the `Switch` (`trackColor` accent), time value in `theme.color.accent`. Remove the `LinearGradient` import if now unused; delete `isDark` branching. Keep all handlers (share/copy/toggle/time/reschedule) and the permission-note logic.
- `VerseOfDayCard.tsx`: match the home mockup's blush verse card — `Card tone="blush"` (or charcoal to match 1b later; use **blush** for 1a), snippet in `AppText variant="verse"` (size ~15) `theme.color.text`, reference `label`, "Read today's verse" + chevron in `theme.color.accent`. Remove gradient + `isDark`.

- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add "app/(protected)/verse.tsx" components/VerseOfDayCard.tsx && git commit -m "Restyle Verse of the Day screen + home card onto warm system"`

---

### Task 6: Sermon modal (generate + generated sermon)

**Files:** Modify `components/SermonModal.tsx`
**Mockup:** Read `docs/superpowers/mockups/redesign-home-mood-sermon.png` — the RIGHT phone in the SECOND row ("Generated Sermon").

- [ ] **Step 1: Restyle** — cream/paper modal; "Generated Sermon" header in `display` serif; Title field, and Verses/Sermon/Story collapsible sections as `Card`s with `title` headers and `body` content; **Copy** actions in `theme.color.accent` with Ionicons; "Choose Card Color" swatches recolored to the muted palette tokens (`sage/sand/dustyBlue/olive/blush/rust`); primary action ("Save"/"Update Sermon") as `<PrimaryButton>`. Preserve all save/update/collapse logic and props. Remove any `isDark`.
- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add components/SermonModal.tsx && git commit -m "Restyle sermon modal onto warm system"`

---

### Task 7: Mood check-in modal

**Files:** Modify `components/MoodModal.tsx`
**Mockup:** Read `docs/superpowers/mockups/redesign-home-mood-sermon.png` — the LEFT phone in the SECOND row ("How do you feel today?").

- [ ] **Step 1: Restyle** — "How do you feel today?" header; the 8 mood tiles become **muted outline tiles on paper** (surface background, `theme.color.border`; **selected = terracotta border + terracotta check/dot**) instead of bright gradient fills — match the mockup's restrained look. Reason chips → `<Chip>`. Primary buttons ("Next"/"Generate Encouragement") → `<PrimaryButton>`. Pager dots + the progress use `theme.color.accent`. Keep the mood/reason/customReason state, the `generateMoodSermon` call, and the completion flow. Remove `isDark`.
- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add components/MoodModal.tsx && git commit -m "Restyle mood check-in onto warm system"`

---

### Task 8: Mood tab (calendar + history)

**Files:** Modify `app/(protected)/(tabs)/mood.tsx`
**Mockup:** Read `docs/superpowers/mockups/redesign-verse-calendar.png` — the RIGHT phone ("Mood Calendar").

- [ ] **Step 1: Restyle** — `<Screen>`; "Mood Calendar" `display` header; `react-native-calendars` themed to the warm palette (paper/surface bg, `theme.color.text` day text, **selected day = terracotta ring**, today marker in accent); "Statistics" as two `Card`s (Total Entries, Most Common) with serif numbers; "Mood Distribution" bars recolored to the muted per-mood tokens. Add a prominent **"How do you feel today?"** `PrimaryButton` (or card) at the top that opens `MoodModal` (the check-in entry point for the tab). Preserve all data loading, the day-detail modal, and delete/handlers. Remove `isDark`.
- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add "app/(protected)/(tabs)/mood.tsx" && git commit -m "Restyle Mood tab (calendar + history) onto warm system"`

---

### Task 9: Profile tab

**Files:** Modify `app/(protected)/(tabs)/profile.tsx`
**Mockup:** none (extend the system). Match the drawer content shown in the app today, warm-styled.

- [ ] **Step 1: Restyle** — `<Screen>`; avatar circle in `theme.color.accent` with initial; name in `display`, email in `caption`. A "Settings"/account section as `Card`(s). Actions: **Report Issue** (surface card + Ionicons), **Delete Account** (danger outline), **Sign Out** (`theme.color.danger` filled). **Terms & Conditions / Privacy Policy** links in `theme.color.textMuted` (URLs unchanged), Version + "Powered by bobakdevs" as `caption`. No Dark Mode toggle. Preserve `logout`, delete-account, report, and link handlers.
- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add "app/(protected)/(tabs)/profile.tsx" && git commit -m "Restyle Profile tab onto warm system"`

---

### Task 10: Auth screens (login + sign-up)

**Files:** Modify `app/(public)/login.tsx`, `app/(public)/sign-up.tsx`
**Mockup:** none (extend the system).

- [ ] **Step 1: Restyle both** — `<Screen>` paper bg; a serif **"SermonMate"** wordmark / welcome headline in `display`; form fields styled like the app inputs (surface bg, `theme.color.border`, Work Sans, textMuted placeholders); primary action (Sign in / Create account) as `<PrimaryButton>`; the switch-link ("Don't have an account? Sign up") in `theme.color.accent`. Preserve all form state, validation, `login`/`register` calls, and error toasts. Remove any `isDark`.
- [ ] **Step 2: Verify** — tsc ≤1, lint no-new.
- [ ] **Step 3: Commit** — `git add "app/(public)/login.tsx" "app/(public)/sign-up.tsx" && git commit -m "Restyle auth screens onto warm system"`

---

### Task 11: Onboarding + shared components

**Files:** Modify `components/Onboarding.native.tsx`, `components/Toast.tsx`, `components/ConfirmationModal.tsx`, `components/Button.tsx`; Create `components/Onboarding.tsx`
**Mockup:** none (extend the system).

- [ ] **Step 1: Restyle onboarding** — warm slides (paper bg, `display` serif headlines, `body` copy), terracotta pagination dots + CTA (`<PrimaryButton>`). Preserve the pager + "Onboarding completed" logic.
- [ ] **Step 2: Fix the onboarding module resolution (clears the 1 baseline tsc error)** — the pre-existing tsc error is `app/(public)/onboarding.tsx` importing `@/components/Onboarding` when only `Onboarding.native.tsx` exists. Create a thin `components/Onboarding.tsx` that re-exports the native one so the module resolves on all platforms:
```tsx
// Web/default fallback so the module resolves for tsc and web bundling.
// Native uses Onboarding.native.tsx automatically.
export { default } from './Onboarding.native';
```
- [ ] **Step 3: Restyle shared components** — `Toast.tsx` (success = `theme.color.sage`/accent, error = `theme.color.danger`, Work Sans), `ConfirmationModal.tsx` (surface card, danger action, remove `isDark`), `Button.tsx` (route it through the token colors or replace usages with `PrimaryButton` — keep its existing API so callers don't break).
- [ ] **Step 4: Verify** — Run `npx tsc --noEmit 2>&1 | grep -c "error TS"` → Expected: **`0`** (the onboarding fix clears the last baseline error). Run `npm run lint 2>&1 | tail -2` → no new problems.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Restyle onboarding + shared components; fix onboarding module resolution"`

---

### Task 12: Remove dark-mode plumbing + final cleanup

**Files:** Modify/Delete `lib/stores/theme.ts`; sweep for stragglers; `utils/colors.ts`

**Interfaces:** After Tasks 4–11 no screen should branch on `isDark`. This task removes the now-dead theming plumbing.

- [ ] **Step 1: Confirm no screen still uses the theme store or isDark**

Run: `grep -rn "useThemeStore\|isDark\|getStyles\|initializeTheme\|toggleTheme" app components --include="*.tsx"`
Expected: no output. If any remain, fix those files (same reskin rules) before continuing.

- [ ] **Step 2: Remove the theme store**

```bash
git rm lib/stores/theme.ts
```
Then `grep -rn "stores/theme" app components lib --include="*.ts" --include="*.tsx"` → fix any remaining import (should be none after Step 1).

- [ ] **Step 3: Retire the old iOS color palette if unused**

Run: `grep -rn "utils/colors" app components lib --include="*.ts" --include="*.tsx"`. For each remaining usage, replace `colors.primary` etc. with the matching `theme.color.*`. If the grep is then empty, `git rm utils/colors.ts`; otherwise leave it.

- [ ] **Step 4: Verify** — `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`. `npm run lint 2>&1 | tail -2` → no new problems. `grep -rn "isDark\|useThemeStore" app components` → no output.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "Remove dark-mode theme store and legacy iOS color palette"`

---

### Task 13: Manual on-device pass (human)

No files. Requires a fresh dev build only if fonts didn't hot-load; otherwise Metro reload suffices (fonts are JS-loaded, so a reload usually shows them).

- [ ] 1. Every screen renders in the warm system (paper bg, terracotta accents, Newsreader headlines/verses, Work Sans UI) — no leftover blue `#007AFF`, rainbow gradients, or Lora.
- [ ] 2. **Bottom tab bar** shows Home · Mood · Profile and navigates between them; icons/labels styled.
- [ ] 3. **Mood tab** shows the calendar + "How do you feel today?" → opens the check-in flow; completing it returns correctly.
- [ ] 4. **Profile tab** (no hamburger anywhere) shows account + Report Issue / Delete / Sign Out / Terms / Privacy / version; Sign Out works.
- [ ] 5. Home 1a: greeting, verse card, generate-sermon (send works via Claude), muted mood dots, muted sermon cards, "Create a Wallpaper" shows the coming-soon toast.
- [ ] 6. Verse screen: dark charcoal verse card, WEB/KJV toggle, reminder toggle/time.
- [ ] 7. Sermon modal + mood check-in + confirmation modal + toasts all warm-styled.
- [ ] 8. Login / sign-up / onboarding warm-styled; auth still works.
- [ ] 9. No dark-mode toggle anywhere; app is uniformly light.
