# Reflections Horizontal Scroll + View All — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unbounded 2-column reflections grid on the home screen with a compact horizontal scroll of recent reflections plus a "View all →" link to a dedicated full-list page.

**Architecture:** Extract the reflection card markup into a reusable presentational `ReflectionCard` component with `strip` and `grid` variants. Add a new stacked `reflections.tsx` page that owns the full grid, read/edit, and delete. Slim `home.tsx` to a capped horizontal strip that links to the new page, and reload its list on focus so cross-screen deletes are reflected.

**Tech Stack:** React Native + Expo Router (typed routes), TypeScript, existing `theme` design tokens, Firestore-backed `getSermons`/`deleteSermon` in `lib/sermonApi.ts`.

## Global Constraints

- **No test runner in this repo.** Verification for every task is `npx tsc --noEmit` (exit 0) and `npx eslint <files>` (exit 0 on the touched files). There is no jest/vitest — do not add one. Final behavioral verification is driving the app (needs a rebuilt dev client) and is called out at the end.
- **Typed routes are on** (`app.config.js` → `experiments.typedRoutes: true`). Navigation to not-yet-typed routes uses the existing `as never` cast pattern, e.g. `router.push('/(protected)/card' as never)` (`home.tsx:356`). Follow it.
- **Design tokens only.** Use `theme.color.*`, `theme.space.*`, `theme.radius.*`, `theme.font.*` — no hardcoded colors/sizes except the fixed strip-card width (160).
- **Reflection card visuals must stay identical** to the current cards (`home.tsx:321-348`): tone-colored `Card`, serif title (2 lines), interpretation excerpt (2 lines, `.slice(0,100) + '...'`), date footer.
- **Home reflection strip cap: 6.** "View all →" shows only when `savedSermons.length > 6`.
- **Delete lives on the full page only.** Strip cards never render a delete button.
- Branch: `feature/reflections-scroll` (already created from `main`, spec already committed).

## File Structure

| File | Responsibility |
|---|---|
| `components/ReflectionCard.tsx` (new) | Presentational reflection card; `strip`/`grid` variants; owns colorId→tone mapping |
| `app/(protected)/reflections.tsx` (new) | Full "View all" page: load, 2-col grid, read/edit modal, delete + confirm |
| `app/(protected)/(tabs)/home.tsx` (modify) | Horizontal capped strip + "View all" link; remove delete flow; focus reload |

---

### Task 1: `ReflectionCard` presentational component

**Files:**
- Create: `components/ReflectionCard.tsx`

**Interfaces:**
- Consumes: `SavedSermon` from `@/lib/types`; `Card`, `AppText`, `theme`, `Ionicons`.
- Produces:
  ```ts
  type ReflectionCardVariant = 'strip' | 'grid';
  interface ReflectionCardProps {
    sermon: SavedSermon;
    variant: ReflectionCardVariant;
    onPress: (sermon: SavedSermon) => void;
    onDelete?: (sermon: SavedSermon) => void;
  }
  export default function ReflectionCard(props: ReflectionCardProps): JSX.Element;
  ```
  Delete button renders only when `variant === 'grid'` **and** `onDelete` is provided.

- [ ] **Step 1: Create the component file**

Create `components/ReflectionCard.tsx` with this exact content:

```tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import AppText from '@/components/ui/AppText';
import { theme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

export type ReflectionCardVariant = 'strip' | 'grid';

interface ReflectionCardProps {
  sermon: SavedSermon;
  variant: ReflectionCardVariant;
  onPress: (sermon: SavedSermon) => void;
  onDelete?: (sermon: SavedSermon) => void;
}

// Reflection color id → Card tone (theme.color key). Owned here because this is
// now the only place that maps a saved reflection's color to a visual tone.
const COLOR_TONE_MAP: Record<string, keyof typeof theme.color> = {
  '1': 'sage',
  '2': 'sand',
  '3': 'dustyBlue',
  '4': 'olive',
  '5': 'blush',
  '6': 'rust',
};

function toneFor(colorId: string): keyof typeof theme.color {
  return COLOR_TONE_MAP[colorId] ?? 'sage';
}

export default function ReflectionCard({ sermon, variant, onPress, onDelete }: ReflectionCardProps) {
  const showDelete = variant === 'grid' && !!onDelete;

  return (
    <Pressable
      style={variant === 'strip' ? styles.stripWrapper : styles.gridWrapper}
      onPress={() => onPress(sermon)}
    >
      <Card tone={toneFor(sermon.color)} style={styles.card}>
        {showDelete && (
          <View style={styles.deleteButtonContainer} pointerEvents="box-none">
            <Pressable style={styles.deleteButton} onPress={() => onDelete!(sermon)}>
              <Ionicons name="trash-outline" size={18} color={theme.color.text} style={{ opacity: 0.7 }} />
            </Pressable>
          </View>
        )}
        <AppText style={styles.title} numberOfLines={2}>
          {sermon.title}
        </AppText>
        <AppText variant="body" style={styles.description} numberOfLines={2}>
          {sermon.interpretation.slice(0, 100)}...
        </AppText>
        <View style={styles.footer}>
          <AppText variant="caption">{sermon.date}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stripWrapper: { width: 160 },
  gridWrapper: { width: '48%' },
  card: { minHeight: 160, justifyContent: 'space-between' },
  deleteButtonContainer: {
    position: 'absolute',
    top: theme.space.md,
    right: theme.space.md,
    zIndex: 10,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.font.serif,
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.text,
    marginBottom: theme.space.sm,
    marginTop: theme.space.xs,
  },
  description: {
    color: theme.color.text,
    opacity: 0.8,
    flex: 1,
  },
  footer: {
    marginTop: theme.space.md,
    alignItems: 'flex-end',
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Lint the new file**

Run: `npx eslint components/ReflectionCard.tsx`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add components/ReflectionCard.tsx
git commit -m "feat: add ReflectionCard component with strip/grid variants

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `reflections.tsx` full "View all" page

**Files:**
- Create: `app/(protected)/reflections.tsx`

**Interfaces:**
- Consumes: `ReflectionCard` (Task 1); `SermonModal`, `ConfirmationModal`, `Screen`, `AppText`, `theme`; `getSermons`, `deleteSermon` from `@/lib/sermonApi`; `useToast`; `SavedSermon` type; `useRouter` from `expo-router`.
- Produces: default-exported route component at path `/(protected)/reflections` (expo-router auto-registers it as a stacked screen under the existing `(protected)` Stack).

- [ ] **Step 1: Create the page file**

Create `app/(protected)/reflections.tsx` with this exact content:

```tsx
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReflectionCard from '@/components/ReflectionCard';
import SermonModal from '@/components/SermonModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/components/ToastProvider';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import { getSermons, deleteSermon } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

