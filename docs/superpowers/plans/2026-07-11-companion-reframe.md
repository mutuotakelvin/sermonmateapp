# Companion Reframe (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "sermon"/"generate" language with warm "reflection" companion framing and surface the daily mood check-in as a first-class home action.

**Architecture:** Pure user-facing copy edits across four screens/components, plus one presentational card added to the home screen (wired to the existing mood modal state). No backend, data-model, identifier, or app-name changes.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81, TypeScript (strict). Existing warm design system (`lib/theme.ts`, `components/ui/`).

## Global Constraints

- **User-facing copy ONLY.** Do NOT rename code identifiers, types (`Sermon`, `SavedSermon`), handlers (`generateSermon`, `saveSermonApi`, `handleSermonCardPress`, …), style keys (`generateCard`, `sermonCard`, `viewSermonButtonText`, …), the Cloud Function, or the Firestore collection.
- **The app name / wordmark `SermonMate` stays** (on `login.tsx`, `sign-up.tsx`). Do NOT change it.
- **Noun:** "sermon" → **"Reflection"**. **Action/card:** "Generate a sermon" → **"Daily Reflection"**, action reads **"Reflect on this."** **Mood output stays labeled "Encouragement."**
- **Do NOT touch** `console.error(...)` strings (developer-facing), or the `sermonmate.bobakdevs.com` URLs in `profile.tsx` (tracked separately).
- **No new dependencies. No test framework** (established: this project has none and the constraint forbids adding one). Verify each task with `npx tsc --noEmit` (expect 0 errors) and `npm run lint` (baseline is 14 pre-existing problems — expect no *new* ones).
- Reuse the existing `moodModalVisible` state and `MoodModal` component; no changes to the mood flow itself.
- Avoid unescaped apostrophes inside single-quoted JS string literals (use "whatever is" phrasing in string literals; apostrophes are fine in JSX text, matching existing code like "Let's").

---

### Task 1: Copy rename across all surfaces

Pure string replacements. Four files. No structural/JSX changes — only the text inside existing strings and JSX text nodes.

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`
- Modify: `components/SermonModal.tsx`
- Modify: `components/Onboarding.native.tsx`
- Modify: `app/(protected)/(tabs)/mood.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the renamed strings Task 2 relies on (the home card title is now `Daily Reflection`; Task 2 wraps that same `<AppText>` line).

- [ ] **Step 1: home.tsx — toasts and error copy**

In `app/(protected)/(tabs)/home.tsx`, make these exact replacements:

Replace:
```
      showSuccess('Sermon generated', 'Your sermon is ready');
```
with:
```
      showSuccess('Reflection ready', 'Your reflection is ready to read');
```

Replace:
```
        showError('Network Error', 'Could not reach the sermon service. Please check your internet connection.');
```
with:
```
        showError('Network Error', 'Could not reach the reflection service. Please check your internet connection.');
```

Replace:
```
      showSuccess('Sermon deleted', 'The sermon has been deleted permanently');
```
with:
```
      showSuccess('Reflection removed', 'The reflection has been deleted');
```

Replace:
```
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete sermon';
```
with:
```
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reflection';
```

- [ ] **Step 2: home.tsx — greeting, card title, section, empty state, delete modal**

Replace:
```
          <AppText variant="caption" style={styles.subtitle}>
            Let's prepare something meaningful today
          </AppText>
```
with:
```
          <AppText variant="caption" style={styles.subtitle}>
            A quiet moment with God, one day at a time
          </AppText>
```

Replace:
```
          <AppText variant="title" style={styles.cardTitle}>Generate a sermon</AppText>
```
with:
```
          <AppText variant="title" style={styles.cardTitle}>Daily Reflection</AppText>
```

Replace:
```
          <AppText variant="title" style={styles.sectionTitle}>My Sermons</AppText>
```
with:
```
          <AppText variant="title" style={styles.sectionTitle}>My Reflections</AppText>
```

Replace:
```
              <AppText variant="body" style={styles.emptyStateText}>No saved sermons yet</AppText>
              <AppText variant="caption" style={styles.emptyStateSubtext}>
                Generate and save your first sermon to see it here
              </AppText>
```
with:
```
              <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
              <AppText variant="caption" style={styles.emptyStateSubtext}>
                Save your first reflection to see it here
              </AppText>
```

