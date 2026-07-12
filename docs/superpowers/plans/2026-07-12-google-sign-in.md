# Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" to the login and sign-up screens via native Google Sign-In → Firebase credential.

**Architecture:** A native SDK wrapper (`lib/googleSignin.ts`) yields a Google `idToken`; a new `loginWithGoogle` auth-store action exchanges it for a Firebase credential and reuses the existing `fetchUserProfile` create-if-missing; a reusable `GoogleSignInButton` renders on both auth screens.

**Tech Stack:** Expo SDK 54, expo-router 6, RN 0.81, TypeScript strict; Firebase Auth (`GoogleAuthProvider`, `signInWithCredential`); `@react-native-google-signin/google-signin`.

## Global Constraints

- **Google only.** Native `@react-native-google-signin/google-signin` → `idToken` → `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`. No Facebook, no Apple, no account-linking.
- **The Google SDK is imported ONLY in `lib/googleSignin.ts`.** The auth store and UI must not import `@react-native-google-signin/google-signin` directly.
- **Button:** outlined "Continue with Google" (surface background, `theme.color.border` border, `logo-google` Ionicon), under the email `PrimaryButton`, with an "or" divider, on BOTH `login.tsx` and `sign-up.tsx`. Success navigates `router.replace('/(protected)')` (same as email login).
- **Email-collision** (`auth/account-exists-with-different-credential`) → message "This email is already registered — sign in with your password." **Cancelled sign-in → silent** (no toast).
- **Web client ID** comes from `app.config.js` → `extra.googleWebClientId` (public, safe to embed; empty by default until the human pastes it — the wrapper guards on empty). **SHA-1 registration + enabling the Firebase Google provider are human steps.**
- New native module → **dev rebuild** required (human, on-device) — not checkable by tsc/lint.
- **No test framework** (project has none; do not add). Verify each task with `npx tsc --noEmit` (0) + `npm run lint` (baseline **14**, no new).

## File structure

- Create `lib/googleSignin.ts` — native SDK wrapper + typed errors.
- Modify `lib/stores/auth.ts` — `loginWithGoogle` action + interface + error mapping.
- Create `components/GoogleSignInButton.tsx` — the button (divider + button + flow).
- Modify `app/(public)/login.tsx` + `app/(public)/sign-up.tsx` — render the button.
- Modify `app.config.js` — `extra.googleWebClientId` + the config plugin.

---

### Task 1: Deps, config, and the Google SDK wrapper

**Files:**
- Modify: `package.json` / lockfile (via `npx expo install`)
- Modify: `app.config.js`
- Create: `lib/googleSignin.ts`

**Interfaces:**
- Produces: from `lib/googleSignin.ts` — `configureGoogleSignin(): void`, `signInWithGoogleIdToken(): Promise<string>`, and error classes `GoogleSignInCancelled` and `GooglePlayServicesError`.

- [ ] **Step 1: Install the SDK**

Run: `npx expo install @react-native-google-signin/google-signin`
Expected: added to `package.json` at an SDK-54-compatible version.

- [ ] **Step 2: Add the config plugin + web client ID to `app.config.js`**

In the `plugins` array, after the `expo-media-library` block's closing `]`, add the Google plugin. Find:
```js
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
Replace with:
```js
      [
        "expo-media-library",
        {
          photosPermission: "Allow SermonMate to save verse cards to your photos.",
          savePhotosPermission: "Allow SermonMate to save verse cards to your photos.",
          isAccessMediaLocationEnabled: false
        }
      ],
      "@react-native-google-signin/google-signin"
    ],
```
Then, in the `extra` object, find:
```js
      // RevenueCat PUBLIC SDK key (safe to embed). Dev = test key; swap the
      // production `goog_…` Android key for release builds.
      revenueCatAndroidKey: "test_mjRkcgiEYcLDcfMeljRIjuuhTvd",
```
and add below it:
```js
      // Firebase Google provider's WEB OAuth client ID (public, safe to embed).
      // Paste the "Web client (auto created by Google Service)" ID from
      // Firebase → Authentication → Google → Web SDK configuration.
      googleWebClientId: "",
