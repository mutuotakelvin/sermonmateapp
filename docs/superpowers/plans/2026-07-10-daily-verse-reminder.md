# Daily Verse Reminder + Verse of the Day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily local notification with a memory verse at a user-chosen time, plus a polished Verse of the Day screen and home-screen card.

**Architecture:** Fully client-side (no backend). A bundled public-domain verse dataset (WEB + KJV) behind a `VerseSource` interface; a Zustand/AsyncStorage settings store; an `expo-notifications` wrapper that keeps a rolling 14-day window of scheduled notifications carrying each day's actual verse text; a gradient hero screen using the Lora serif. Spec: `docs/superpowers/specs/2026-07-10-daily-verse-reminder-design.md`.

**Tech Stack:** Expo SDK 54 / expo-router 6, React Native 0.81, Zustand, AsyncStorage, expo-notifications, `@react-native-community/datetimepicker`, `@expo-google-fonts/lora`, expo-linear-gradient, react-native-reanimated.

## Global Constraints

- **NO automated test framework** exists and must not be added. "Verify" = `npx tsc --noEmit` and `npm run lint` with NO NEW errors. Baseline is NOT clean: 8 pre-existing tsc errors (`components/onboarding` via `app/(public)/onboarding.tsx` and `components/gradient.tsx`) and 27 pre-existing lint problems — out of scope; only ensure your change adds none.
- Install React Native / Expo packages with `npx expo install <pkg>` (never plain `npm install`) so versions match SDK 54.
- Do NOT touch `functions/`, `lib/sermonApi.ts`, `lib/stores/auth.ts`, or `firebase` config — unrelated to this feature.
- Verse text must come from a public-domain source (bible-api.com serving WEB and KJV), fetched by script — never typed from memory.
- Visual constants (exact values from the spec):
  - Sky & sea gradient — light: `['#22D3EE', '#0891B2']`, dark: `['#0E7490', '#155E75']`; text on gradient is white, reference at 90% white.
  - Verse text font: `Lora_500Medium` (body) / `Lora_600SemiBold` (emphasis); UI chrome stays on system sans.
  - Reference label: uppercase, `letterSpacing: 1.5`, small.
  - Card radius 16, entrance motion 300–400ms, skipped under reduced motion; touch targets ≥ 44px.
- Notification channel id: `daily-verse`. Notification `data` payload: `{ screen: 'verse' }`. Reminder defaults: disabled, 08:00. Translation default: `'WEB'`.
- Rolling window length: 14 days.

---

### Task 1: Bundled verse data + verse source

**Files:**
- Create: `scripts/generate-verse-data.mjs` (one-off generator, committed for reproducibility)
- Create: `lib/verseData.ts` (generated output, committed)
- Create: `lib/verses.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2–6):
  - `lib/verseData.ts`: `export type Translation = 'WEB' | 'KJV'`, `export interface BundledVerse { id: string; reference: string; text: Record<Translation, string> }`, `export const VERSES: BundledVerse[]`.
  - `lib/verses.ts`: `export interface DailyVerse { verse: BundledVerse; date: Date }`, `export interface VerseSource { getVerseForDate(date: Date): BundledVerse; getUpcoming(from: Date, days: number): DailyVerse[] }`, `export const bundledVerseSource: VerseSource`, `export function formatVerseForShare(v: BundledVerse, t: Translation): string`.

- [ ] **Step 1: Write the generator script**

Create `scripts/generate-verse-data.mjs`:

```js
// One-off generator: fetches public-domain verse text (WEB + KJV) from
// bible-api.com for a curated memory-verse list and emits lib/verseData.ts.
// Run: node scripts/generate-verse-data.mjs
// Scripture text is fetched, never hand-typed — accuracy matters.

