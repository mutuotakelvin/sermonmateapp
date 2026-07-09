# Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SermonMate's Laravel backend with Firebase Auth + Firestore (free Spark plan), remove deferred features (voice sessions, credits purchase), and prep a Play Store testing release.

**Architecture:** Thin adapter swap — the internals of `lib/stores/auth.ts` and `lib/sermonApi.ts` move to the Firebase JS SDK while their exported signatures stay identical, so screens barely change. A new `lib/firebase.ts` is the single init point. Spec: `docs/superpowers/specs/2026-07-09-firebase-migration-design.md`.

**Tech Stack:** Expo SDK 54 / expo-router 6, React Native 0.81, `firebase@12` (JS SDK — already installed), Zustand, AsyncStorage.

## Global Constraints

- Free Spark plan only: no Cloud Functions, no Firebase Hosting, no Analytics (`getAnalytics` does not work in React Native — never import it).
- Exported function signatures of `lib/sermonApi.ts` and the `useAuthStore` interface must not change, except: `User.id` becomes `string`, and `token` is removed from the store.
- **No automated test infra exists in this repo** (no jest). Each task is verified with `npx tsc --noEmit` and `npm run lint`, plus a full manual pass in Task 6. Do not add a test framework.
- Package manager: use `npm` (both `package-lock.json` and `bun.lockb` exist; npm is what the repo's scripts use — `bun.lockb` may go stale, that's acceptable).
- Firebase config values (apiKey etc.) are public identifiers — safe to commit in `app.config.js`.
- The Gemini key is secret — never hardcode it; env var only.
- Firebase project: `sermonmate-919e5` (already created by the user).

---

### Task 1: Remove deferred features (voice sessions, credits purchase) and their dependencies

**Files:**
- Delete: `app/(protected)/session.tsx`
- Delete: `app/(protected)/summary.tsx`
- Delete: `app/(protected)/credits.tsx`
- Delete: `app/api/conversations+api.ts`
- Delete: `components/screens/SessionScreen.tsx`
- Delete: `components/screens/SummaryScreen.tsx`
- Delete: `lib/stores/credits.ts`
- Delete: `utils/sessions.ts`
- Delete: `utils/types.ts`
- Delete: `WEBRTC_FIXES.md`, `WEBRTC_TROUBLESHOOTING.md`, `CONVERSATION_ISSUE_SUMMARY.md`
- Modify: `app/(protected)/(tabs)/profile.tsx` (remove credits UI)
- Modify: `package.json` (via npm uninstall)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a codebase with no references to ElevenLabs/LiveKit/credits. Later tasks assume these files are gone.

Context for the implementer: `session.tsx` and `summary.tsx` are already orphaned (nothing navigates to them). The only live entry point to removed features is the "Manage Credits" button in `profile.tsx`. The LiveKit/webrtc config plugins are **not** referenced in `app.config.js` `plugins` (only in package.json), so uninstalling is safe.

- [ ] **Step 1: Delete the files**

```bash
git rm "app/(protected)/session.tsx" "app/(protected)/summary.tsx" "app/(protected)/credits.tsx" \
  "app/api/conversations+api.ts" \
  components/screens/SessionScreen.tsx components/screens/SummaryScreen.tsx \
  lib/stores/credits.ts utils/sessions.ts utils/types.ts \
  WEBRTC_FIXES.md WEBRTC_TROUBLESHOOTING.md CONVERSATION_ISSUE_SUMMARY.md
rmdir app/api 2>/dev/null || true
```

- [ ] **Step 2: Remove credits UI from profile.tsx**

In `app/(protected)/(tabs)/profile.tsx`:

a) Delete the `handleCredits` function (lines ~27-29):

```tsx
  const handleCredits = () => {
    router.push('/credits');
  };
```

b) Delete the credits display block inside the profile card:

```tsx
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsLabel}>Credits</Text>
          <Text style={styles.creditsAmount}>{user?.credits || 0}</Text>
          <Text style={styles.creditsDescription}>
            {user?.free_trial_used ? 'Free trial used' : 'Free trial available'}
          </Text>
        </View>
```

c) Delete the "Manage Credits" button:

```tsx
        <TouchableOpacity style={styles.actionButton} onPress={handleCredits}>
          <Text style={styles.actionButtonText}>Manage Credits</Text>
        </TouchableOpacity>
```

d) Delete the now-unused style entries: `creditsContainer`, `creditsLabel`, `creditsAmount`, `creditsDescription`, `actionButton`, `actionButtonText`.

e) The `router` import stays (still used by `handleLogout`).

- [ ] **Step 3: Uninstall the dependencies**

