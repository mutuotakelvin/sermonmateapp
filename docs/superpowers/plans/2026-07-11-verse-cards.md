# Shareable Verse Cards (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a verse or reflection into a portrait card the user can share as an image or save to Photos as a wallpaper.

**Architecture:** A pure data module (`lib/cards.ts`) + a pure presentational card (`components/ShareCard.tsx`) + an isolated native-IO module (`lib/cardCapture.ts`) + a creator screen (`app/(protected)/card.tsx`), reached from Home, the reflection reading view, and the Verse-of-the-Day screen. Capture via `react-native-view-shot`; share via `expo-sharing`; save via `expo-media-library`.

**Tech Stack:** Expo SDK 54, expo-router 6 (typed routes on), React Native 0.81, TypeScript strict, `expo-linear-gradient` (already installed), `react-native-view-shot` + `expo-media-library` + `expo-sharing` (added in Task 2).

## Global Constraints

- **Portrait 9:16 card only.** 4 themes (`cream`, `terracotta`, `dusk`, `charcoal`); position is user-selectable, exactly two values: `centered`, `bottom`. Every card shows a small `SermonMate` wordmark.
- **Non-AI feature.** No model calls, no backend/Firestore/auth changes.
- **Content comes from entry points** (Verse of the Day + reflections). No in-app text editor, no custom colors, no photo backgrounds, no square format in v1.
- **No test framework** (this project has none; forbidden to add). Verify each task with `npx tsc --noEmit` (expect 0) and `npm run lint` (baseline **14** problems — expect no new ones). Task 2 adds native modules → real verification is a human on-device pass after `npx expo run:android`; that is NOT checkable by tsc/lint and is called out as a human step.
- **Navigation uses the documented typed-routes fallback:** `router.push('/(protected)/card' as never)` (and the params-object form cast `as never`), because typed routes reject bare/new paths (see prior `verse.tsx` precedent).
- Follow existing patterns: default-exported UI primitives from `@/components/ui/*` (`AppText`, `Card`, `Screen`, `PrimaryButton`), toasts via `useToast()` (`showSuccess`/`showError`), screen scaffold like `app/(protected)/verse.tsx`.

## File structure

- Create `lib/cards.ts` — types + `CARD_THEMES` + `splitVerseString`.
- Create `components/ShareCard.tsx` — pure portrait card (forwardRef to its root `View`).
- Create `lib/cardCapture.ts` — capture/share/save helpers (only file importing the new native deps).
- Create `app/(protected)/card.tsx` — creator screen.
- Modify `app/(protected)/(tabs)/home.tsx` — "Create a card" entry.
- Modify `app/(protected)/verse.tsx` — "Create card" action.
- Modify `components/SermonModal.tsx` — "Create card" action.
- Modify `app.config.js` — add `expo-media-library` plugin.

---

### Task 1: Card data + ShareCard component

**Files:**
- Create: `lib/cards.ts`
- Create: `components/ShareCard.tsx`

**Interfaces:**
- Consumes: `@/components/ui/AppText` (default export; `<AppText variant style>` — `style` overrides variant), `expo-linear-gradient` `LinearGradient`.
- Produces: `CardContent`, `CardPosition`, `CardThemeKey`, `CARD_THEMES`, `splitVerseString(raw: string): CardContent` (from `lib/cards.ts`); `ShareCard` default export — `React.forwardRef<View, { content: CardContent; themeKey: CardThemeKey; position: CardPosition; width?: number }>`.

- [ ] **Step 1: Create `lib/cards.ts`**