```

- [ ] **Step 3: Create `lib/googleSignin.ts`**

```ts
import Constants from 'expo-constants';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;

let configured = false;

export function configureGoogleSignin(): void {
  if (configured) return;
  if (!WEB_CLIENT_ID) {
    console.warn('Google web client ID missing from app config extra; Google sign-in disabled.');
    return;
  }
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super('GOOGLE_SIGN_IN_CANCELLED');
    this.name = 'GoogleSignInCancelled';
  }
}

export class GooglePlayServicesError extends Error {
  constructor() {
    super('GOOGLE_PLAY_SERVICES_UNAVAILABLE');
    this.name = 'GooglePlayServicesError';
  }
}

// Runs the native Google account picker and returns the Google idToken.
// Throws GoogleSignInCancelled if the user dismisses the sheet, or
// GooglePlayServicesError if Play services is unavailable.
export async function signInWithGoogleIdToken(): Promise<string> {
  configureGoogleSignin();
  if (!configured) {
    throw new Error('Google sign-in is not configured.');
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    throw new GooglePlayServicesError();
  }

  try {
    const response = await GoogleSignin.signIn();
    // Newer versions return { type: 'cancelled' } | { type: 'success', data: { idToken } };
    // older versions return { idToken } directly. Handle both.
    if ((response as { type?: string })?.type === 'cancelled') {
      throw new GoogleSignInCancelled();
    }
    const idToken =
      (response as { data?: { idToken?: string | null } })?.data?.idToken ??
      (response as { idToken?: string | null })?.idToken ??
      null;
    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }
    return idToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) throw error;
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GooglePlayServicesError();
    }
    throw error;
  }
}
```
Note: `@react-native-google-signin/google-signin` changed its `signIn()` return shape and its named exports (`statusCodes`, `isErrorWithCode`) across major versions. After `expo install` resolves a version, **verify these imports and the `signIn()` return shape against the installed package's types**; if `isErrorWithCode` or the `{ type, data }` shape differs, adjust to the installed version (tsc will flag mismatches). Do not invent APIs — check `node_modules/@react-native-google-signin/google-signin`.

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json app.config.js lib/googleSignin.ts
git commit -m "feat: add Google Sign-In SDK wrapper, config plugin, web client ID slot"
```

- [ ] **Step 6: Human note (record in report)**

Before this works on device: enable the **Google provider** in Firebase → Authentication; copy its **Web client ID** into `app.config.js` `extra.googleWebClientId`; register the app's **SHA-1** (from `eas credentials` / Play App Signing) on the project's Android OAuth client; then **dev rebuild** (`eas build --profile development` or `npx expo run:android`).

---

### Task 2: `loginWithGoogle` auth-store action

**Files:**
- Modify: `lib/stores/auth.ts`

**Interfaces:**
- Consumes: `signInWithGoogleIdToken`, `GoogleSignInCancelled`, `GooglePlayServicesError` (Task 1); existing `fetchUserProfile`, `authErrorMessage`.
- Produces: `loginWithGoogle(): Promise<{ success: boolean; message?: string; cancelled?: boolean }>` on the auth store.

- [ ] **Step 1: Add the Firebase + wrapper imports**

In `lib/stores/auth.ts`, change the `firebase/auth` import:
```ts
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
```
to:
```ts
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
```
And add, after the `import { auth, db } from '../firebase';` line:
```ts
import {
  GooglePlayServicesError,
  GoogleSignInCancelled,
  signInWithGoogleIdToken,
} from '../googleSignin';
```

- [ ] **Step 2: Declare the action on the interface**

In `interface AuthState`, after the `login: ...` line, add:
```ts
  loginWithGoogle: () => Promise<{ success: boolean; message?: string; cancelled?: boolean }>;
```

- [ ] **Step 3: Add a Google error mapper**

Directly below the existing `authErrorMessage` function, add:
```ts
// Map Google/Firebase credential errors to friendly messages. The SDK-specific
// cancel/Play-services cases are handled by the caller via typed errors.
function googleAuthErrorMessage(error: { code?: string }): string {
  if (error?.code === 'auth/account-exists-with-different-credential') {
    return 'This email is already registered — sign in with your password.';
  }
  return 'Google sign-in failed. Please try again.';
}
```

