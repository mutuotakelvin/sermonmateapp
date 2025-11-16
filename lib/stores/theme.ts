import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@app_theme';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  initializeTheme: async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        set({ theme: storedTheme as Theme });
      } else {
        // Use system preference as default
        const colorScheme = Appearance.getColorScheme();
        const defaultTheme = colorScheme === 'dark' ? 'dark' : 'light';
        set({ theme: defaultTheme });
        await AsyncStorage.setItem(THEME_STORAGE_KEY, defaultTheme);
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
      // Fallback to light theme
      set({ theme: 'light' });
    }
  },

  setTheme: async (theme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      set({ theme });
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  },

  toggleTheme: async () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    await get().setTheme(newTheme);
  },
}));