```ts
export type CardContent = { text: string; reference?: string };
export type CardPosition = 'centered' | 'bottom';
export type CardThemeKey = 'cream' | 'terracotta' | 'dusk' | 'charcoal';

export interface CardTheme {
  key: CardThemeKey;
  label: string;
  gradient: [string, string]; // top -> bottom
  barColor: string;           // top accent bar
  textColor: string;          // verse text
  refColor: string;           // reference line
  wordmarkColor: string;      // SermonMate wordmark
}

// Card-specific design constants (approved in brainstorming mockups). These are a
// distinct visual surface from the in-app theme, so colors are defined explicitly here.
export const CARD_THEMES: CardTheme[] = [
  { key: 'cream',      label: 'Cream',      gradient: ['#F4EFE6', '#EBE1D2'], barColor: '#B0532F', textColor: '#2E2A26', refColor: '#B0532F', wordmarkColor: '#A08B76' },
  { key: 'terracotta', label: 'Terracotta', gradient: ['#C0623B', '#9E4526'], barColor: '#F4EFE6', textColor: '#FBF3E8', refColor: '#F0C9AE', wordmarkColor: '#F0D5C2' },
  { key: 'dusk',       label: 'Dusk',       gradient: ['#4A5B84', '#2E3350'], barColor: '#E7C98B', textColor: '#F2EFE8', refColor: '#E7C98B', wordmarkColor: '#C9CBDD' },
  { key: 'charcoal',   label: 'Charcoal',   gradient: ['#2B2724', '#171412'], barColor: '#C79A4B', textColor: '#EFE9DF', refColor: '#C79A4B', wordmarkColor: '#8F857A' },
];

// Best-effort parse of a reflection's verse string into text + optional reference.
// Recognizes a trailing "(Book c:v)" or a dash-separated "... — Book c:v" tail.
export function splitVerseString(raw: string): CardContent {
  const s = (raw ?? '').trim();
  const strip = (t: string) => t.trim().replace(/^["“”']+|["“”']+$/g, '').trim();

  const paren = s.match(/^(.*?)\s*\(([^()]*\d+:\d+[^()]*)\)\s*$/);
  if (paren) return { text: strip(paren[1]), reference: paren[2].trim() };

  const dash =
    s.match(/^(.*\S)\s*[—–]\s*([^—–]*\d+:\d+[^—–]*)$/) ||
    s.match(/^(.*\S)\s+-\s+([^-]*\d+:\d+[^-]*)$/);
  if (dash) return { text: strip(dash[1]), reference: dash[2].trim() };

  return { text: strip(s) };
}
```

Expected behavior (for the reviewer to verify by reading):
- `'"For God so loved the world." — John 3:16'` → `{ text: 'For God so loved the world.', reference: 'John 3:16' }`
- `'The Lord is my shepherd (Psalm 23:1)'` → `{ text: 'The Lord is my shepherd', reference: 'Psalm 23:1' }`
- `'Rejoice in the Lord always.'` → `{ text: 'Rejoice in the Lord always.' }` (no reference)

- [ ] **Step 2: Create `components/ShareCard.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { CARD_THEMES, type CardContent, type CardPosition, type CardThemeKey } from '@/lib/cards';

type Props = {
  content: CardContent;
  themeKey: CardThemeKey;
  position: CardPosition;
  width?: number;
};

const ShareCard = React.forwardRef<View, Props>(({ content, themeKey, position, width }, ref) => {
  const theme = CARD_THEMES.find((t) => t.key === themeKey) ?? CARD_THEMES[0];
  const w = width ?? Math.min(Dimensions.get('window').width - 48, 340);
  const h = (w * 16) / 9; // portrait 9:16

  const justifyContent = position === 'bottom' ? 'flex-end' : 'center';
  const alignItems = position === 'bottom' ? 'flex-start' : 'center';
  const textAlign = position === 'bottom' ? 'left' : 'center';

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width: w, height: h }]}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.bar, { backgroundColor: theme.barColor }]} />
      <View style={[styles.body, { justifyContent, alignItems, paddingBottom: position === 'bottom' ? h * 0.14 : 0 }]}>
        <AppText variant="verse" style={[styles.verse, { color: theme.textColor, textAlign }]}>
          {content.text}
        </AppText>
        {!!content.reference && (
          <AppText variant="label" style={[styles.reference, { color: theme.refColor, textAlign }]}>
            {content.reference}
          </AppText>
        )}
      </View>
      <AppText variant="label" style={[styles.wordmark, { color: theme.wordmarkColor }]}>SermonMate</AppText>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', position: 'relative' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  body: { flex: 1, paddingHorizontal: 28, paddingVertical: 40 },
  verse: { fontSize: 22, lineHeight: 32 },
  reference: { marginTop: 14, letterSpacing: 1 },
  wordmark: { position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 10, opacity: 0.85 },
});
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 4: Commit**

```bash
git add lib/cards.ts components/ShareCard.tsx
git commit -m "feat: add card theme data and ShareCard component"
```

---

### Task 2: Native deps + capture/share/save helpers

**Files:**
- Modify: `package.json` / `package-lock.json` (via `npx expo install`)
- Modify: `app.config.js` (plugins array)
- Create: `lib/cardCapture.ts`

**Interfaces:**
- Produces: `captureCardToFile(ref: React.RefObject<View | null>): Promise<string>`, `shareCardImage(uri: string): Promise<boolean>` (false = sharing unavailable), `saveCardImage(uri: string): Promise<'saved' | 'denied'>` (from `lib/cardCapture.ts`).

- [ ] **Step 1: Install the native dependencies**

Run: `npx expo install react-native-view-shot expo-media-library expo-sharing`
Expected: three packages added to `package.json` at SDK-54-compatible versions; `package-lock.json` updated.

- [ ] **Step 2: Register the expo-media-library config plugin**

In `app.config.js`, find the end of the plugins array:
```
      [
        "expo-notifications",
        {
          color: "#0891B2"
        }
      ]
    ],
