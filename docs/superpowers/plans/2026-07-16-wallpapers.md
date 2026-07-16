# Wallpaper Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A wallpaper creator — browse a gallery of gradient backgrounds by category, pick one, put today's verse or a line from a saved reflection on it, choose font + color, and download or share.

**Architecture:** Reuse the existing 9:16 `ShareCard` renderer (extended with gradient/textColor/font/fullBleed overrides) and the `cardCapture.ts` save/share pipeline. Add a wallpaper data module, a gallery screen, a reflection-picker modal, an editor screen, and a Home entry row. `card.tsx` is untouched.

**Tech Stack:** React Native + Expo Router, TypeScript, `expo-linear-gradient`, `react-native-view-shot` (via `cardCapture.ts`), existing `theme` tokens.

## Global Constraints

- **No test runner.** Verify with `npx tsc --noEmit` (exit 0) and `npx eslint <files>` (exit 0 on touched/new files). No test framework. Pre-existing eslint issues in untouched files are not this work's concern.
- **`card.tsx` must keep working unchanged** — the `ShareCard` extension is back-compatible (all new props optional; absent → current behavior).
- **Sharing = OS share sheet only** (reuse `shareCardImage`); plus Download to Photos (`saveCardImage`). No bespoke social buttons.
- **Text sources (v1):** Verse of the Day + a line from a saved reflection. No free-form custom text.
- **Backgrounds:** clean `LinearGradient` (no stripe texture). Wallpaper renders **fullBleed** (no rounded corners) in both preview and capture (WYSIWYG).
- **Design tokens only** (`theme.color/space/radius/font`) except the wallpaper gradient/text hex, which live in `lib/wallpapers.ts`.
- File paths under `app/(protected)/` contain parentheses — **quote them** in shell commands.
- Branch: `feature/wallpapers` (already created from `main`; spec already committed).

## File Structure

| File | Responsibility |
|---|---|
| `lib/wallpapers.ts` (new) | background set + categories, text colors, font type |
| `components/ShareCard.tsx` (modify) | optional gradient/textColor/font/fullBleed overrides (back-compatible) |
| `app/(protected)/wallpapers.tsx` (new) | gallery: category chips + 2-col gradient grid |
| `components/ReflectionPickerModal.tsx` (new) | modal: pick a saved reflection → pick a verse → callback |
| `app/(protected)/wallpaper-editor.tsx` (new) | editor: source/font/color, download/share |
| `app/(protected)/(tabs)/home.tsx` (modify) | add a "Wallpapers" entry row |

---

### Task 1: Wallpaper data + ShareCard overrides

**Files:**
- Create: `lib/wallpapers.ts`
- Modify: `components/ShareCard.tsx`

**Interfaces:**
- Produces:
  - `WALLPAPERS: Wallpaper[]`, `WALLPAPER_CATEGORIES`, `TEXT_COLORS: TextColorOption[]`,
    `type WallpaperFont = 'serif' | 'sans'`, `type WallpaperCategory`, interfaces `Wallpaper`, `TextColorOption`.
  - `ShareCard` gains optional props `gradient?: [string, string]`, `textColor?: string`, `font?: 'serif' | 'sans'`, `fullBleed?: boolean`.

- [ ] **Step 1: Create `lib/wallpapers.ts`**

```ts
export type WallpaperCategory = 'Nature' | 'Sky' | 'Minimal';

export interface Wallpaper {
  key: string;
  label: string;
  category: WallpaperCategory;
  gradient: [string, string]; // top -> bottom
}

// Curated wallpaper backgrounds in the muted card-palette spirit.
export const WALLPAPERS: Wallpaper[] = [
  { key: 'misty-forest',  label: 'Misty Forest',  category: 'Nature',  gradient: ['#5A6E5A', '#38463A'] },
  { key: 'calm-meadow',   label: 'Calm Meadow',   category: 'Nature',  gradient: ['#7E9B6E', '#566E4C'] },
  { key: 'dawn-sky',      label: 'Dawn Sky',      category: 'Sky',     gradient: ['#8FB4D8', '#5E86B0'] },
  { key: 'night-sky',     label: 'Night Sky',     category: 'Sky',     gradient: ['#3B4A6B', '#232B44'] },
  { key: 'minimal-paper', label: 'Minimal Paper', category: 'Minimal', gradient: ['#F4EFE6', '#E4D9C6'] },
  { key: 'sunset-ridge',  label: 'Sunset Ridge',  category: 'Minimal', gradient: ['#B0623E', '#7E3F27'] },
];

export const WALLPAPER_CATEGORIES: ('All' | WallpaperCategory)[] = ['All', 'Nature', 'Sky', 'Minimal'];

export type WallpaperFont = 'serif' | 'sans';

export interface TextColorOption {
  key: string;
  label: string;
  color: string;
}

export const TEXT_COLORS: TextColorOption[] = [
  { key: 'white', label: 'White', color: '#FFFFFF' },
  { key: 'cream', label: 'Cream', color: '#F2EFE8' },
  { key: 'tan',   label: 'Tan',   color: '#E7C98B' },
  { key: 'dark',  label: 'Dark',  color: '#2B2724' },
];
```