- [ ] **Step 4: Add the `loginWithGoogle` action**

In the store object, directly after the `login` action (after its closing `},`), add:
```ts
  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const idToken = await signInWithGoogleIdToken();
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = await fetchUserProfile(result.user);

      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      if (error instanceof GoogleSignInCancelled) {
        return { success: false, cancelled: true };
      }
      if (error instanceof GooglePlayServicesError) {
        return { success: false, message: 'Google Play services is required to sign in with Google.' };
      }
      console.error('Google login error:', error?.code, error?.message);
      return { success: false, message: googleAuthErrorMessage(error) };
    }
  },
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 6: Commit**
```bash
git add lib/stores/auth.ts
git commit -m "feat: loginWithGoogle auth-store action"
```

---

### Task 3: GoogleSignInButton + wire into both auth screens

**Files:**
- Create: `components/GoogleSignInButton.tsx`
- Modify: `app/(public)/login.tsx`
- Modify: `app/(public)/sign-up.tsx`

**Interfaces:**
- Consumes: `useAuthStore().loginWithGoogle` (Task 2); `useToast`, `theme`, `AppText`, expo-router `router`, `Ionicons`, `expo-haptics`.
- Produces: default-exported `GoogleSignInButton` component (no props).

- [ ] **Step 1: Create `components/GoogleSignInButton.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/lib/stores/auth';
import { theme } from '@/lib/theme';

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const onPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        router.replace('/(protected)');
      } else if (!result.cancelled && result.message) {
        showError('Google sign-in failed', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText variant="caption" style={styles.orText}>or</AppText>
        <View style={styles.line} />
      </View>
      <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={theme.color.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={theme.color.text} />
            <AppText variant="body" style={styles.label}>Continue with Google</AppText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.lg, gap: theme.space.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  line: { flex: 1, height: 1, backgroundColor: theme.color.border },
  orText: { color: theme.color.textMuted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  label: { fontFamily: theme.font.sansSemibold, color: theme.color.text },
});
```

- [ ] **Step 2: Render it on the login screen**

In `app/(public)/login.tsx`, add the import with the other component imports:
```tsx
import GoogleSignInButton from '@/components/GoogleSignInButton';
```
Find:
```tsx
              <PrimaryButton
                label={isLoading ? 'Signing in...' : 'Sign in'}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />
            </View>
```
Replace with:
```tsx
              <PrimaryButton
                label={isLoading ? 'Signing in...' : 'Sign in'}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />

              <GoogleSignInButton />
            </View>
```

- [ ] **Step 3: Render it on the sign-up screen**

In `app/(public)/sign-up.tsx`, add the import with the other component imports:
```tsx
import GoogleSignInButton from '@/components/GoogleSignInButton';
```
Find:
```tsx
              <PrimaryButton
                label={isLoading ? 'Creating account...' : 'Create account'}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />
            </View>
```
Replace with:
```tsx
              <PrimaryButton
                label={isLoading ? 'Creating account...' : 'Create account'}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />

              <GoogleSignInButton />
            </View>
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 5: Commit**
```bash
git add components/GoogleSignInButton.tsx app/\(public\)/login.tsx app/\(public\)/sign-up.tsx
git commit -m "feat: Continue with Google button on login and sign-up"
```

---

## Notes for the implementer

- **No test framework** — verification is `tsc` + `lint`, plus a human on-device pass after the dev rebuild (with the Firebase Google provider enabled, the web client ID filled in, and the SHA-1 registered). Do not scaffold a test runner.
- **Keep the Google SDK isolated** to `lib/googleSignin.ts` — the store and UI import only from it, never `@react-native-google-signin/google-signin` directly.
- The `googleWebClientId` being empty is expected until the human pastes the real ID; the wrapper warns and no-ops rather than crashing. tsc/lint pass regardless.
- Do not modify the existing email/password flow, `fetchUserProfile`, or the RevenueCat wiring — a Google user flows through them unchanged.