```
Replace with (add the media-library plugin):
```
      [
        "expo-notifications",
        {
          color: "#0891B2"
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow SermonMate to save verse cards to your photos.",
          savePhotosPermission: "Allow SermonMate to save verse cards to your photos.",
          isAccessMediaLocationEnabled: false
        }
      ]
    ],
```

- [ ] **Step 3: Create `lib/cardCapture.ts`**

```ts
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type React from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Capture the referenced view to a PNG tmpfile at native pixel density
// (wallpaper-grade on modern devices). Returns the file uri.
export async function captureCardToFile(ref: React.RefObject<View | null>): Promise<string> {
  return await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
}

// Share an image file via the OS share sheet. Returns false if sharing is
// unavailable on this device (caller shows an info toast). A user-cancelled
// share resolves normally (no throw).
export async function shareCardImage(uri: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share verse card' });
  return true;
}

// Save an image file to the photo library. Requests permission first.
export async function saveCardImage(uri: string): Promise<'saved' | 'denied'> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.js lib/cardCapture.ts
git commit -m "feat: add card capture/share/save helpers and media-library plugin"
```

- [ ] **Step 6: Human step (record, do not block the plan)**

Note in your report: these are new native modules — a development rebuild (`npx expo run:android`, then launch in Waydroid) is required before the feature runs on device. This cannot be verified by tsc/lint; it is a human on-device task after the branch is complete.

---

### Task 3: Card creator screen

**Files:**
- Create: `app/(protected)/card.tsx`

**Interfaces:**
- Consumes: `ShareCard` (default), `CARD_THEMES`, `CardContent`, `CardPosition`, `CardThemeKey` (from `@/lib/cards`); `captureCardToFile`, `shareCardImage`, `saveCardImage` (from `@/lib/cardCapture`); `bundledVerseSource` (from `@/lib/verses`); `useVerseStore` (from `@/lib/stores/verse`, provides `translation`); `useToast`; `Screen`, `AppText`, `PrimaryButton` from `@/components/ui/*`.
- Produces: the `/(protected)/card` route. Reads params `{ text?: string; reference?: string }` via `useLocalSearchParams`.

- [ ] **Step 1: Create `app/(protected)/card.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Screen from '@/components/ui/Screen';
import { useToast } from '@/components/ToastProvider';
import ShareCard from '@/components/ShareCard';
import { CARD_THEMES, type CardContent, type CardPosition, type CardThemeKey } from '@/lib/cards';
import { captureCardToFile, saveCardImage, shareCardImage } from '@/lib/cardCapture';
import { theme } from '@/lib/theme';
import { bundledVerseSource } from '@/lib/verses';
import { useVerseStore } from '@/lib/stores/verse';

const POSITIONS: { key: CardPosition; label: string }[] = [
  { key: 'centered', label: 'Centered' },
  { key: 'bottom', label: 'Bottom' },
];

export default function CardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string; reference?: string }>();
  const { translation } = useVerseStore();
  const { showSuccess, showError, showInfo } = useToast();

  const content: CardContent = useMemo(() => {
    if (params.text) return { text: params.text, reference: params.reference || undefined };
    const v = bundledVerseSource.getVerseForDate(new Date());
    return { text: v.text[translation], reference: v.reference };
  }, [params.text, params.reference, translation]);

  const [themeKey, setThemeKey] = useState<CardThemeKey>('cream');
  const [position, setPosition] = useState<CardPosition>('centered');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const onShare = async () => {
    setBusy(true);
    try {
      const uri = await captureCardToFile(cardRef);
      const ok = await shareCardImage(uri);
      if (!ok) showInfo('Sharing unavailable', 'This device cannot share files.');
    } catch {
      showError('Share failed', 'Could not create the card image.');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const uri = await captureCardToFile(cardRef);
      const result = await saveCardImage(uri);
      if (result === 'saved') showSuccess('Saved', 'The card is in your Photos.');
      else showError('Permission needed', 'Allow photo access to save cards.');
    } catch {
      showError('Save failed', 'Could not save the card image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">Create a card</AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <ShareCard ref={cardRef} content={content} themeKey={themeKey} position={position} />
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Theme</AppText>
        <View style={styles.themeRow}>
          {CARD_THEMES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setThemeKey(t.key)}
              style={[
                styles.swatch,
                { backgroundColor: t.gradient[0], borderColor: themeKey === t.key ? theme.color.accent : theme.color.border },
              ]}
            >
              {themeKey === t.key && <Ionicons name="checkmark" size={18} color={t.textColor} />}
            </Pressable>
          ))}
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Position</AppText>
        <View style={styles.segment}>
          {POSITIONS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPosition(p.key)}
              style={[styles.segmentItem, position === p.key && styles.segmentItemActive]}
            >
              <AppText style={[styles.segmentText, position === p.key && styles.segmentTextActive]}>{p.label}</AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Share" onPress={onShare} loading={busy} style={styles.shareBtn} />
          <Pressable onPress={onSave} disabled={busy} style={styles.saveBtn}>
            {busy ? (
              <ActivityIndicator color={theme.color.accent} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={theme.color.accent} />
                <AppText style={styles.saveBtnText}>Save to Photos</AppText>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.space.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: theme.space.xxl, gap: theme.space.lg },
  preview: { alignItems: 'center', marginTop: theme.space.md },
  sectionLabel: { marginBottom: -theme.space.sm },
  themeRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: { width: 48, height: 48, borderRadius: theme.radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: theme.color.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.pill },
  segmentItemActive: { backgroundColor: theme.color.surface },
  segmentText: { color: theme.color.textMuted },
  segmentTextActive: { color: theme.color.text },
  actions: { gap: theme.space.md, marginTop: theme.space.sm },
  shareBtn: { width: '100%' },
  saveBtn: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.accent },
  saveBtnText: { color: theme.color.accent, fontFamily: theme.font.sansSemibold },
});
```

Note on `theme` import: `lib/theme.ts` exports `theme` (used across the app as `import { theme } from '@/lib/theme'` — confirm the existing import style in `home.tsx` and match it; if it is a default export there, mirror that).

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors. (If typed-routes complains about the new route, it resolves once the file exists; a stale `.expo/types` can be refreshed with `npx expo customize tsconfig.json`-free by re-running `npx tsc` after `npx expo start` regenerates types — but a plain `tsc` should pass since `card.tsx` is a valid screen.)

Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 3: Commit**

```bash
git add app/\(protected\)/card.tsx
git commit -m "feat: add card creator screen"
```

---

### Task 4: Entry points

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`
- Modify: `app/(protected)/verse.tsx`
- Modify: `components/SermonModal.tsx`

**Interfaces:**
- Consumes: the `/(protected)/card` route (Task 3); `splitVerseString` (from `@/lib/cards`); each file's existing `router`/verse data.

- [ ] **Step 1: Home — route the "Create a card" entry**

In `app/(protected)/(tabs)/home.tsx`, the wallpaper entry currently reads:
```
        {/* Create a Wallpaper */}
        <Pressable
          onPress={() => showSuccess('Coming soon', 'Wallpapers arrive in a future update')}
          style={styles.wallpaperRow}
        >
          <Card style={styles.wallpaperCard}>
            <View style={styles.wallpaperContent}>
              <View style={styles.wallpaperIconWrap}>
                <Ionicons name="image-outline" size={22} color={theme.color.accent} />
              </View>
              <AppText variant="body" style={styles.wallpaperLabel}>Create a Wallpaper</AppText>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>