- [ ] **Step 2: Extend `ShareCard` with override props**

In `components/ShareCard.tsx`, add an import of the app theme (aliased, to avoid the existing local `theme` variable that holds the found card theme):
```ts
import { theme as appTheme } from '@/lib/theme';
```

Replace the `Props` type with:
```ts
type Props = {
  content: CardContent;
  themeKey: CardThemeKey;
  position: CardPosition;
  width?: number;
  gradient?: [string, string];
  textColor?: string;
  font?: 'serif' | 'sans';
  fullBleed?: boolean;
};
```

Replace the component body's destructuring + derived-value lines (the `const theme = ...`, `const w = ...`, `const h = ...` block) with:
```tsx
const ShareCard = React.forwardRef<View, Props>(({ content, themeKey, position, width, gradient, textColor, font, fullBleed }, ref) => {
  const theme = CARD_THEMES.find((t) => t.key === themeKey) ?? CARD_THEMES[0];
  const gradientColors = gradient ?? theme.gradient;
  const verseColor = textColor ?? theme.textColor;
  const refColor = textColor ? `${textColor}CC` : theme.refColor;
  const wordmarkColor = textColor ? `${textColor}99` : theme.wordmarkColor;
  const w = width ?? Math.min(Dimensions.get('window').width - 48, 340);
  const h = (w * 16) / 9; // portrait 9:16
```

Update the container, gradient, verse, reference, and wordmark to use the derived values:
- Container: `style={[styles.card, { width: w, height: h }, fullBleed && styles.fullBleed]}`
- Gradient: `colors={gradientColors}`
- Verse: `style={[styles.verse, { color: verseColor, textAlign }, font === 'sans' && styles.verseSans]}`
- Reference: `style={[styles.reference, { color: refColor, textAlign }]}`
- Wordmark: `style={[styles.wordmark, { color: wordmarkColor }]}`

- [ ] **Step 3: Add the two new styles**

In `ShareCard`'s `StyleSheet.create`, add:
```ts
  fullBleed: { borderRadius: 0 },
  verseSans: { fontFamily: appTheme.font.sans },
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit` → exit 0 (confirm `card.tsx` still compiles — it passes only `content`/`themeKey`/`position`, so the new optional props default to current behavior).
Run: `npx eslint lib/wallpapers.ts "components/ShareCard.tsx"` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/wallpapers.ts "components/ShareCard.tsx"
git commit -m "feat: wallpaper data + ShareCard gradient/color/font/fullBleed overrides

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Wallpaper gallery screen

**Files:**
- Create: `app/(protected)/wallpapers.tsx`

**Interfaces:**
- Consumes: `WALLPAPERS`, `WALLPAPER_CATEGORIES`, `Wallpaper` (Task 1).
- Produces: route `/(protected)/wallpapers`; navigates to `/(protected)/wallpaper-editor?wallpaper=<key>` (Task 4).

