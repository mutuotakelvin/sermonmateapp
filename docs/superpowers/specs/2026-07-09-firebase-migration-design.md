# SermonMate: Laravel → Firebase Migration (Free MVP)

**Date:** 2026-07-09
**Status:** Approved

## Context

SermonMate is an Expo (React Native) app on the Play Store (closed testing, ~100 installs). Its Laravel backend at `sermonmate.bobakdevs.com/api/v1` is too costly to keep running for an MVP. Existing users are test accounts only — **no data migration needed**.

Decision: replace the Laravel backend with Firebase on the **free Spark plan** (Auth + Firestore, fully client-side, no Cloud Functions). The app becomes **free** for v1 — no payment flow. Voice sessions (ElevenLabs/LiveKit) are **deferred** to a later version. Sermon generation stays on the client via the free-tier Gemini API.

A secondary goal: ship a new release to the Play testing track promptly — the developer account shows an inactivity warning.

## Approach

Thin Firebase adapter behind the existing seams. Screens already talk to `useAuthStore()`, `getSermons()`, `saveSermon()`, etc. Swap the internals of those modules to Firebase while keeping exported signatures identical. Screens change minimally.

Rejected alternatives:
- Direct Firestore calls in components — touches every screen, discards a working abstraction.
- Preserving Laravel JSON response shapes — pointless for a clean slate.
- Blaze plan + Cloud Functions / payments — deferred; not needed for a free MVP.

## Components

### 1. Firebase initialization — `lib/firebase.ts` (new)

Single module initializing the Firebase **JS SDK** (`firebase@12`, already a dependency; no native config files, compatible with existing EAS builds):

- `initializeApp(config)` — config values from `app.config.js` `extra` (public identifiers, safe in the client)
- `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` — login survives app restarts
- `getFirestore(app)`

Exports `auth` and `db` singletons.

### 2. Auth — `lib/stores/auth.ts` (internals swapped, same interface)

Zustand store keeps the same shape: `user`, `isLoading`, `isAuthenticated`, `login`, `register`, `logout`, `loadUser`, `updateUser`.

- `register(name, email, password)` → `createUserWithEmailAndPassword`, then create `users/{uid}` doc:
  `{ name, email, role: 'user', credits: 5, free_trial_used: false, createdAt: serverTimestamp() }`
- `login(email, password)` → `signInWithEmailAndPassword`, then fetch the user doc
- `loadUser()` → wraps `onAuthStateChanged` (one-shot promise for the startup check in `app/index.tsx`, which keeps working unchanged)
- `logout()` → `signOut(auth)`
- Firebase error codes mapped to the existing friendly messages (`auth/invalid-credential` → "Invalid email or password…", `auth/email-already-in-use`, `auth/network-request-failed` → network message, etc.)
- `User.id` type changes `number → string` (Firebase uid); `token` field removed from the store
- Email/password only for v1 (no Google sign-in)
- `password_confirmation` check happens client-side in the sign-up screen (already does)

Deleted: `lib/api.ts` (axios client), `lib/apiTest.ts`, SecureStore token handling. `axios` and `expo-secure-store` removed from dependencies if nothing else uses them.

### 3. Sermons — `lib/sermonApi.ts` (same exported functions)

Firestore subcollection `users/{uid}/sermons/{sermonId}`:

```
{ title, verses: string[], interpretation, story, color, topic?, isPublic: false,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
```

- `getSermons()` → query ordered by `createdAt desc`, mapped to `SavedSermon` (doc id is already a string — no type change)
- `saveSermon()` → `addDoc`
- `updateSermon()` → `updateDoc` + `updatedAt`
- `deleteSermon()` → `deleteDoc`

`home.tsx` and `SermonModal` unchanged.

### 4. Firestore security rules (set in Firebase console)

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

### 5. Removed / deferred features

- **Voice sessions:** delete `app/(protected)/session.tsx`, `app/(protected)/summary.tsx`, `components/screens/SessionScreen.tsx`, `components/screens/SummaryScreen.tsx`, `app/api/conversations+api.ts`, and any entry points to them. Remove deps: `@elevenlabs/react-native`, `@livekit/*`, `livekit-client`, `@config-plugins/react-native-webrtc`, `@livekit/react-native-expo-plugin`. Git history preserves everything; dropping webrtc makes EAS builds smaller and less fragile.
- **Credits purchase:** delete `app/(protected)/credits.tsx` and `lib/stores/credits.ts`, plus entry points. The `credits` field stays in the user doc so future monetization is a UI problem, not a data migration.
- **Gemini hardcoded fallback key** in `lib/gemini.ts`: the key is exposed in git history and shipped APKs — **rotate it in Google AI Studio** and remove the fallback; env var (`EXPO_PUBLIC_GEMINI_API_KEY`) only.

### 6. Unchanged

- Mood tracking (local AsyncStorage)
- Sermon generation via Gemini free-tier API (client-side)
- Theme store, onboarding, navigation structure

## Data flow

Startup: `app/index.tsx` → `loadUser()` → Firebase restores session from AsyncStorage → fetch `users/{uid}` doc → redirect to `(protected)` or `(public)`.

Sermon loop: home → `generateSermon(topic)` (Gemini) → `SermonModal` → `saveSermon()` → Firestore → `getSermons()` refresh.

## Error handling

- Auth errors: mapped per-code to the existing user-facing messages; unknown codes fall back to a generic message.
- Firestore errors: existing `try/catch` + toast pattern in screens is preserved (function signatures still throw `Error` with a message).
- Offline: Firestore JS SDK default (memory cache); no explicit offline persistence in v1.

## Release

- User creates the Firebase project + web app in the console and provides the config snippet; enables Email/Password auth and creates the Firestore database; pastes the security rules.
- Bump `android.versionCode` to 11 (last uploaded bundle was 10) and `version` to `1.1.0` in `app.config.js` (architecture change warrants a minor bump; Play currently shows 1.0.0).
- EAS build → upload to the closed-testing track → clears the Play account inactivity risk.

## Testing

Manual pass: register → login → kill app → still logged in → generate sermon → save → appears in list → edit → delete → logout → login again. Verify a second account cannot see the first account's sermons (rules).
