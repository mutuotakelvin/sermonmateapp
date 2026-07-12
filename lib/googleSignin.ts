import Constants from 'expo-constants';

// Type-only reference to the SDK — fully erased at compile time, so it does NOT
// create a runtime import. Importing @react-native-google-signin at module scope
// runs TurboModuleRegistry.getEnforcing('RNGoogleSignin'), which THROWS at import
// time when the native module isn't in the binary (e.g. an un-rebuilt dev client),
// taking down every screen that transitively imports this file (auth store → home).
// We load the SDK lazily inside a try/catch so the app (and email/password auth)
// keeps working; only the Google button degrades until a rebuild.
type GoogleSdk = typeof import('@react-native-google-signin/google-signin');

const WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;

let sdk: GoogleSdk | null = null;
let sdkLoaded = false;

function loadSdk(): GoogleSdk | null {
  if (sdkLoaded) return sdk;
  sdkLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('@react-native-google-signin/google-signin') as GoogleSdk;
  } catch (err) {
    console.warn('Google Sign-In native module unavailable; Google login disabled until a rebuild.', err);
    sdk = null;
  }
  return sdk;
}

let configured = false;

export function configureGoogleSignin(): void {
  if (configured) return;
  const s = loadSdk();
  if (!s) return;
  if (!WEB_CLIENT_ID) {
    console.warn('Google web client ID missing from app config extra; Google sign-in disabled.');
    return;
  }
  s.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
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
// GooglePlayServicesError if Play services is unavailable. Throws a plain Error
// if the native module isn't in this build (surfaces as a generic failure toast).
export async function signInWithGoogleIdToken(): Promise<string> {
  const s = loadSdk();
  if (!s) {
    throw new Error('Google sign-in is unavailable on this build.');
  }

  configureGoogleSignin();
  if (!configured) {
    throw new Error('Google sign-in is not configured.');
  }

  try {
    await s.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    throw new GooglePlayServicesError();
  }

  try {
    const response = await s.GoogleSignin.signIn();
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
    if (s.isErrorWithCode(error) && error.code === s.statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    if (s.isErrorWithCode(error) && error.code === s.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new GooglePlayServicesError();
    }
    throw error;
  }
}
