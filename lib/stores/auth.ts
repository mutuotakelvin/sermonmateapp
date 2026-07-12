import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  GooglePlayServicesError,
  GoogleSignInCancelled,
  signInWithGoogleIdToken,
} from '../googleSignin';

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
  loginWithGoogle: () => Promise<{ success: boolean; message?: string; cancelled?: boolean }>;
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

// Map Google/Firebase credential errors to friendly messages. The SDK-specific
// cancel/Play-services cases are handled by the caller via typed errors.
function googleAuthErrorMessage(error: { code?: string }): string {
  if (error?.code === 'auth/account-exists-with-different-credential') {
    return 'This email is already registered — sign in with your password.';
  }
  return 'Google sign-in failed. Please try again.';
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