```bash
npm uninstall @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc \
  livekit-client expo-brightness @config-plugins/react-native-webrtc @livekit/react-native-expo-plugin
```

Expected: package.json no longer lists any of these; install completes without errors.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both pass with no errors (warnings acceptable if pre-existing).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove voice sessions, credits purchase, and ElevenLabs/LiveKit deps (deferred to post-MVP)"
```

---

### Task 2: Firebase initialization module

**Files:**
- Create: `lib/firebase.ts`
- Modify: `app.config.js` (add `extra.firebase`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `import { auth, db } from '@/lib/firebase'` — `auth: Auth` (Firebase Auth instance with AsyncStorage persistence), `db: Firestore`. Tasks 3 and 4 import these.

- [ ] **Step 1: Add Firebase config to app.config.js**

In `app.config.js`, inside `extra`, add (these are public identifiers, safe to commit):

```js
      // Firebase web app config (public identifiers, safe to commit)
      firebase: {
        apiKey: "AIzaSyBZKjgaSi_qd8inMx5R5VvYIJpGlWz32lA",
        authDomain: "sermonmate-919e5.firebaseapp.com",
        projectId: "sermonmate-919e5",
        storageBucket: "sermonmate-919e5.firebasestorage.app",
        messagingSenderId: "879460367628",
        appId: "1:879460367628:web:fc17c7e93c90fafc309d29"
      },
```

(Do NOT include `measurementId` — Analytics is not used in React Native.)

- [ ] **Step 2: Create lib/firebase.ts**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is in the react-native bundle of firebase/auth;
// the web type declarations don't expose it, but Metro resolves it correctly at runtime.
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = Constants.expoConfig?.extra?.firebase;

if (!firebaseConfig?.apiKey) {
  throw new Error('Missing Firebase config in app.config.js extra.firebase');
}

const app = initializeApp(firebaseConfig);

// AsyncStorage persistence keeps the user signed in across app restarts.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
```

Note for the implementer: if `tsc` reports that `getReactNativePersistence` is not exported even with the `@ts-ignore`, the ignore comment must sit directly above the import line containing it (split the import in two if needed).

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts app.config.js
git commit -m "Add Firebase initialization (Auth with AsyncStorage persistence + Firestore)"
```

**Known runtime contingency (do not apply preemptively):** if the app later fails at startup with `Component auth has not been registered yet` or Firestore connection errors, add this to `metro.config.js` before `module.exports`:

```js
config.resolver.unstable_enablePackageExports = false;
```

This is a known Expo SDK 53+ / Firebase JS SDK interaction. It is verified in Task 6's manual pass.

---

### Task 3: Auth store on Firebase Auth

**Files:**
- Modify: `lib/stores/auth.ts` (full rewrite of internals)
- Modify: `app/(protected)/_layout.tsx` (remove `token` usage)

**Interfaces:**
- Consumes: `auth`, `db` from `lib/firebase.ts` (Task 2).
- Produces: `useAuthStore` with the same shape screens already use:
  - `user: User | null` where `User = { id: string; name: string; email: string; role: string; credits: number; free_trial_used: boolean; created_at: string }` (**id is now string**)
  - `isLoading: boolean`, `isAuthenticated: boolean`
  - `login(email: string, password: string): Promise<{ success: boolean; message?: string }>`
  - `register(name: string, email: string, password: string, passwordConfirmation: string): Promise<{ success: boolean; message?: string }>` (same 4-arg signature so `sign-up.tsx` is untouched)
  - `logout(): Promise<void>`, `loadUser(): Promise<void>`, `updateUser(user: User): void`
  - The `token` field is **removed**. Task 4 relies on `auth.currentUser` directly, not on this store.

Callers that must keep working unchanged: `app/index.tsx`, `app/(public)/login.tsx`, `app/(public)/sign-up.tsx`, `app/(protected)/(tabs)/profile.tsx`, `components/ProfileDrawer.tsx`, `app/(protected)/(tabs)/home.tsx`.

- [ ] **Step 1: Rewrite lib/stores/auth.ts**

Replace the entire file with:

```ts
import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  free_trial_used: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

