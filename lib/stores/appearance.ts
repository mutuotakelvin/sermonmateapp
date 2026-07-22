import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface AppearanceState {
  mode: ThemeMode;
  initialized: boolean;
  initializeAppearance: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = '@appearance_settings';

function isMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  mode: 'system',
  initialized: false,

  initializeAppearance: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { mode?: unknown };
        if (isMode(saved.mode)) set({ mode: saved.mode });
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
    } finally {
      set({ initialized: true });
    }
  },

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }));
    } catch (error) {
      console.error('Error saving appearance settings:', error);
    }
  },
}));
