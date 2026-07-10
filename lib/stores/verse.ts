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