const REFERENCES = [
  'John 3:16', 'Jeremiah 29:11', 'Philippians 4:13', 'Psalm 23:1',
  'Proverbs 3:5-6', 'Romans 8:28', 'Isaiah 41:10', 'Matthew 6:33',
  'Joshua 1:9', 'Psalm 46:1', 'Galatians 5:22-23', 'Hebrews 11:1',
  '2 Timothy 1:7', 'Psalm 119:105', 'Romans 12:2', '1 Corinthians 10:13',
  'Philippians 4:6-7', 'Matthew 11:28', 'Isaiah 40:31', 'Psalm 37:4',
  'John 14:6', 'Romans 10:9', 'Ephesians 2:8-9', '2 Corinthians 5:17',
  'Psalm 27:1', 'Proverbs 18:10', 'John 8:32', 'Colossians 3:23',
  '1 Peter 5:7', 'James 1:5', 'Psalm 34:8', 'Matthew 5:16',
  'Romans 5:8', 'John 1:1', 'Genesis 1:1', 'Psalm 139:14',
  'Isaiah 53:5', 'Micah 6:8', 'Matthew 28:19-20', 'Acts 1:8',
  'Romans 6:23', '1 John 1:9', 'Psalm 121:1-2', 'Proverbs 22:6',
  'Ecclesiastes 3:1', 'Lamentations 3:22-23', 'Zephaniah 3:17', 'Malachi 3:10',
  'Matthew 7:7', 'Mark 12:30', 'Luke 6:31', 'John 15:5',
  '1 Corinthians 13:4-7', '2 Corinthians 12:9', 'Ephesians 6:10-11', 'Philippians 1:6',
  'Colossians 3:2', '1 Thessalonians 5:16-18', 'Hebrews 4:16', 'James 4:7',
];

const TRANSLATIONS = { WEB: 'web', KJV: 'kjv' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(ref) {
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function cleanText(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

async function fetchVerse(ref, translationParam) {
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translationParam}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      console.log(`  rate limited, waiting 30s (attempt ${attempt})...`);
      await sleep(30000);
      continue;
    }
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const json = await res.json();
    if (!json.text || !json.text.trim()) throw new Error(`${url} -> empty text`);
    return cleanText(json.text);
  }
  throw new Error(`${url} -> rate limited after 3 attempts`);
}

const verses = [];
for (const ref of REFERENCES) {
  console.log(`Fetching ${ref}...`);
  const web = await fetchVerse(ref, TRANSLATIONS.WEB);
  await sleep(1500);
  const kjv = await fetchVerse(ref, TRANSLATIONS.KJV);
  await sleep(1500);
  verses.push({ id: slugify(ref), reference: ref, text: { WEB: web, KJV: kjv } });
}

// Sanity checks before emitting
if (verses.length !== REFERENCES.length) throw new Error('missing verses');
for (const v of verses) {
  if (v.text.WEB.length < 20 || v.text.KJV.length < 20) {
    throw new Error(`suspiciously short text for ${v.reference}`);
  }
}
const ids = new Set(verses.map((v) => v.id));
if (ids.size !== verses.length) throw new Error('duplicate ids');

const header = `// GENERATED by scripts/generate-verse-data.mjs — do not hand-edit verse text.
// Source: bible-api.com (World English Bible + King James Version, public domain).

export type Translation = 'WEB' | 'KJV';

export interface BundledVerse {
  id: string;
  reference: string;
  text: Record<Translation, string>;
}

export const VERSES: BundledVerse[] = `;

const { writeFileSync } = await import('node:fs');
writeFileSync('lib/verseData.ts', header + JSON.stringify(verses, null, 2) + ';\n');
console.log(`Wrote lib/verseData.ts with ${verses.length} verses.`);
```

- [ ] **Step 2: Run the generator**

Run: `cd /home/bobak/hobby/sermonmateapp && node scripts/generate-verse-data.mjs`
Expected: `Wrote lib/verseData.ts with 60 verses.` (takes ~3–4 minutes due to polite rate limiting). If bible-api.com is unreachable, STOP and report BLOCKED — do not fabricate verse text.

- [ ] **Step 3: Spot-check the output**

Run: `node -e "const t=require('fs').readFileSync('lib/verseData.ts','utf8'); const m=t.match(/John 3:16[\s\S]{0,400}/); console.log(m[0])"`
Expected: John 3:16 entry shows real WEB and KJV text ("For God so loved the world..."). Eyeball 3 more entries in the file for plausible scripture text in both translations.

- [ ] **Step 4: Write lib/verses.ts**

```ts
import { BundledVerse, Translation, VERSES } from './verseData';