```
Replace the `onPress` and label with a route + new copy (leave the styles/structure):
```
        {/* Create a card */}
        <Pressable
          onPress={() => router.push('/(protected)/card' as never)}
          style={styles.wallpaperRow}
        >
          <Card style={styles.wallpaperCard}>
            <View style={styles.wallpaperContent}>
              <View style={styles.wallpaperIconWrap}>
                <Ionicons name="image-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.wallpaperText}>
                <AppText variant="body" style={styles.wallpaperLabel}>Create a card</AppText>
                <AppText variant="caption" style={styles.wallpaperSub}>Share a verse or save it as a wallpaper</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>
```
Then add these two style keys inside the `StyleSheet.create({ ... })` block, next to `wallpaperLabel`:
```
  wallpaperText: {
    flex: 1,
    gap: 2,
  },
  wallpaperSub: {
    color: theme.color.textMuted,
  },
```
And, because `wallpaperLabel` may have `flex: 1` for the old single-line layout, ensure it does NOT keep `flex: 1` (the wrapping `wallpaperText` now owns the flex). If `wallpaperLabel` contains `flex: 1`, remove only that property; keep its font/size. `router` is already defined in this file (used by the mood "More" button) — do not add an import.

- [ ] **Step 2: Verse screen — add a "Create card" action**

In `app/(protected)/verse.tsx`, `router`, `verse`, and `translation` already exist (see `handleShare`). Add a handler near `handleShare`:
```tsx
  const handleCreateCard = () => {
    router.push({
      pathname: '/(protected)/card',
      params: { text: verse.text[translation], reference: verse.reference },
    } as never);
  };