Replace:
```
        title="Delete Sermon?"
        message="This sermon will be deleted permanently. This action cannot be undone."
```
with:
```
        title="Delete reflection?"
        message="This reflection will be deleted permanently. This action cannot be undone."
```

- [ ] **Step 3: SermonModal.tsx — header label, loading, placeholder, save/update copy**

In `components/SermonModal.tsx`:

Replace:
```
  const headerLabel = isEncouragement ? 'Encouragement' : 'Sermon';
```
with:
```
  const headerLabel = isEncouragement ? 'Encouragement' : 'Reflection';
```

Replace:
```
      showError('Error', 'Please enter a title for your sermon');
```
with:
```
      showError('Error', 'Please enter a title for your reflection');
```

Replace:
```
        showSuccess('Sermon updated', 'Your sermon has been updated');
```
with:
```
        showSuccess('Reflection updated', 'Your reflection has been updated');
```

Replace:
```
        showSuccess('Sermon saved', 'Your sermon has been saved');
```
with:
```
        showSuccess('Reflection saved', 'Your reflection has been saved');
```

Replace:
```
      showError('Error', error.message || 'Failed to save sermon');
```
with:
```
      showError('Error', error.message || 'Failed to save reflection');
```

Replace:
```
            <AppText variant="body" style={styles.loadingText}>Preparing your sermon…</AppText>
```
with:
```
            <AppText variant="body" style={styles.loadingText}>{isEncouragement ? 'Creating your encouragement…' : 'Preparing your reflection…'}</AppText>
```

Replace:
```
                placeholder="Sermon title"
```
with:
```
                placeholder="Reflection title"
```

Replace:
```
                label={savedSermon ? 'Update' : 'Save sermon'}
```
with:
```
                label={savedSermon ? 'Update' : 'Save reflection'}
```

- [ ] **Step 4: Onboarding.native.tsx — screen titles/descriptions**

In `components/Onboarding.native.tsx`, replace:
```
      title: 'Generate Sermons',
      description: 'Create insightful, AI-generated sermons for your personal study and reflection with just a few taps.',
```
with:
```
      title: 'Daily Reflections',
      description: 'Get a short, personalized reflection on Scripture for whatever is on your heart, in a few taps.',
```

Replace:
```
      title: 'Share Sermons',
```
with:
```
      title: 'Share Reflections',
```

Replace:
```
      title: 'Save Sermons',
      description: 'Organize and save all your favorite sermons in one place. Access them anytime, anywhere.',
```
with:
```
      title: 'Save Reflections',
      description: 'Keep your favorite reflections in one place. Access them anytime, anywhere.',
```

- [ ] **Step 5: mood.tsx — view button**

In `app/(protected)/(tabs)/mood.tsx`, replace:
```
                        <AppText style={modalStyles.viewSermonButtonText}>View Full Sermon</AppText>
```
with:
```
                        <AppText style={modalStyles.viewSermonButtonText}>View Encouragement</AppText>
```

- [ ] **Step 6: Verify no user-facing "sermon" copy remains and types/lint pass**

Run:
```bash
grep -rniE "\bsermon" app components --include="*.tsx" | grep -iE "'[A-Z][^']*sermon|\"[A-Z][^\"]*sermon|>[^<]*[Ss]ermon<|title=\"[^\"]*[Ss]ermon|placeholder=\"[^\"]*[Ss]ermon" | grep -viE "console\.error|SermonMate"
```
Expected: no matches (the only remaining `sermon` references are identifiers, style keys, `console.error`, or the `SermonMate` wordmark).

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

Run:
```bash
npm run lint
```
Expected: no new problems beyond the 14 pre-existing baseline.

- [ ] **Step 7: Commit**

```bash
git add app/\(protected\)/\(tabs\)/home.tsx components/SermonModal.tsx components/Onboarding.native.tsx app/\(protected\)/\(tabs\)/mood.tsx
git commit -m "feat: rename sermon copy to reflection across app"
```

---

### Task 2: Home daily-flow — mood prompt card + reflect card subtitle