// Map Firebase Auth error codes to the friendly messages the app showed before.
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again later';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Fetch the Firestore profile for a signed-in Firebase user,
// creating it with defaults if it doesn't exist yet.
async function fetchUserProfile(fbUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // Safety net: profile doc missing (e.g. interrupted registration) — recreate defaults.
    await setDoc(userRef, {
      name: fbUser.displayName ?? '',
      email: fbUser.email ?? '',
      role: 'user',
      credits: 5,
      free_trial_used: false,
      createdAt: serverTimestamp(),
    });
    return {
      id: fbUser.uid,
      name: fbUser.displayName ?? '',
      email: fbUser.email ?? '',
      role: 'user',
      credits: 5,
      free_trial_used: false,
      created_at: new Date().toISOString(),
    };
  }

  const data = snapshot.data();
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : new Date().toISOString();

  return {
    id: fbUser.uid,
    name: data.name ?? '',
    email: data.email ?? fbUser.email ?? '',
    role: data.role ?? 'user',
    credits: data.credits ?? 0,
    free_trial_used: data.free_trial_used ?? false,
    created_at: createdAt,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = await fetchUserProfile(credential.user);

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error?.code, error?.message);
      set({ isLoading: false });
      return { success: false, message: authErrorMessage(error?.code) };
    }
  },

  register: async (name: string, email: string, password: string, passwordConfirmation: string) => {
    if (password !== passwordConfirmation) {
      return { success: false, message: 'Passwords do not match.' };
    }

    set({ isLoading: true });

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      const profile = {
        name: name.trim(),
        email: email.trim(),
        role: 'user',
        credits: 5,
        free_trial_used: false,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', credential.user.uid), profile);

      const user: User = {
        id: credential.user.uid,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        credits: profile.credits,
        free_trial_used: profile.free_trial_used,
        created_at: new Date().toISOString(),
      };

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error?.code, error?.message);
      set({ isLoading: false });
      return { success: false, message: authErrorMessage(error?.code) };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // Ignore sign-out errors; we clear local state regardless.
      console.error('Logout error:', error);
    }

    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });

    // Wait for Firebase to restore the persisted session (one-shot listener).
    const fbUser = await new Promise<FirebaseUser | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
    });

    if (!fbUser) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await fetchUserProfile(fbUser);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Signed in but profile unreachable (e.g. offline): still authenticated,
      // with a minimal profile so the UI has a name/email to show.
      set({
        user: {
          id: fbUser.uid,
          name: fbUser.displayName ?? '',
          email: fbUser.email ?? '',
          role: 'user',
          credits: 0,
          free_trial_used: false,
          created_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
      });
    }
  },

  updateUser: (user: User) => {
    set({ user });
  },
}));
```

- [ ] **Step 2: Update app/(protected)/_layout.tsx to drop `token`**

Replace the component body's store usage — the file becomes:

```tsx
import { Stack, Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    // The root index should have already loaded the user; this is a safety check
    // in case someone navigates directly to a protected route.
    if (!isAuthenticated && !isLoading) {
      loadUser().catch((error) => {
        console.error('Error loading user:', error);
      });
    }
  }, [isAuthenticated, isLoading, loadUser]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: pass. In particular, no remaining references to `token` or `SecureStore` in `lib/stores/auth.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/stores/auth.ts "app/(protected)/_layout.tsx"
git commit -m "Migrate auth store from Laravel API to Firebase Auth + Firestore profile"
```

---

### Task 4: Sermons on Firestore

**Files:**
- Modify: `lib/sermonApi.ts` (full rewrite)

**Interfaces:**
- Consumes: `auth`, `db` from `lib/firebase.ts` (Task 2).
- Produces: same exported signatures as today, used by `home.tsx` and `SermonModal.tsx`:
  - `getSermons(): Promise<SavedSermon[]>`
  - `saveSermon(sermon: Omit<SavedSermon, 'id' | 'date'> & { topic?: string }): Promise<SavedSermon>`
  - `updateSermon(sermon: SavedSermon): Promise<SavedSermon>`
  - `deleteSermon(id: string): Promise<void>`
  - `SavedSermon` (from `lib/types.ts`) is unchanged — its `id` was already a string.

- [ ] **Step 1: Rewrite lib/sermonApi.ts**

Replace the entire file with:

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { SavedSermon } from './types';

// Firestore document shape at users/{uid}/sermons/{sermonId}
interface SermonDoc {
  title: string;
  verses: string[];
  interpretation: string;
  story: string;
  color: string;
  topic?: string;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function sermonsCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to manage sermons');
  }
  return collection(db, 'users', uid, 'sermons');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function mapDocToSavedSermon(id: string, data: SermonDoc): SavedSermon {
  const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

  return {
    id,
    title: data.title,
    verses: data.verses || [],
    interpretation: data.interpretation || '',
    story: data.story || '',
    date: formatDate(created),
    color: data.color || '1',
    is_public: data.isPublic || false,
  };
}

/**
 * Get all sermons for the authenticated user, newest first.
 */