```
Then, next to the existing share action button (the `Pressable` calling `handleShare`), add a sibling action:
```tsx
            <Pressable onPress={handleCreateCard} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="image-outline" size={22} color={theme.color.text} />
            </Pressable>
```
(Reuse the existing `styles.actionButton`; `Ionicons` is already imported in this file.)

- [ ] **Step 3: Reflection reading view — add a "Create card" action**

In `components/SermonModal.tsx`, add the router and helper import at the top with the other imports:
```tsx
import { useRouter } from 'expo-router';
import { splitVerseString } from '@/lib/cards';
```
Inside the component body (near the other hooks like `useToast()`), add:
```tsx
  const router = useRouter();
```
Add a handler (near `handleShare`):
```tsx
  const handleCreateCard = () => {
    const first = displaySermon?.verses?.[0];
    if (!first) return;
    const c = splitVerseString(first);
    onClose(); // close the full-screen modal so the card route is visible beneath it
    router.push({
      pathname: '/(protected)/card',
      params: { text: c.text, reference: c.reference ?? '' },
    } as never);
  };
```
Then, in the loaded (non-loading) content — next to the sticky-bar share button (the `Pressable` calling `handleShare` around the save bar) — add a sibling icon button, shown only when there is a verse:
```tsx
              {!!displaySermon?.verses?.length && (
                <Pressable onPress={handleCreateCard} style={styles.shareBtn} hitSlop={8}>
                  <Ionicons name="image-outline" size={22} color={theme.color.text} />
                </Pressable>
              )}
```
(Reuse the existing `styles.shareBtn`; `Pressable`, `Ionicons`, `displaySermon`, and `onClose` are already in scope.)

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 5: Commit**

```bash
git add app/\(protected\)/\(tabs\)/home.tsx app/\(protected\)/verse.tsx components/SermonModal.tsx
git commit -m "feat: wire card creator entry points (home, verse, reflection)"
```

---

## Notes for the implementer

- **No test framework** — do not scaffold one. Verification is `tsc` + `lint` per task, plus the human on-device pass after a rebuild (Task 2, Step 6).
- Confirm each "already imported / already defined" claim before assuming it (e.g. `router` in `home.tsx`, `Ionicons`/`translation`/`verse` in `verse.tsx`). If something the plan says exists is actually missing, add the minimal import rather than reporting blocked — but note it in your report.
- Match the existing `theme` import style (`import { theme } from '@/lib/theme'` vs default) used by the file you're editing / the sibling `verse.tsx` screen.
- Do not change reflection generation, Firestore, auth, or the mood flow.
