# Sermon-First Experience + Mood Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the sermon result into a calm full-screen reading view (sermon-first, verses shown, sticky Save), make generate flow into that view via a loading state, and refresh the mood check-in (no bounce, bold per-mood confirm screen).

**Architecture:** Rework the existing `SermonModal` (keep its props so all call sites keep working) from a bottom-sheet-with-collapsibles into a full-screen one-scroll reading view with a sticky Save bar and a loading state. Home opens it immediately in the loading state on generate. `MoodModal` drops its bounce animation and turns its second step into a full-color per-mood confirmation. No backend/data changes — same `Sermon` shape and handlers. Spec: `docs/superpowers/specs/2026-07-11-sermon-experience-design.md`.

**Tech Stack:** Expo SDK 54 / expo-router 6, React Native 0.81, expo-clipboard, react-native-reanimated, the warm design system (`lib/theme.ts`, `components/ui/`).

## Global Constraints

- **Reskin/rework, not a behavior change.** Preserve all handlers/data/copy: `saveSermon`/`updateSermon`, color selection, share/copy, `onSave`/`onClose`; mood `generateMoodSermon`/`addMoodEntry`/`onComplete`/reset-on-visible. Same `Sermon` shape (`{ verses: string[], interpretation, story }`). Do NOT touch `lib/sermonApi.ts`, `lib/sermonAi.ts`, `functions/`, or the Cloud Function.
- Design tokens only (from `lib/theme.ts`): every color a `theme.color.*`/`theme.moodColor.*` token, every font `theme.font.*`/`<AppText variant>`, radii `theme.radius.*`, spacing `theme.space.*`. No hardcoded design hex. Ionicons only, never emoji. (Legitimate `style` fontSize overrides, `padding:0`, shadow params, and raw numerics ≥ `theme.space.xs`=4 are acceptable, consistent with the redesign.)
- **No collapsibles** in the sermon view — remove `react-native-collapsible` usage; all content visible in one scroll, order: message → scripture → story.
- **Sticky Save** — the Save/Update action is pinned (outside the ScrollView), always visible.
- **No bounce** in mood select — remove the spring entrance + `pulseScale` sequence; gentle `withTiming` fade only.
- **Mood color map** exact values (Task 1), keyed by `MoodType`.
- NO automated test framework exists and none is added. "Verify" = `npx tsc --noEmit` (expect **0** errors) + `npm run lint` (≤15 problems — 0 new).
- Reading view copy: header title "Sermon" for a topic sermon, "Encouragement" when it's a mood entry (derive from `savedSermon`/title — see Task 2). Section labels: **THE MESSAGE**, **SCRIPTURE**, **A STORY**. Loading copy: "Preparing your sermon…".

---

### Task 1: Mood color map in the theme

**Files:** Modify `lib/theme.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `theme.moodColor` — `Record<MoodType, { bg: string; on: string }>` (used by Task 4).

- [ ] **Step 1: Add the map to `lib/theme.ts`**

Inside the `theme` object, after the `color` block (before `font`), add a `moodColor` key. Import the `MoodType` type at the top (`import type { MoodType } from './types';`) and type the map. Values (verbatim):

```ts
  // Bold per-mood accent colors for the mood-confirm screen (deliberately
  // more saturated than the muted card palette). `on` meets 4.5:1 contrast.
  moodColor: {
    Happy:       { bg: '#E0A22E', on: '#2A2420' },
    Grateful:    { bg: '#5E9B6B', on: '#FBF8F2' },
    Hopeful:     { bg: '#5B8DC9', on: '#FBF8F2' },
    Peaceful:    { bg: '#3FA39C', on: '#FBF8F2' },
    Anxious:     { bg: '#C4913F', on: '#2A2420' },
    Sad:         { bg: '#6E86A8', on: '#FBF8F2' },
    Overwhelmed: { bg: '#A96A93', on: '#FBF8F2' },
    Angry:       { bg: '#C0553A', on: '#FBF8F2' },
  } as Record<MoodType, { bg: string; on: string }>,