export async function getSermons(): Promise<SavedSermon[]> {
  try {
    const snapshot = await getDocs(query(sermonsCollection(), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((d) => mapDocToSavedSermon(d.id, d.data() as SermonDoc));
  } catch (error: any) {
    console.error('Error fetching sermons:', error);
    throw new Error(error?.message || 'Failed to fetch sermons');
  }
}

/**
 * Save a new sermon.
 */
export async function saveSermon(
  sermon: Omit<SavedSermon, 'id' | 'date'> & { topic?: string }
): Promise<SavedSermon> {
  try {
    const payload = {
      title: sermon.title,
      verses: sermon.verses || [],
      interpretation: sermon.interpretation || '',
      story: sermon.story || '',
      color: sermon.color || '1',
      isPublic: false,
      ...(sermon.topic && { topic: sermon.topic }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(sermonsCollection(), payload);

    return {
      id: ref.id,
      title: payload.title,
      verses: payload.verses,
      interpretation: payload.interpretation,
      story: payload.story,
      date: formatDate(new Date()),
      color: payload.color,
      is_public: false,
    };
  } catch (error: any) {
    console.error('Error saving sermon:', error);
    throw new Error(error?.message || 'Failed to save sermon');
  }
}

/**
 * Update an existing sermon.
 */
export async function updateSermon(sermon: SavedSermon): Promise<SavedSermon> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('You must be signed in to manage sermons');
    }

    await updateDoc(doc(db, 'users', uid, 'sermons', sermon.id), {
      title: sermon.title,
      verses: sermon.verses,
      interpretation: sermon.interpretation,
      story: sermon.story,
      color: sermon.color,
      updatedAt: serverTimestamp(),
    });

    return sermon;
  } catch (error: any) {
    console.error('Error updating sermon:', error);
    throw new Error(error?.message || 'Failed to update sermon');
  }
}

/**
 * Delete a sermon.
 */
export async function deleteSermon(id: string): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('You must be signed in to manage sermons');
    }

    await deleteDoc(doc(db, 'users', uid, 'sermons', id));
  } catch (error: any) {
    console.error('Error deleting sermon:', error);
    throw new Error(error?.message || 'Failed to delete sermon');
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: pass. `home.tsx` and `SermonModal.tsx` compile without modification.

- [ ] **Step 3: Commit**

```bash
git add lib/sermonApi.ts
git commit -m "Migrate sermon CRUD from Laravel API to Firestore subcollection"
```

---

### Task 5: Remove legacy API client, secrets hygiene, config cleanup

**Files:**
- Delete: `lib/api.ts`, `lib/apiTest.ts`
- Delete: `DEBUGGING_GUIDE.md`, `DEBUG_LOGS.md`, `DEBUG_SUMMARY.md` (Laravel-API debugging docs, now obsolete)
- Modify: `lib/gemini.ts` (remove hardcoded fallback key)
- Modify: `app.config.js` (remove `apiUrl` from `extra`)
- Modify: `eas.json` (remove `EXPO_PUBLIC_API_URL` env entries)
- Modify: `.gitignore` (ignore all `.env*` files)
- Modify: `package.json` (uninstall axios, expo-secure-store)

**Interfaces:**
- Consumes: Tasks 3 and 4 complete (nothing imports `lib/api.ts` anymore).
- Produces: no references to `sermonmate.bobakdevs.com` or axios anywhere; Gemini key comes only from `EXPO_PUBLIC_GEMINI_API_KEY`.

- [ ] **Step 1: Confirm nothing still imports the legacy client**

```bash
grep -rn "lib/api'" --include="*.ts" --include="*.tsx" app components lib utils | grep -v apiTest
```

Expected: no output. (If there is output, a previous task missed a call site — fix that first, do not proceed.)

- [ ] **Step 2: Delete legacy files**

```bash
git rm lib/api.ts lib/apiTest.ts DEBUGGING_GUIDE.md DEBUG_LOGS.md DEBUG_SUMMARY.md
```

- [ ] **Step 3: Uninstall unused dependencies**

```bash
npm uninstall axios expo-secure-store
```

(Keep `react-native-url-polyfill` — it's imported in both root layouts and harmless.)

- [ ] **Step 4: Remove the hardcoded Gemini fallback key**

In `lib/gemini.ts`, replace:

```ts
// Try multiple sources for the API key
const GEMINI_API_KEY = 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
  Constants.expoConfig?.extra?.geminiApiKey ||
  'AIzaSyC6cPr0wx8amOOfAf2od7ByxWivw-ZLAuE'; // Fallback to hardcoded key
```

with:

```ts
// API key must come from the environment (EXPO_PUBLIC_GEMINI_API_KEY) —
// never hardcode it; the old hardcoded key was rotated after being shipped in APKs.
const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.geminiApiKey;
```

Also delete the key-source debug block (the `keySource` const and the three `console.log('🔑 ...')` lines) — it leaks configuration detail into logs and no longer has three sources to distinguish.

- [ ] **Step 5: Remove Laravel URL from configs**

a) In `app.config.js`, delete these lines from `extra`:

```js
      // Make API URL available via expo-constants
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://sermonmate.bobakdevs.com/api/v1",
```

b) In `eas.json`, remove the line `"EXPO_PUBLIC_API_URL": "https://sermonmate.bobakdevs.com/api/v1"` from both the `preview` and `production` build profiles (keep the `NODE_OPTIONS` entries).