export interface DailyVerse {
  verse: BundledVerse;
  date: Date;
}

export interface VerseSource {
  getVerseForDate(date: Date): BundledVerse;
  getUpcoming(from: Date, days: number): DailyVerse[];
}

// Defensive fallback if VERSES were ever empty (spec: cannot crash).
const FALLBACK: BundledVerse = {
  id: 'john-3-16',
  reference: 'John 3:16',
  text: {
    WEB: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  },
};

// Days since epoch in LOCAL calendar time, so the verse flips at local midnight
// and is the same for every user on a given calendar date.
function localDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

export const bundledVerseSource: VerseSource = {
  getVerseForDate(date: Date): BundledVerse {
    if (VERSES.length === 0) return FALLBACK;
    return VERSES[localDayNumber(date) % VERSES.length];
  },

  getUpcoming(from: Date, days: number): DailyVerse[] {
    const result: DailyVerse[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      result.push({ verse: this.getVerseForDate(date), date });
    }
    return result;
  },
};

export function formatVerseForShare(verse: BundledVerse, translation: Translation): string {
  return `"${verse.text[translation]}"\n— ${verse.reference} (${translation})`;
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → Expected: `8` (baseline, no new).
Run: `npm run lint 2>&1 | tail -2` → Expected: same 27 pre-existing problems.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-verse-data.mjs lib/verseData.ts lib/verses.ts
git commit -m "Add bundled public-domain verse data (WEB+KJV) and deterministic daily verse source"
```

---

### Task 2: Verse settings store

**Files:**
- Create: `lib/stores/verse.ts`

**Interfaces:**
- Consumes: `Translation` from `lib/verseData.ts` (Task 1).
- Produces (used by Tasks 3–5): `useVerseStore` with state `{ translation: Translation; reminderEnabled: boolean; reminderHour: number; reminderMinute: number; initialized: boolean }` and actions `initializeVerseSettings(): Promise<void>`, `setTranslation(t: Translation): Promise<void>`, `setReminderEnabled(enabled: boolean): Promise<void>`, `setReminderTime(hour: number, minute: number): Promise<void>`.

- [ ] **Step 1: Write the store** (mirrors `lib/stores/theme.ts` persistence pattern)

```ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Translation } from '../verseData';

interface VerseSettingsState {
  translation: Translation;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  initialized: boolean;

  initializeVerseSettings: () => Promise<void>;
  setTranslation: (translation: Translation) => Promise<void>;
  setReminderEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
}

const STORAGE_KEY = '@verse_settings';

interface PersistedSettings {
  translation: Translation;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

async function persist(state: PersistedSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving verse settings:', error);
  }
}

export const useVerseStore = create<VerseSettingsState>((set, get) => ({
  translation: 'WEB',
  reminderEnabled: false,
  reminderHour: 8,
  reminderMinute: 0,
  initialized: false,

  initializeVerseSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedSettings>;
        set({
          translation: saved.translation === 'KJV' ? 'KJV' : 'WEB',
          reminderEnabled: !!saved.reminderEnabled,
          reminderHour: typeof saved.reminderHour === 'number' ? saved.reminderHour : 8,
          reminderMinute: typeof saved.reminderMinute === 'number' ? saved.reminderMinute : 0,
        });
      }
    } catch (error) {
      console.error('Error loading verse settings:', error);
    } finally {
      set({ initialized: true });
    }
  },

  setTranslation: async (translation: Translation) => {
    set({ translation });
    const { reminderEnabled, reminderHour, reminderMinute } = get();
    await persist({ translation, reminderEnabled, reminderHour, reminderMinute });
  },

  setReminderEnabled: async (reminderEnabled: boolean) => {
    set({ reminderEnabled });
    const { translation, reminderHour, reminderMinute } = get();
    await persist({ translation, reminderEnabled, reminderHour, reminderMinute });
  },

  setReminderTime: async (reminderHour: number, reminderMinute: number) => {
    set({ reminderHour, reminderMinute });
    const { translation, reminderEnabled } = get();
    await persist({ translation, reminderEnabled, reminderHour, reminderMinute });
  },
}));
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `8`. Run: `npm run lint 2>&1 | tail -2` → baseline.