```

Note: `theme` is declared `as const`; keeping the `as Record<MoodType, …>` cast on this value keeps its type usable while the rest stays literal. If `as const` on the outer object conflicts with the cast, wrap just this value's type — verify tsc stays at 0.

- [ ] **Step 2: Verify** — `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`; `npm run lint 2>&1 | tail -2` → ≤15, 0 new.

- [ ] **Step 3: Commit** — `git add lib/theme.ts && git commit -m "Add bold per-mood color map to theme"`

---

### Task 2: Rework SermonModal into the full-screen reading view

**Files:** Modify `components/SermonModal.tsx` (full rework)

**Interfaces:**
- Consumes: `theme`, `AppText`, `Card`, `PrimaryButton` (existing); `saveSermon`/`updateSermon` from `lib/sermonApi` (existing).
- Produces: `SermonModal` with props `{ visible, sermon, savedSermon?, topic, onClose, onSave, loading? }` — **adds `loading?: boolean`** (default false). Home (Task 3) passes `loading`. MoodModal keeps calling it without `loading` (defaults false).

- [ ] **Step 1: Replace the whole file**

Replace `components/SermonModal.tsx` with:

```tsx
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/ToastProvider';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon, Sermon } from '@/lib/types';

interface SermonModalProps {
  visible: boolean;
  sermon: Sermon | null;
  savedSermon?: SavedSermon | null;
  topic: string;
  onClose: () => void;
  onSave: () => void;
  loading?: boolean;
}

// ids match Home card color ids: 1→sage, 2→sand, 3→dustyBlue, 4→olive, 5→blush, 6→rust
const COLOR_OPTIONS = [
  { id: '1', color: theme.color.sage },
  { id: '2', color: theme.color.sand },
  { id: '3', color: theme.color.dustyBlue },
  { id: '4', color: theme.color.olive },
  { id: '5', color: theme.color.blush },
  { id: '6', color: theme.color.rust },
];