- [ ] **Step 6: Ignore local env files**

In `.gitignore`, change the local env section from:

```
# local env files
.env*.local
```

to:

```
# local env files
.env*
```

- [ ] **Step 7: Verify no legacy references remain**

```bash
npx tsc --noEmit && npm run lint
grep -rn "sermonmate.bobakdevs.com\|expo-secure-store\|from 'axios'" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  app components lib utils app.config.js eas.json package.json
```

Expected: tsc and lint pass; grep returns no output.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove legacy Laravel API client, hardcoded Gemini key, and stale debug docs"
```

---

### Task 6: Release prep — versions, Firestore rules, manual verification

**Files:**
- Modify: `app.config.js` (`version` → `1.1.0`)
- Modify: `package.json` (`version` → `1.1.0`)
- Create: `firestore.rules` (committed for reference; applied by the user in the Firebase console)
- Create: `.env` (local only, gitignored — Gemini key)

**Interfaces:**
- Consumes: everything above.
- Produces: a buildable, manually-verified app ready for `eas build`.

- [ ] **Step 1: Bump versions**

a) `app.config.js`: change `version: "1.0.0"` to `version: "1.1.0"`. Leave `android.versionCode` alone — `eas.json` uses `appVersionSource: "remote"` with `autoIncrement: true` on the production profile, so EAS assigns the next versionCode (11) automatically at build time.

b) `package.json`: change `"version": "1.0.1"` to `"version": "1.1.0"`.

- [ ] **Step 2: Create firestore.rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /sermons/{sermonId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

This file is documentation/reference — the user pastes it into Firebase console → Firestore Database → Rules → Publish. (No firebase CLI setup on Spark for an MVP.)

- [ ] **Step 3: Create local .env with the rotated Gemini key**

```bash
echo "EXPO_PUBLIC_GEMINI_API_KEY=<the-new-rotated-key>" > .env
git check-ignore .env
```

Expected: `git check-ignore` prints `.env` (confirming it will not be committed). The actual key value comes from the user (rotated in Google AI Studio).

**USER ACTION also required for EAS builds:** set the same variable as an EAS environment variable so production builds get it:
`eas env:create --name EXPO_PUBLIC_GEMINI_API_KEY --value <the-new-rotated-key> --environment production --visibility secret` (repeat for `preview` if used).

- [ ] **Step 4: Commit**

```bash
git add app.config.js package.json firestore.rules
git commit -m "Bump version to 1.1.0 and add Firestore security rules reference"
```

- [ ] **Step 5: Manual verification pass (requires user/dev device)**

Prerequisites checked in Firebase console: Email/Password sign-in enabled; Firestore database created; rules from Step 2 published.

Start the app (`npx expo start`, dev build on device/emulator) and walk through:

1. Fresh install / cleared storage → onboarding → sign up with a new account → lands on home.
2. Firebase console → Authentication shows the new user; Firestore shows `users/{uid}` doc with `credits: 5`, `role: 'user'`.
3. Kill and relaunch the app → still signed in, lands on home (AsyncStorage persistence works).
4. Generate a sermon (topic chip → arrow) → modal shows verses/interpretation/story (Gemini key works from `.env`).
5. Save the sermon → appears in "My Sermons"; Firestore shows `users/{uid}/sermons/{id}`.
6. Edit the sermon (tap card, change, save) → change persists after reload.
7. Delete the sermon → removed from list and from Firestore.
8. Log out → redirected to login. Log back in → sermons list loads.
9. Sign up a **second** account → its "My Sermons" is empty (rules isolate users).
10. Watch Metro logs during startup: if `Component auth has not been registered yet` appears, apply the metro contingency from Task 2 and re-verify.

Expected: all 10 pass.

- [ ] **Step 6: Build & release (user-driven)**

```bash
eas build --platform android --profile production
```

Then upload to the Play Console closed-testing track (clears the account inactivity warning).