- [ ] **Step 3: Commit**

```bash
git add lib/stores/verse.ts
git commit -m "Add persisted verse settings store (translation + reminder prefs)"
```

---

### Task 3: Notifications module + app config

**Files:**
- Create: `lib/notifications.ts`
- Modify: `app.config.js` (plugin + Android permission)
- Modify: `package.json` (via `npx expo install expo-notifications`)

**Interfaces:**
- Consumes: `bundledVerseSource` from `lib/verses.ts`; `Translation` from `lib/verseData.ts` (Task 1).
- Produces (used by Tasks 4–5):
  - `configureNotifications(): void` — foreground handler + Android channel; safe to call anywhere, guards non-device platforms.
  - `requestVersePermission(): Promise<boolean>`
  - `rescheduleDailyVerse(settings: { reminderEnabled: boolean; reminderHour: number; reminderMinute: number; translation: Translation }): Promise<boolean>` — cancels existing schedule; if enabled + permitted, schedules the next 14 days; returns whether scheduling is active (false ⇒ permission denied or disabled).

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-notifications`
Expected: `expo-notifications@~0.32.x` added to package.json.

- [ ] **Step 2: Write lib/notifications.ts**

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { bundledVerseSource } from './verses';
import type { Translation } from './verseData';

const CHANNEL_ID = 'daily-verse';
const WINDOW_DAYS = 14;

export interface ReminderSettings {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  translation: Translation;
}

// Call once at app startup.
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Verse',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch((error) => console.error('Error creating notification channel:', error));
  }
}

export async function requestVersePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Cancel-and-reschedule the rolling window. Idempotent — call on app open
// and whenever reminder settings change. Returns true when a schedule is active.
export async function rescheduleDailyVerse(settings: ReminderSettings): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.reminderEnabled) return false;

    const granted = await requestVersePermission();
    if (!granted) return false;

    const now = new Date();
    const upcoming = bundledVerseSource.getUpcoming(now, WINDOW_DAYS);

    for (const { verse, date } of upcoming) {
      const fireDate = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        settings.reminderHour, settings.reminderMinute, 0
      );
      if (fireDate <= now) continue; // today's slot already passed

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Verse of the Day',
          body: `"${verse.text[settings.translation]}" — ${verse.reference}`,
          data: { screen: 'verse' },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: CHANNEL_ID,
        },
      });
    }
    return true;
  } catch (error) {
    console.error('Error scheduling daily verse notifications:', error);
    return false;
  }
}
```

- [ ] **Step 3: Update app.config.js**

In the `plugins` array (after the `expo-splash-screen` entry), add:

```js
      [
        "expo-notifications",
        {
          color: "#0891B2"
        }
      ]
```

In `android.permissions`, add `"android.permission.POST_NOTIFICATIONS"` (Android 13+ runtime permission; expo-notifications also declares it, explicit is harmless and documents intent).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `8`. Run: `npm run lint 2>&1 | tail -2` → baseline. Run: `node -e "require('./app.config.js')" 2>/dev/null || npx expo config --type public > /dev/null && echo CONFIG_OK` → `CONFIG_OK`.

- [ ] **Step 5: Commit**

```bash
git add lib/notifications.ts app.config.js package.json package-lock.json
git commit -m "Add daily-verse notification scheduling (rolling 14-day local window)"
```

---

### Task 4: Verse of the Day screen

**Files:**
- Create: `app/(protected)/verse.tsx`
- Modify: `package.json` (via `npx expo install @react-native-community/datetimepicker` and `npx expo install @expo-google-fonts/lora`)

