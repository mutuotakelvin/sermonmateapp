# SermonMate: "Continue with Google" Sign-In

**Date:** 2026-07-12
**Status:** Approved (pending spec review)

## Context

Auth today is **email/password only** (Firebase `initializeAuth` with AsyncStorage
persistence). Adding **Google Sign-In** to the login and sign-up screens reduces signup
friction — the single biggest drop-off point. This spec covers **Google only**; Facebook
and Apple are explicitly out of scope (Facebook needs a developer app + business
verification + app review; Apple only matters for a future iOS build).

The app is Android-first and runs on a custom dev client, so a native sign-in SDK is the
right call. Google Sign-In returns an **idToken** that we exchange for a Firebase
credential — the rest of the app (session persistence, the `fetchUserProfile`
create-if-missing logic, RevenueCat `identify(uid)` wiring) works unchanged for a
Google-authenticated user.

## Decisions (locked during brainstorming)

- **Provider:** Google only. Native **`@react-native-google-signin/google-signin`** →
  `idToken` → `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`.
  (Chosen over Expo AuthSession's web redirect for a cleaner native account-picker UX.)
- **Button:** an **outlined** "Continue with Google" button (paper background, subtle
  border, Google "G" mark) on **both** the login and sign-up screens, under the email
  `PrimaryButton`, separated by an "or" divider.
- **No account-linking in v1:** if the Google email already has a password account,
  surface a clear message rather than auto-merging.
- New native module → a **dev rebuild** is required.

## File structure & responsibilities

- **`lib/googleSignin.ts`** — isolates the native SDK. `configureGoogleSignin(): void`
  (idempotent; reads the web client ID from app config) and
  `signInWithGoogleIdToken(): Promise<string>` (calls `hasPlayServices()` + `signIn()`,
  returns the Google `idToken`; throws the SDK's typed errors for the caller to map).
  This is the only file importing `@react-native-google-signin/google-signin`.
- **`lib/stores/auth.ts`** — add a `loginWithGoogle(): Promise<{ success: boolean;
  message?: string }>` action (mirrors the existing `login`): get the idToken via
  `signInWithGoogleIdToken`, `signInWithCredential`, then `fetchUserProfile` + set user.
  Add it to the `AuthState` interface. `fetchUserProfile` **already** creates the
  Firestore doc with `fbUser.displayName`/`email` + the standard `role`/`credits`
  defaults when missing — no `pro` field, so it satisfies the Firestore create rule.
- **`components/GoogleSignInButton.tsx`** — a reusable presentational button that runs
  `loginWithGoogle`, shows a loading state, navigates on success (same target as an
  email login), and maps errors to messages. Used by both auth screens (DRY).
- **`app/(public)/login.tsx`** + **`app/(public)/sign-up.tsx`** — add the "or" divider +
  `<GoogleSignInButton />` below the existing primary button.
- **`app.config.js`** — add `extra.googleWebClientId` (public OAuth **web** client ID,
  safe to embed) and the `@react-native-google-signin/google-signin` config plugin.

## Configuration & data flow

1. **Firebase console → Authentication → enable the Google provider.** This provisions
   OAuth clients in the linked Google Cloud project.
2. The **Web client ID** goes into `app.config.js` → `extra.googleWebClientId`, and is
   passed to `GoogleSignin.configure({ webClientId })`.
3. The app's **SHA-1** (from the EAS/Play App Signing key) must be registered on the
   **Android OAuth client** for that project, or Google won't issue a token.
4. Flow at runtime: tap "Continue with Google" → native account picker →
   `signInWithGoogleIdToken()` returns the idToken → `signInWithCredential` signs the
   user into Firebase → `onAuthStateChanged` / `fetchUserProfile` yields the app user
   (creating the Firestore doc from the Google profile if new) → navigate into the app.
   The `_layout` auth-watch effect then runs `identifyPurchaser(uid)` + `syncEntitlement`
   exactly as for an email user.

`configureGoogleSignin()` is called once at startup (module load in `app/_layout.tsx`,
alongside `configureNotifications()` / `configurePurchases()`).

## Error handling

- **User cancels the Google sheet** (`SIGN_IN_CANCELLED`) → silent no-op, no error UI.
- **`PLAY_SERVICES_NOT_AVAILABLE`** → friendly toast ("Google Play services is required").
- **`auth/account-exists-with-different-credential`** (email already has a password
  account) → clear message: "This email is already registered — sign in with your
  password." No auto-linking.
- **Network / other SDK errors** → generic "Google sign-in failed, please try again."
- The button is disabled while a sign-in is in flight.

## Testing

No automated test framework (established; none added). Per file: `npx tsc --noEmit` (0) +
`npm run lint` (baseline 14, no new). The native module + Firebase provider mean the real
verification is a **human on-device pass after a dev rebuild**, with the Firebase Google
provider enabled and the SHA-1 registered:
1. "Continue with Google" on the login screen opens the native account picker and signs
   in; a brand-new Google user lands in the app with a created profile (name/email from
   Google).
2. The same works from the sign-up screen.
3. Cancelling the picker shows no error; an email that already has a password account
   shows the "sign in with your password" message.
4. A Google-signed-in user's Pro entitlement syncs (RevenueCat identify runs on the uid),
   and sign-out returns to the login screen cleanly.

## Out of scope (v1)

Facebook and Apple sign-in; automatic account-linking / email-credential merging;
changing the existing email/password flow; and any iOS-specific configuration.
