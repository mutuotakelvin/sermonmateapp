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