**Interfaces:**
- Consumes: `bundledVerseSource`, `formatVerseForShare` (Task 1); `useVerseStore` (Task 2); `rescheduleDailyVerse` (Task 3); existing `useThemeStore` (`lib/stores/theme.ts`).
- Produces: route `/verse` (expo-router auto-registers files under `app/(protected)/`). Task 5 deep-links to it; Task 6's card navigates to it. Font families `Lora_500Medium` / `Lora_600SemiBold` are loaded globally in Task 5 — this screen just references them (RN silently falls back to system font until Task 5 lands; acceptable mid-plan state).

- [ ] **Step 1: Install dependencies**

Run: `npx expo install @react-native-community/datetimepicker @expo-google-fonts/lora expo-font`
Expected: all added at SDK-54-compatible versions (expo-font is already present; included for version alignment).

- [ ] **Step 2: Write the screen**

Create `app/(protected)/verse.tsx`:

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/ToastProvider';
import { rescheduleDailyVerse } from '@/lib/notifications';
import { useThemeStore } from '@/lib/stores/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource, formatVerseForShare } from '@/lib/verses';
import type { Translation } from '@/lib/verseData';

const GRADIENT_LIGHT = ['#22D3EE', '#0891B2'] as const;
const GRADIENT_DARK = ['#0E7490', '#155E75'] as const;
const TRANSLATIONS: Translation[] = ['WEB', 'KJV'];

