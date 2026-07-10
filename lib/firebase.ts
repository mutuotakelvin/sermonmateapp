import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is in the react-native bundle of firebase/auth;
// the web type declarations don't expose it, but Metro resolves it correctly at runtime.
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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

// Callable Cloud Functions (sermon generation runs server-side so the
// Anthropic API key never ships in the app).
export const functions = getFunctions(app);