- [ ] **Step 1: Create `app/(protected)/wallpapers.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import { theme } from '@/lib/theme';
import { WALLPAPERS, WALLPAPER_CATEGORIES, type WallpaperCategory } from '@/lib/wallpapers';

export default function WallpapersScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<'All' | WallpaperCategory>('All');

  const shown = category === 'All' ? WALLPAPERS : WALLPAPERS.filter((w) => w.category === category);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">Wallpapers</AppText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.chips}>
        {WALLPAPER_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <AppText style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {shown.map((w) => (
          <Pressable
            key={w.key}
            style={styles.tileWrap}
            onPress={() =>
              router.push({ pathname: '/(protected)/wallpaper-editor', params: { wallpaper: w.key } } as never)
            }
          >
            <LinearGradient colors={w.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.tile} />
            <AppText variant="caption" style={styles.tileLabel}>{w.label}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.space.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, marginBottom: theme.space.md },
  chip: { paddingHorizontal: theme.space.md, height: 36, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surfaceAlt },
  chipActive: { backgroundColor: theme.color.accent },
  chipText: { color: theme.color.textMuted, fontFamily: theme.font.sansMedium, fontSize: 13 },
  chipTextActive: { color: theme.color.accentText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.space.md, paddingBottom: theme.space.xxl },
  tileWrap: { width: '47%' },
  tile: { width: '100%', aspectRatio: 9 / 16, borderRadius: theme.radius.md },
  tileLabel: { marginTop: theme.space.xs },
});
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → exit 0. (The editor route type may be unknown to typed-routes until regeneration, but the `as never` cast avoids depending on it.)
Run: `npx eslint "app/(protected)/wallpapers.tsx"` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/wallpapers.tsx"
git commit -m "feat: wallpaper gallery screen with category filter + gradient grid

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Reflection picker modal

**Files:**
- Create: `components/ReflectionPickerModal.tsx`

**Interfaces:**
- Consumes: `getSermons` from `@/lib/sermonApi`, `SavedSermon` type.
- Produces:
  ```ts
  interface ReflectionPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (verse: string) => void; // a raw verse string, e.g. "John 3:16 - For God so loved..."
  }
  export default function ReflectionPickerModal(props): JSX.Element;
  ```

- [ ] **Step 1: Create `components/ReflectionPickerModal.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import { getSermons } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

interface ReflectionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (verse: string) => void;
}