export default function VerseScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { showSuccess, showError } = useToast();
  const reducedMotion = useReducedMotion();
  const {
    translation, reminderEnabled, reminderHour, reminderMinute,
    setTranslation, setReminderEnabled, setReminderTime,
  } = useVerseStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const today = useMemo(() => new Date(), []);
  const verse = useMemo(() => bundledVerseSource.getVerseForDate(today), [today]);

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Keep the notification schedule in sync with settings while on this screen.
  useEffect(() => {
    rescheduleDailyVerse({ reminderEnabled, reminderHour, reminderMinute, translation })
      .then((active) => setPermissionDenied(reminderEnabled && !active));
  }, [reminderEnabled, reminderHour, reminderMinute, translation]);

  const handleShare = async () => {
    try {
      await Share.share({ message: formatVerseForShare(verse, translation) });
    } catch {
      showError('Share failed', 'Could not open the share sheet');
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(formatVerseForShare(verse, translation));
    showSuccess('Copied', 'Verse copied to clipboard');
  };

  const timeLabel = new Date(0, 0, 0, reminderHour, reminderMinute)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#111827'} />
        </Pressable>
        <View>
          <Text style={styles.title}>Verse of the Day</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
      </View>

      {/* Hero verse card */}
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400)}>
        <LinearGradient
          colors={isDark ? GRADIENT_DARK : GRADIENT_LIGHT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.verseText}>{verse.text[translation]}</Text>
          <Text style={styles.verseReference}>{verse.reference}</Text>

          <View style={styles.actionsRow}>
            <Pressable onPress={handleShare} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={handleCopy} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="copy-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Translation toggle */}
      <View style={styles.segment}>
        {TRANSLATIONS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTranslation(t)}
            style={[styles.segmentItem, translation === t && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, translation === t && styles.segmentTextActive]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Reminder settings */}
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelWrap}>
            <Text style={styles.settingLabel}>Daily reminder</Text>
            <Text style={styles.settingHint}>Get a memory verse every day</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: '#0891B2' }}
          />
        </View>

        {reminderEnabled && (
          <Pressable style={styles.settingRow} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.settingLabel}>Reminder time</Text>
            <Text style={styles.timeValue}>{timeLabel}</Text>
          </Pressable>
        )}

        {permissionDenied && (
          <Text style={styles.permissionNote}>
            Turn on notifications for SermonMate in your device Settings to get your daily verse.
          </Text>
        )}
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(0, 0, 0, reminderHour, reminderMinute)}
          mode="time"
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) {
              setReminderTime(selected.getHours(), selected.getMinutes());
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#111827' : '#fff', paddingHorizontal: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: isDark ? '#fff' : '#111827' },
    date: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    heroCard: {
      borderRadius: 16, padding: 28, marginTop: 8,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    verseText: {
      fontFamily: 'Lora_500Medium', fontSize: 22, lineHeight: 34,
      color: '#fff', textAlign: 'center',
    },
    verseReference: {
      marginTop: 18, textAlign: 'center', color: 'rgba(255,255,255,0.9)',
      fontSize: 13, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
    actionButton: {
      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    segment: {
      flexDirection: 'row', marginTop: 20, borderRadius: 12, padding: 4,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    },
    segmentItem: {
      flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    },
    segmentItemActive: { backgroundColor: isDark ? '#374151' : '#fff' },
    segmentText: { fontSize: 14, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' },
    segmentTextActive: { color: isDark ? '#fff' : '#111827' },
    settingsCard: {
      marginTop: 20, borderRadius: 16, padding: 16, gap: 4,
      backgroundColor: isDark ? '#1f2937' : '#F9FAFB',
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      minHeight: 44,
    },
    settingLabelWrap: { flex: 1, paddingRight: 12 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: isDark ? '#fff' : '#111827' },
    settingHint: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    timeValue: { fontSize: 16, fontWeight: '600', color: '#0891B2' },
    permissionNote: { marginTop: 8, fontSize: 13, lineHeight: 18, color: '#F59E0B' },
  });
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `8`. Run: `npm run lint 2>&1 | tail -2` → baseline.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/verse.tsx" package.json package-lock.json
git commit -m "Add Verse of the Day screen (gradient hero, translation toggle, reminder settings)"
```

---

### Task 5: Root wiring — fonts, notification bootstrap, deep link, layout consolidation

**Files:**
- Delete: `app/_layout.native.tsx` (now a duplicate of `_layout.tsx`; its ElevenLabs raison d'être was removed in the Firebase migration — one root layout means fonts/notifications are wired once)
- Modify: `app/_layout.tsx` (full replacement below)

**Interfaces:**
- Consumes: `configureNotifications`, `rescheduleDailyVerse` (Task 3); `useVerseStore` (Task 2); fonts from `@expo-google-fonts/lora` (installed in Task 4).
- Produces: Lora fonts available app-wide as `Lora_500Medium`/`Lora_600SemiBold`; notification taps with `data.screen === 'verse'` route to `/verse`; the 14-day window tops up on every app foreground.

- [ ] **Step 1: Delete the duplicate native layout**

```bash
git rm app/_layout.native.tsx
```

- [ ] **Step 2: Replace app/_layout.tsx**

```tsx
import 'react-native-url-polyfill/auto';
import { Lora_500Medium, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ToastProvider } from '@/components/ToastProvider';
import { configureNotifications, rescheduleDailyVerse } from '@/lib/notifications';
import { useVerseStore } from '@/lib/stores/verse';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({ Lora_500Medium, Lora_600SemiBold });
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const { initialized, initializeVerseSettings } = useVerseStore();

  // Hide the splash once fonts are ready (or failed — don't block the app on a font).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Load verse settings, then keep the rolling notification window topped up
  // on every app foreground.
  useEffect(() => {
    initializeVerseSettings();
  }, [initializeVerseSettings]);

  useEffect(() => {
    if (!initialized) return;

    const topUp = () => {
      const { reminderEnabled, reminderHour, reminderMinute, translation } =
        useVerseStore.getState();
      rescheduleDailyVerse({ reminderEnabled, reminderHour, reminderMinute, translation });
    };

    topUp();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') topUp();
    });
    return () => sub.remove();
  }, [initialized]);

  // Route notification taps (cold start and background) to the verse screen.
  useEffect(() => {
    const screen =
      lastNotificationResponse?.notification.request.content.data?.screen;
    if (screen === 'verse') {
      router.push('/verse');
    }
  }, [lastNotificationResponse, router]);

  if (!fontsLoaded && !fontError) {
    return null; // splash stays visible
  }

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
  );
}
```

Note for the implementer: `router.push('/verse')` targets `app/(protected)/verse.tsx`; if the user is signed out, the protected layout's existing redirect sends them to login — no extra guard needed here. If typed routes complain about `'/verse'`, use `router.push('/(protected)/verse' as never)` — but try the plain form first.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `8`. Run: `npm run lint 2>&1 | tail -2` → baseline.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "Wire Lora fonts, notification bootstrap, verse deep link; drop duplicate native layout"
```