Adds a first-class "How are you feeling today?" card under the verse (opening the existing mood flow), removes the now-redundant in-card Mood chip, and adds a subtitle under the "Daily Reflection" card title. Presentational only; reuses `setMoodModalVisible`.

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`

**Interfaces:**
- Consumes from Task 1: the home card title now reads `Daily Reflection` (this task wraps that `<AppText>` with a subtitle).
- Produces: nothing for later tasks.

- [ ] **Step 1: Add the mood prompt card under the Verse of the Day card**

In `app/(protected)/(tabs)/home.tsx`, find:
```
        {/* Verse of the Day */}
        <VerseOfDayCard />

        {/* Generate a Sermon Card */}
```
Replace it with (insert the new card between them):
```
        {/* Verse of the Day */}
        <VerseOfDayCard />

        {/* Daily mood check-in prompt */}
        <Pressable onPress={() => setMoodModalVisible(true)}>
          <Card style={styles.moodPromptCard}>
            <View style={styles.moodPromptContent}>
              <View style={styles.moodPromptIconWrap}>
                <Ionicons name="heart-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.moodPromptText}>
                <AppText variant="title" style={styles.moodPromptTitle}>How are you feeling today?</AppText>
                <AppText variant="caption" style={styles.moodPromptSubtitle}>A quick check-in — takes a few seconds.</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Daily Reflection Card */}
```

- [ ] **Step 2: Add a subtitle under the "Daily Reflection" card title**

Find (result of Task 1):
```
          <AppText variant="title" style={styles.cardTitle}>Daily Reflection</AppText>
```
Replace with:
```
          <View style={styles.cardTitleGroup}>
            <AppText variant="title" style={styles.cardTitle}>Daily Reflection</AppText>
            <AppText variant="caption" style={styles.cardSubtitle}>Reflect on Scripture around whatever's on your heart.</AppText>
          </View>
```

- [ ] **Step 3: Remove the redundant in-card Mood chip**

Find:
```
          <View style={styles.chipsRow}>
            {/* Mood Chip — accent-filled, opens mood flow */}
            <Pressable
              style={styles.moodChip}
              onPress={() => setMoodModalVisible(true)}
            >
              <Ionicons name="add" size={16} color={theme.color.accentText} />
              <AppText style={styles.moodChipText}>Mood</AppText>
            </Pressable>
            {chips.map((c) => (
```
Replace with:
```
          <View style={styles.chipsRow}>
            {chips.map((c) => (
```

- [ ] **Step 4: Add the new styles**

In the `StyleSheet.create({ ... })` block, find:
```
  cardTitle: {
    // inherits AppText variant="title"
  },
```
Replace with:
```
  cardTitleGroup: {
    gap: 2,
  },
  cardTitle: {
    // inherits AppText variant="title"
  },
  cardSubtitle: {
    color: theme.color.textMuted,
  },
  moodPromptCard: {
    marginTop: theme.space.lg,
  },
  moodPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  moodPromptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPromptText: {
    flex: 1,
    gap: 2,
  },
  moodPromptTitle: {
    // inherits AppText variant="title"
  },
  moodPromptSubtitle: {
    color: theme.color.textMuted,
  },
```

- [ ] **Step 5: Verify the moodChip styles are no longer referenced, then types/lint pass**

Confirm the removed chip no longer leaves a dangling reference error (the `moodChip`/`moodChipText` style keys may now be unused — leaving unused style keys is harmless and lint does not flag them; do NOT delete other code to chase this).

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

Run:
```bash
npm run lint
```
Expected: no new problems beyond the 14 pre-existing baseline.

- [ ] **Step 6: Commit**

```bash
git add app/\(protected\)/\(tabs\)/home.tsx
git commit -m "feat: surface daily mood check-in as first-class home card"
```

---

## Notes for the implementer

- `Card`, `AppText`, `Pressable`, `View`, `Ionicons`, `theme`, and `setMoodModalVisible` are all already imported/defined in `home.tsx` — no new imports needed. Verify before adding any.
- `theme.color.blush`, `theme.color.accent`, `theme.color.textMuted`, `theme.space.lg`, `theme.space.md`, `theme.radius.sm` are all already used elsewhere in this file (the Wallpaper card uses the same icon-wrap pattern) — reuse as-is.
- This project cannot run unit tests; verification is `tsc` + `lint` + on-device review. Do not scaffold a test runner.