export default function ReflectionsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [sermons, setSermons] = useState<SavedSermon[]>([]);
  const [selected, setSelected] = useState<SavedSermon | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toDelete, setToDelete] = useState<SavedSermon | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setSermons(await getSermons());
    } catch (error) {
      console.error('Error loading reflections:', error);
      setSermons([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePress = (sermon: SavedSermon) => {
    setSelected(sermon);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const handleDeletePress = (sermon: SavedSermon) => {
    setToDelete(sermon);
    setDeleteVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteSermon(toDelete.id);
      showSuccess('Reflection removed', 'The reflection has been deleted');
      setDeleteVisible(false);
      setToDelete(null);
      await load();
    } catch (error) {
      console.error('Error deleting reflection:', error);
      showError('Delete failed', error instanceof Error ? error.message : 'Failed to delete reflection');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteVisible(false);
    setToDelete(null);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.color.text} />
        </Pressable>
        <AppText variant="display">My Reflections</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sermons.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
            <AppText variant="caption" style={styles.emptyStateSubtext}>
              Save your first reflection to see it here
            </AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {sermons.map((sermon) => (
              <ReflectionCard
                key={sermon.id}
                sermon={sermon}
                variant="grid"
                onPress={handlePress}
                onDelete={handleDeletePress}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <SermonModal
        visible={modalVisible}
        sermon={null}
        savedSermon={selected}
        topic=""
        onClose={handleModalClose}
        onSave={load}
        loading={false}
      />
      <ConfirmationModal
        visible={deleteVisible}
        title="Delete reflection?"
        message="This reflection will be deleted permanently. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
        loading={deleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: theme.space.xxl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  emptyState: { paddingVertical: theme.space.xxl, alignItems: 'center' },
  emptyStateText: { color: theme.color.textMuted, marginBottom: theme.space.xs },
  emptyStateSubtext: { textAlign: 'center', color: theme.color.textMuted },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (If it errors that the route type is unknown, it is because typed-routes types regenerate on the next `expo start`/`prebuild`; the `as never` navigation in Task 3 avoids depending on the generated type, so a bare `tsc` here should still pass — the file itself uses no typed-route literal.)

- [ ] **Step 3: Lint the new file**

Run: `npx eslint "app/(protected)/reflections.tsx"`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/reflections.tsx"
git commit -m "feat: add full reflections View All page with read/edit and delete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Slim `home.tsx` to a capped horizontal strip

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`

**Interfaces:**
- Consumes: `ReflectionCard` (Task 1); the `/(protected)/reflections` route (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Update imports**

In `app/(protected)/(tabs)/home.tsx`:

Add these imports near the other component imports (after the `VerseOfDayCard` import line):
```tsx
import ReflectionCard from "@/components/ReflectionCard";
```

Change the sermonApi import to drop `deleteSermon` (no longer used here):
```tsx
import { getSermons } from "@/lib/sermonApi";
```

Change the React import to add `useCallback`, and add `useFocusEffect` from expo-router. Replace:
```tsx
import React, { useEffect, useState } from "react";
```
```tsx
import { useRouter } from "expo-router";
```
with:
```tsx
import React, { useCallback, useEffect, useState } from "react";
```
```tsx
import { useFocusEffect, useRouter } from "expo-router";
```

- [ ] **Step 2: Add the cap constant and remove the dead tone map**

Delete the `COLOR_TONE_MAP` block (`home.tsx:31-39`) entirely — it now lives in `ReflectionCard`. In its place add:
```tsx
// Most-recent reflections shown on home before the "View all" link appears.
const HOME_REFLECTION_CAP = 6;
```

(Leave `MOOD_DOT_COLORS` and `getTimeGreeting` untouched.)

- [ ] **Step 3: Remove the delete flow state and the tone helper**

Remove these three state declarations (`home.tsx:72-74`):
```tsx
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sermonToDelete, setSermonToDelete] = useState<SavedSermon | null>(null);
  const [deleting, setDeleting] = useState(false);
```

Remove the three delete handlers `handleDeletePress`, `handleConfirmDelete`, `handleCancelDelete` (`home.tsx:156-183`) in full.

Remove the `getSermonTone` helper (`home.tsx:185-187`) in full.

- [ ] **Step 4: Switch the initial load to focus-reload**

Replace the mount effect (`home.tsx:80-84`):
```tsx
  useEffect(() => {
    loadSavedSermons();
    loadMoodEntries();
    getWeeklySummary();
  }, []);
```
with:
```tsx
  useEffect(() => {
    loadMoodEntries();
    getWeeklySummary();
  }, []);

  // Reload reflections whenever home regains focus, so a delete performed on the
  // full "View all" page is reflected when the user navigates back here.
  useFocusEffect(
    useCallback(() => {
      loadSavedSermons();
    }, [])
  );
```

- [ ] **Step 5: Replace the reflections section markup**

Replace the entire `{/* My Sermons */}` block (`home.tsx:308-352`) with:
```tsx
        {/* My Reflections */}
        <View style={styles.sermonsSection}>
          <View style={styles.sermonsHeader}>
            <AppText variant="title" style={styles.sectionTitle}>My Reflections</AppText>
            {savedSermons.length > HOME_REFLECTION_CAP && (
              <Pressable
                onPress={() => router.push('/(protected)/reflections' as never)}
                style={styles.viewAllButton}
              >
                <AppText style={styles.viewAllText}>View all</AppText>
                <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
              </Pressable>
            )}
          </View>
          {savedSermons.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
              <AppText variant="caption" style={styles.emptyStateSubtext}>
                Save your first reflection to see it here
              </AppText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sermonsStrip}
            >
              {savedSermons.slice(0, HOME_REFLECTION_CAP).map((savedSermon) => (
                <ReflectionCard
                  key={savedSermon.id}
                  sermon={savedSermon}
                  variant="strip"
                  onPress={handleSermonCardPress}
                />
              ))}
            </ScrollView>
          )}
        </View>
```

Note: `sectionTitle` had `marginBottom` (`home.tsx:551-553`); moving it inside a header row means the row provides spacing. Keep `sectionTitle` as-is for now — Step 7 adjusts styles.

- [ ] **Step 6: Remove the home `ConfirmationModal` render**

Remove the `<ConfirmationModal ... />` block (`home.tsx:383-393`). Also remove the now-unused `ConfirmationModal` import (`home.tsx:2`).

- [ ] **Step 7: Update styles**

In the `StyleSheet.create` block, remove these now-unused styles: `sermonsGrid`, `sermonCardWrapper`, `sermonCard`, `deleteButtonContainer`, `deleteButton`, `sermonCardTitle`, `sermonCardDescription`, `sermonCardFooter` (all in `home.tsx:566-608`).

Change `sectionTitle` to drop its bottom margin (the header row now owns spacing):
```tsx
  sectionTitle: {
    // spacing handled by sermonsHeader row
  },
```

Add these styles (near `sermonsSection`):
```tsx
  sermonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: theme.font.sansMedium,
    color: theme.color.accent,
  },
  sermonsStrip: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingRight: theme.space.lg,
  },
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. In particular, confirm there are no "unused variable" or "cannot find name" errors from the removed `deleteSermon`, `ConfirmationModal`, `getSermonTone`, `COLOR_TONE_MAP`, or the removed delete state.

- [ ] **Step 9: Lint**

Run: `npx eslint "app/(protected)/(tabs)/home.tsx"`
Expected: exit 0, no output. (A pre-existing `react-hooks/exhaustive-deps` warning about `getWeeklySummary`/`loadMoodEntries` on the mount effect may remain — it predates this change and is not introduced here. Do not add new errors.)

- [ ] **Step 10: Commit**

```bash
git add "app/(protected)/(tabs)/home.tsx"
git commit -m "feat: horizontal reflections strip on home with View all link

Cap the home reflections list at 6 in a horizontal scroll; link to the new
full page past that. Move delete to the full page only and reload on focus so
cross-screen deletes are reflected.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (behavioral — requires a rebuilt dev client)

Not a task with its own commit — run after Task 3, then report results.

- [ ] `npx tsc --noEmit` clean across the whole project.
- [ ] `npx eslint components/ReflectionCard.tsx "app/(protected)/reflections.tsx" "app/(protected)/(tabs)/home.tsx"` clean.
- [ ] Drive the app: with ≤6 reflections, home shows a horizontal strip and **no** "View all". With >6, "View all →" appears and opens the full page.
- [ ] Full page shows the 2-column grid; tapping a card opens it to read/edit; the trash icon deletes with confirmation.
- [ ] Delete a reflection on the full page, navigate back to home — the deleted card is gone from the strip (focus reload).
- [ ] Tapping a strip card on home opens it to read (no delete button on strip cards).

## Self-review notes

- **Spec coverage:** ReflectionCard `strip`/`grid` + tone map → Task 1. Full page (load/grid/read/delete/empty state) → Task 2. Home strip + cap + View-all-past-6 + delete removal + focus reload + tone-map/`getSermonTone` removal → Task 3. All spec sections mapped.
- **Type consistency:** `ReflectionCardProps` defined in Task 1 is consumed with matching props in Tasks 2 (`variant="grid"`, `onDelete`) and 3 (`variant="strip"`, no `onDelete`). `SermonModal` props match its signature (`components/SermonModal.tsx:25-33`). `getSermons`/`deleteSermon` signatures match `lib/sermonApi.ts`.
- **No placeholders:** every code step contains full literal content.