---

### Task 6: Home-screen Verse of the Day card

**Files:**
- Create: `components/VerseOfDayCard.tsx`
- Modify: `app/(protected)/(tabs)/home.tsx` (one import + one component insertion)

**Interfaces:**
- Consumes: `bundledVerseSource` (Task 1); `useVerseStore` (Task 2); `useThemeStore`; route `/verse` (Task 4).
- Produces: `<VerseOfDayCard />` (no props) — self-contained: reads theme + translation from stores, routes on press.

- [ ] **Step 1: Write the card**

Create `components/VerseOfDayCard.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeStore } from '@/lib/stores/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource } from '@/lib/verses';

const GRADIENT_LIGHT = ['#22D3EE', '#0891B2'] as const;
const GRADIENT_DARK = ['#0E7490', '#155E75'] as const;

export default function VerseOfDayCard() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { translation } = useVerseStore();
  const isDark = theme === 'dark';

  const verse = useMemo(() => bundledVerseSource.getVerseForDate(new Date()), []);

  return (
    <Pressable onPress={() => router.push('/verse')} style={styles.pressable}>
      <LinearGradient
        colors={isDark ? GRADIENT_DARK : GRADIENT_LIGHT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.snippet} numberOfLines={2}>
          {verse.text[translation]}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.reference}>{verse.reference}</Text>
          <View style={styles.ctaRow}>
            <Text style={styles.cta}>Read today's verse</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: 16, marginTop: 12 },
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  snippet: { fontFamily: 'Lora_500Medium', fontSize: 15, lineHeight: 23, color: '#fff' },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
  },
  reference: {
    color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cta: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 2: Insert into home.tsx**

In `app/(protected)/(tabs)/home.tsx`:

a) Add the import (with the other component imports at the top):

```tsx
import VerseOfDayCard from "@/components/VerseOfDayCard";
```

b) Insert the card between the header section and the Generate card — after the `</View>` that closes `dynamicStyles.headerSection` and before the `{/* Fixed Generate Card */}` comment:

```tsx
        {/* Verse of the Day */}
        <VerseOfDayCard />
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → `8`. Run: `npm run lint 2>&1 | tail -2` → baseline.

- [ ] **Step 4: Commit**

```bash
git add components/VerseOfDayCard.tsx "app/(protected)/(tabs)/home.tsx"
git commit -m "Add Verse of the Day card to home screen"
```

---

### Task 7: Manual verification pass (human, on device)

No files. Requires a dev build (`npx expo start` + dev client, or a fresh `expo run:android`) because `expo-notifications` scheduling does not work in Expo Go on Android SDK 53+.

- [ ] 1. Open the app → home shows the Verse of the Day card with today's verse; tapping opens the Verse screen with the same verse and date.
- [ ] 2. Toggle WEB/KJV → verse text changes in place; kill + relaunch → choice persisted.
- [ ] 3. Enable the daily reminder → OS permission prompt appears; accept. Set the time ~2 minutes ahead → notification banner fires showing the actual verse text + reference in the chosen translation.
- [ ] 4. Tap the notification → app opens on the Verse of the Day screen (test both from background and fully killed).
- [ ] 5. Disable the reminder → no notification fires at the set time.
- [ ] 6. Deny the OS permission (via device settings), re-enable reminder → amber inline note appears; screen still fully usable.
- [ ] 7. Share → share sheet opens with `"<verse>" — <reference> (<translation>)`. Copy → toast + clipboard contains the same.
- [ ] 8. Dark mode → gradient switches to the dark variant; all text readable.
- [ ] 9. Verse text renders in the Lora serif on both the card and the screen (visibly different from UI sans).