export default function ReflectionPickerModal({ visible, onClose, onSelect }: ReflectionPickerModalProps) {
  const [sermons, setSermons] = useState<SavedSermon[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<SavedSermon | null>(null);

  useEffect(() => {
    if (!visible) {
      setExpanded(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSermons()
      .then((data) => { if (!cancelled) setSermons(data); })
      .catch((error) => { console.error('Error loading reflections:', error); if (!cancelled) setSermons([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible]);

  const handleReflectionPress = (sermon: SavedSermon) => {
    const verses = sermon.verses ?? [];
    if (verses.length <= 1) {
      if (verses[0]) onSelect(verses[0]);
      return;
    }
    setExpanded(sermon);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.color.text} />
          </Pressable>
          <AppText variant="title">{expanded ? 'Pick a verse' : 'Pick a reflection'}</AppText>
          <View style={styles.iconButton} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.color.accent} />
          </View>
        ) : expanded ? (
          <ScrollView contentContainerStyle={styles.list}>
            {(expanded.verses ?? []).map((v, i) => (
              <Pressable key={i} onPress={() => onSelect(v)}>
                <Card style={styles.row}>
                  <AppText variant="body" numberOfLines={3}>{v}</AppText>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        ) : sermons.length === 0 ? (
          <View style={styles.center}>
            <AppText variant="body" style={styles.emptyText}>No reflections yet</AppText>
            <AppText variant="caption" style={styles.emptySub}>Create a reflection first to use it here</AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sermons.map((s) => (
              <Pressable key={s.id} onPress={() => handleReflectionPress(s)}>
                <Card style={styles.row}>
                  <View style={styles.rowText}>
                    <AppText variant="body" numberOfLines={1}>{s.title}</AppText>
                    <AppText variant="caption">{s.date}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.color.border,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xs, padding: theme.space.xl },
  emptyText: { color: theme.color.textMuted },
  emptySub: { textAlign: 'center', color: theme.color.textMuted },
  list: { padding: theme.space.lg, gap: theme.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  rowText: { flex: 1, gap: 2 },
});
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint "components/ReflectionPickerModal.tsx"` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add "components/ReflectionPickerModal.tsx"
git commit -m "feat: reflection picker modal (reflection -> verse selection)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Wallpaper editor screen

**Files:**
- Create: `app/(protected)/wallpaper-editor.tsx`

**Interfaces:**
- Consumes: `WALLPAPERS`, `TEXT_COLORS`, `WallpaperFont` (Task 1); extended `ShareCard` (Task 1); `ReflectionPickerModal` (Task 3); `captureCardToFile`/`saveCardImage`/`shareCardImage` (`lib/cardCapture.ts`); `splitVerseString`/`CardContent` (`lib/cards.ts`); `bundledVerseSource` (`lib/verses.ts`); `useVerseStore`.

- [ ] **Step 1: Create `app/(protected)/wallpaper-editor.tsx`**

```tsx
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
// (cardRef is typed with the `View` value import below, matching card.tsx)
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import ShareCard from '@/components/ShareCard';
import ReflectionPickerModal from '@/components/ReflectionPickerModal';
import { useToast } from '@/components/ToastProvider';
import { WALLPAPERS, TEXT_COLORS, type WallpaperFont } from '@/lib/wallpapers';
import { splitVerseString, type CardContent } from '@/lib/cards';
import { captureCardToFile, saveCardImage, shareCardImage } from '@/lib/cardCapture';
import { bundledVerseSource } from '@/lib/verses';
import { useVerseStore } from '@/lib/stores/verse';
import { theme } from '@/lib/theme';

type Source = 'verse' | 'reflection';

export default function WallpaperEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ wallpaper?: string }>();
  const { translation } = useVerseStore();
  const { showSuccess, showError, showInfo } = useToast();

  const wallpaper = useMemo(
    () => WALLPAPERS.find((w) => w.key === params.wallpaper) ?? WALLPAPERS[0],
    [params.wallpaper]
  );

  const todayVerse = useMemo((): CardContent => {
    const v = bundledVerseSource.getVerseForDate(new Date());
    return { text: v.text[translation], reference: v.reference };
  }, [translation]);

  const [source, setSource] = useState<Source>('verse');
  const [content, setContent] = useState<CardContent>(todayVerse);
  const [font, setFont] = useState<WallpaperFont>('serif');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0].color);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const cardRef = useRef<View>(null);

  const chooseVerseSource = () => {
    setSource('verse');
    setContent(todayVerse);
  };

  const handleReflectionSelected = (verse: string) => {
    setContent(splitVerseString(verse));
    setSource('reflection');
    setPickerVisible(false);
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const uri = await captureCardToFile(cardRef);
      const ok = await shareCardImage(uri);
      if (!ok) showInfo('Sharing unavailable', 'This device cannot share files.');
    } catch {
      showError('Share failed', 'Could not create the wallpaper image.');
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const uri = await captureCardToFile(cardRef);
      const result = await saveCardImage(uri);
      if (result === 'saved') showSuccess('Saved', 'The wallpaper is in your Photos.');
      else showError('Permission needed', 'Allow photo access to save wallpapers.');
    } catch {
      showError('Save failed', 'Could not save the wallpaper image.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">{wallpaper.label}</AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <ShareCard
            ref={cardRef}
            content={content}
            themeKey="cream"
            position="centered"
            gradient={wallpaper.gradient}
            textColor={textColor}
            font={font}
            fullBleed
          />
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Text</AppText>
        <View style={styles.segment}>
          <Pressable onPress={chooseVerseSource} style={[styles.segmentItem, source === 'verse' && styles.segmentItemActive]}>
            <AppText style={[styles.segmentText, source === 'verse' && styles.segmentTextActive]}>Verse of the Day</AppText>
          </Pressable>
          <Pressable onPress={() => setPickerVisible(true)} style={[styles.segmentItem, source === 'reflection' && styles.segmentItemActive]}>
            <AppText style={[styles.segmentText, source === 'reflection' && styles.segmentTextActive]}>My Reflections</AppText>
          </Pressable>
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Font</AppText>
        <View style={styles.segment}>
          {(['serif', 'sans'] as WallpaperFont[]).map((f) => (
            <Pressable key={f} onPress={() => setFont(f)} style={[styles.segmentItem, font === f && styles.segmentItemActive]}>
              <AppText style={[styles.segmentText, font === f && styles.segmentTextActive]}>{f === 'serif' ? 'Serif' : 'Sans'}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Text color</AppText>
        <View style={styles.colorRow}>
          {TEXT_COLORS.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setTextColor(c.color)}
              style={[styles.swatch, { backgroundColor: c.color }, textColor === c.color && styles.swatchSelected]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Share" onPress={onShare} loading={busy === 'share'} disabled={busy !== null} style={styles.shareBtn} />
          <Pressable onPress={onSave} disabled={busy !== null} style={styles.saveBtn}>
            {busy === 'save' ? (
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

      <ReflectionPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleReflectionSelected}
      />
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
  segment: { flexDirection: 'row', backgroundColor: theme.color.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.pill },
  segmentItemActive: { backgroundColor: theme.color.surface },
  segmentText: { color: theme.color.textMuted },
  segmentTextActive: { color: theme.color.text },
  colorRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: { width: 44, height: 44, borderRadius: theme.radius.pill, borderWidth: 2, borderColor: theme.color.border },
  swatchSelected: { borderColor: theme.color.accent },
  actions: { gap: theme.space.md, marginTop: theme.space.sm },
  shareBtn: { width: '100%' },
  saveBtn: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.accent },
  saveBtnText: { color: theme.color.accent, fontFamily: theme.font.sansSemibold },
});
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → exit 0. Confirm the `ShareCard` overrides (`gradient`/`textColor`/`font`/`fullBleed`) and `ReflectionPickerModal` props all typecheck.
Run: `npx eslint "app/(protected)/wallpaper-editor.tsx"` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/wallpaper-editor.tsx"
git commit -m "feat: wallpaper editor (source/font/color, download + share)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Home "Wallpapers" entry row

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`

**Interfaces:**
- Consumes: the `/(protected)/wallpapers` route (Task 2). Reuses existing `wallpaperContent`/`wallpaperIconWrap`/`wallpaperText`/`wallpaperLabel`/`wallpaperSub` styles already in `home.tsx`.

- [ ] **Step 1: Add the Wallpapers row after the "Create a card" row**

In `app/(protected)/(tabs)/home.tsx`, immediately after the closing `</Pressable>` of the "Create a card" block (the block that starts `{/* Create a card */}`), add:
```tsx
        {/* Wallpapers */}
        <Pressable
          onPress={() => router.push('/(protected)/wallpapers' as never)}
          style={styles.wallpaperRow}
        >
          <Card style={styles.wallpaperCard}>
            <View style={styles.wallpaperContent}>
              <View style={styles.wallpaperIconWrap}>
                <Ionicons name="color-palette-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.wallpaperText}>
                <AppText variant="body" style={styles.wallpaperLabel}>Wallpapers</AppText>
                <AppText variant="caption" style={styles.wallpaperSub}>Make a wallpaper from a verse or reflection</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>
```
(No new styles — it reuses the existing `wallpaper*` style keys. No import changes — `Pressable`, `Card`, `View`, `AppText`, `Ionicons`, `theme`, `router` are all already in scope.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx eslint "app/(protected)/(tabs)/home.tsx"` → exit 0 (the 2 pre-existing apostrophe errors + 1 exhaustive-deps warning may remain; introduce no new ones).

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/(tabs)/home.tsx"
git commit -m "feat: add Wallpapers entry row on home

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (behavioral — needs a reloaded client)

Not a task with its own commit — run after Task 5, then report.

- [ ] `npx tsc --noEmit` clean; `npx eslint` clean (no NEW issues) on all touched/new files.
- [ ] `card.tsx` renders unchanged (ShareCard back-compat — it passes no overrides).
- [ ] Drive: Home → Wallpapers opens the gallery; category chips filter the grid; tapping a tile opens the editor with that gradient; "Verse of the Day" shows today's verse; "My Reflections" opens the picker (reflection → verse) and updates the preview; Serif/Sans and the color swatches update the preview live; "Save to Photos" writes a full-bleed 9:16 image; "Share" opens the OS sheet. This is JS-only (no native rebuild).

## Self-review notes

- **Spec coverage:** wallpaper data + categories + text colors + font, and ShareCard overrides → Task 1. Gallery (chips + grid) → Task 2. My-Reflections picker → Task 3. Editor (sources/font/color, download/share, full-bleed WYSIWYG) → Task 4. Home entry row → Task 5. OS-share-only + card.tsx-untouched honored throughout.
- **Type consistency:** `WallpaperFont = 'serif'|'sans'` matches ShareCard's `font?: 'serif'|'sans'`. `ReflectionPickerModal` `onSelect: (verse: string)` matches the editor's `handleReflectionSelected(verse: string)` → `splitVerseString(verse)`. `WALLPAPERS`/`TEXT_COLORS`/`Wallpaper` names consistent across Tasks 1/2/4. `captureCardToFile(cardRef)` matches the `useRef<RNView>` type used in `card.tsx`.
- **No placeholders:** every code step is literal.