export default function SermonModal({
  visible,
  sermon,
  savedSermon,
  topic,
  onClose,
  onSave,
  loading = false,
}: SermonModalProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [title, setTitle] = useState(topic);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);

  const displaySermon = savedSermon
    ? { verses: savedSermon.verses, interpretation: savedSermon.interpretation, story: savedSermon.story }
    : sermon;

  // A mood entry's saved title is prefixed "Mood: " — used for the header label.
  const isEncouragement = !!savedSermon?.title?.startsWith('Mood:');
  const headerLabel = isEncouragement ? 'Encouragement' : 'Sermon';

  useLayoutEffect(() => {
    if (!visible) return;
    if (savedSermon) {
      setTitle(savedSermon.title);
      setSelectedColor(savedSermon.color);
    } else {
      setTitle(topic);
      setSelectedColor(COLOR_OPTIONS[0].id);
    }
  }, [visible, topic, savedSermon]);

  const handleCopy = async (text: string, section: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showInfo('Copied', `${section} copied to clipboard`);
    } catch {
      showError('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    if (!displaySermon) return;
    const body = [
      title,
      '',
      displaySermon.interpretation,
      '',
      displaySermon.verses.join('\n'),
      '',
      displaySermon.story,
    ].join('\n');
    try {
      await Share.share({ message: body });
    } catch {
      showError('Share failed', 'Could not open the share sheet');
    }
  };

  const handleSave = async () => {
    if (!displaySermon || !title.trim()) {
      showError('Error', 'Please enter a title for your sermon');
      return;
    }
    setSaving(true);
    try {
      if (savedSermon?.id) {
        await updateSermon({
          ...savedSermon,
          title: title.trim(),
          verses: displaySermon.verses,
          interpretation: displaySermon.interpretation,
          story: displaySermon.story,
          color: selectedColor,
        });
        showSuccess('Sermon updated', 'Your sermon has been updated');
      } else {
        await saveSermonApi({
          title: title.trim(),
          verses: displaySermon.verses || [],
          interpretation: displaySermon.interpretation || '',
          story: displaySermon.story || '',
          color: selectedColor,
          topic,
        });
        showSuccess('Sermon saved', 'Your sermon has been saved');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      showError('Error', error.message || 'Failed to save sermon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.color.text} />
          </Pressable>
          <AppText variant="title">{headerLabel}</AppText>
          {displaySermon && !loading ? (
            <Pressable onPress={handleShare} style={styles.iconButton} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={theme.color.text} />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        {loading || !displaySermon ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.color.accent} />
            <AppText variant="body" style={styles.loadingText}>Preparing your sermon…</AppText>
          </View>
        ) : (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {/* Topic / title (editable for a new sermon, serif) */}
              <TextInput
                style={styles.title}
                value={title}
                onChangeText={setTitle}
                placeholder="Sermon title"
                placeholderTextColor={theme.color.textMuted}
                editable={!savedSermon}
                multiline
              />

              {/* THE MESSAGE — leads */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">The Message</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.interpretation || '', 'Message')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              <AppText variant="body" style={styles.messageBody}>{displaySermon.interpretation}</AppText>

              {/* SCRIPTURE — verses as inline cards */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">Scripture</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.verses.join('\n\n'), 'Scripture')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              {displaySermon.verses.map((verse, i) => (
                <Card key={i} tone="blush" style={styles.verseCard}>
                  <AppText variant="verse">{verse}</AppText>
                </Card>
              ))}

              {/* A STORY */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">A Story</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.story || '', 'Story')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              <AppText variant="body" style={styles.messageBody}>{displaySermon.story}</AppText>

              {/* Card color row (small) */}
              <AppText variant="label" style={styles.colorLabel}>Card color</AppText>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((option) => (
                  <Pressable key={option.id} onPress={() => setSelectedColor(option.id)}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: option.color },
                        selectedColor === option.id && styles.swatchSelected,
                      ]}
                    >
                      {selectedColor === option.id && (
                        <Ionicons name="checkmark" size={16} color={theme.color.accentText} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Sticky Save bar */}
            <View style={styles.saveBar}>
              <PrimaryButton
                label={savedSermon ? 'Update' : 'Save sermon'}
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
              <Pressable onPress={handleShare} style={styles.shareBtn}>
                <Ionicons name="share-outline" size={22} color={theme.color.text} />
              </Pressable>
            </View>
          </>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  loadingText: { color: theme.color.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.space.xl, paddingBottom: theme.space.xxl },
  title: {
    fontFamily: theme.font.serif, fontSize: 26, lineHeight: 32, color: theme.color.text,
    marginBottom: theme.space.lg, padding: 0,
  },
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.space.xl, marginBottom: theme.space.sm,
  },
  messageBody: { lineHeight: 24 },
  verseCard: { marginBottom: theme.space.md },
  colorLabel: { marginTop: theme.space.xl, marginBottom: theme.space.sm },
  colorRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: {
    width: 36, height: 36, borderRadius: theme.radius.pill,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  swatchSelected: { borderColor: theme.color.text },
  saveBar: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, paddingBottom: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: theme.color.surface,
  },
  saveButton: { flex: 1 },
  shareBtn: {
    width: 52, height: 52, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface,
  },
});
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`; `npm run lint 2>&1 | tail -2` → ≤15, 0 new; `grep -n "react-native-collapsible\|from 'react-native'\s*;\?\s*$" components/SermonModal.tsx` and confirm no `Collapsible` import and no `Clipboard` from `react-native` remain (`grep -n "Collapsible\|Clipboard" components/SermonModal.tsx` → only `expo-clipboard`).

- [ ] **Step 3: Commit** — `git add components/SermonModal.tsx && git commit -m "Rework sermon result into full-screen reading view (sermon-first, sticky Save, loading)"`

---

### Task 3: Generate flow opens the reading view in a loading state

**Files:** Modify `app/(protected)/(tabs)/home.tsx`

**Interfaces:**
- Consumes: `SermonModal` `loading` prop (Task 2).
- Produces: nothing new.

Context: currently `handleGenerate` awaits `generateSermon` and only THEN opens the modal (`setModalVisible(true)`). Rework so the reading view opens immediately in the loading state, then fills.

- [ ] **Step 1: Add a `generating` state and open-first flow**

In `app/(protected)/(tabs)/home.tsx`:

a) Add state near the other sermon state (after `const [loading, setLoading] = useState(false);`):
```tsx
  const [generating, setGenerating] = useState(false);
```

b) Replace the body of `handleGenerate` so it opens the view first:
```tsx
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setSermon(null);
    setEditingSermon(null);
    setGenerating(true);
    setModalVisible(true); // open the reading view immediately in its loading state
    try {
      const result = await generateSermon(topic.trim());
      setSermon(result);
    } catch (error) {
      console.error('Error generating sermon:', error);
      setModalVisible(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        showError('Network Error', 'Could not reach the sermon service. Please check your internet connection.');
      } else {
        showError('Generation failed', errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage);
      }
    } finally {
      setGenerating(false);
    }
  };
```
(Keep the existing `setLoading`-based button spinner if you like, or drop `setLoading(true/false)` since the reading view now shows progress — but the home send button still reads `loading`/`disabled` from `loading`; simplest: set `loading` alongside `generating`. If you remove `loading`, also remove its uses in the send button at lines ~201/206/208. Either is fine; keep the send button disabled while generating.)

c) In `handleModalClose`, also clear generating:
```tsx
  const handleModalClose = () => {
    setModalVisible(false);
    setSermon(null);
    setEditingSermon(null);
    setGenerating(false);
  };
```

d) Pass `loading` to the modal:
```tsx
      <SermonModal
        visible={modalVisible}
        sermon={sermon}
        savedSermon={editingSermon}
        topic={topic}
        onClose={handleModalClose}
        onSave={handleSave}
        loading={generating}
      />
```

- [ ] **Step 2: Verify** — tsc 0; lint ≤15, 0 new.

- [ ] **Step 3: Commit** — `git add "app/(protected)/(tabs)/home.tsx" && git commit -m "Open sermon reading view immediately in a loading state on generate"`

---

### Task 4: Mood check-in — remove bounce + bold per-mood confirm

**Files:** Modify `components/MoodModal.tsx`
**Mockup reference:** the "Emotional UI" direction — a focused full-color mood screen (big icon, big name, add-a-reason).

**Interfaces:** Consumes `theme.moodColor` (Task 1); renders `SermonModal` (Task 2) for the result (already wired via `sermonModalVisible`).

- [ ] **Step 1: Remove the bounce from `AnimatedMoodChip`**

In `components/MoodModal.tsx`, in `AnimatedMoodChip`: delete `pulseScale` and the `useEffect` that sets `pulseScale` via `withSequence`/`withSpring` on `isSelected`; delete the entrance `withSpring` and press `withSpring` — replace with a gentle timing fade. Concretely: keep only an `opacity` shared value driven by `withTiming(visible ? 1 : 0, { duration: 150 })`, and drop the `scale`/`pressScale`/`pulseScale` transforms (the tile no longer scales). Remove now-unused imports `withSpring`, `withSequence`, `withDelay` if nothing else uses them. Selection is shown by the static terracotta-border tile style (already present) — no animation on select.

- [ ] **Step 2: Turn step 2 into the bold per-mood confirmation**

Step 2 currently is the reasons screen ("What's on your mind?"). Restyle its container to the selected mood's color and lead with the mood. Wrap the step-2 content so its background is `theme.moodColor[selectedMood].bg` and its text/controls use `theme.moodColor[selectedMood].on`:
- A large Ionicons mood face (size ~64, color `on`) — reuse the icon from the `MOODS` entry for `selectedMood`.
- The mood name in large serif: `<AppText variant="display" style={{ color: on, fontSize: 34 }}>{selectedMood}</AppText>`.
- The date (`new Date().toLocaleDateString('en-US',{ month:'long', day:'numeric' })`) in a muted-on tone (`on` at ~80% or a translucent version).
- The reason **chips** (`getReasonsForMood(selectedMood)`) — render them so selected = filled with `on` color and text = `bg`, unselected = translucent `on` outline (adapt the existing chip rendering to be legible on the color; do NOT use the muted `<Chip>` here since it assumes the paper background). Keep `selectedReasons`/`handleReasonToggle`.
- The "add a reason" `TextInput` (`customReason`/`setCustomReason`) with an on-color border and `on` text.
- A send/continue action styled on-color that calls the existing `handleGenerateSermon` (an on-color pill button: bg = `on`, label color = `bg`).
Keep the back control (`handleBack`) to return to the grid.

- [ ] **Step 3: Keep step 3 calm**

Step 3 (generating) copy stays; ensure any spinner is a plain `ActivityIndicator` (accent color), no bounce. The result already opens via `SermonModal` (which is now the reading view — encouragement gets it for free). Leave `sermonModalVisible`/`handleSermonModalClose` as-is.

- [ ] **Step 4: Verify** — `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `0`; `npm run lint 2>&1 | tail -2` → ≤15, 0 new; `grep -n "pulseScale\|withSequence" components/MoodModal.tsx` → empty.

- [ ] **Step 5: Commit** — `git add components/MoodModal.tsx && git commit -m "Mood check-in: remove bounce, add bold per-mood confirm screen"`

---

### Task 5: Manual on-device pass (human)

No files. Requires a Metro reload (JS-only changes; no new native modules).

- [ ] 1. Home → type a topic → tap send: the **full-screen reading view opens immediately** showing "Preparing your sermon…", then fills.
- [ ] 2. In the reading view the **sermon message reads first**, then verses as scripture cards, then story — **no collapsibles**, everything visible in one scroll.
- [ ] 3. **Save** is an obvious sticky button at the bottom; one tap saves; the saved card shows the chosen color. Tapping a saved sermon opens the same view with **Update**.
- [ ] 4. Share (header + sticky bar) opens the share sheet; per-section copy works.
- [ ] 5. Mood tab / Home "Mood" → grid: selecting a mood is **calm, no bounce**.
- [ ] 6. After picking a mood, the **bold per-mood confirm screen** appears (correct color, big icon + name, readable reasons + add-a-reason); generating is calm; the encouragement opens in the reading view.
- [ ] 7. Nothing regressed: sermon generation (Claude), mood save, verse screen, tabs.
