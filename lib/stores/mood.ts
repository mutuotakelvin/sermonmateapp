import { create } from 'zustand';
import type { MoodEntry, WeeklyMoodSummary } from '../types';
import {
  getMoodEntries,
  saveMoodEntry as saveMoodEntryStorage,
  getWeeklyMoodSummary as getWeeklyMoodSummaryStorage,
  getMoodEntriesByDateRange,
  deleteMoodEntry as deleteMoodEntryStorage,
} from '../moodStorage';

interface MoodState {
  moodEntries: MoodEntry[];
  weeklySummary: WeeklyMoodSummary | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadMoodEntries: () => Promise<void>;
  addMoodEntry: (entry: MoodEntry) => Promise<void>;
  getWeeklySummary: () => Promise<void>;
  getEntriesByDateRange: (start: Date, end: Date) => Promise<MoodEntry[]>;
  deleteMoodEntry: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  moodEntries: [],
  weeklySummary: null,
  loading: false,
  error: null,

  loadMoodEntries: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await getMoodEntries();
      set({ moodEntries: entries, loading: false });
    } catch (error) {
      console.error('Error loading mood entries:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load mood entries',
        loading: false,
      });
    }
  },

  addMoodEntry: async (entry: MoodEntry) => {
    set({ loading: true, error: null });
    try {
      await saveMoodEntryStorage(entry);
      const entries = await getMoodEntries();
      set({ moodEntries: entries, loading: false });
      // Refresh weekly summary
      await get().getWeeklySummary();
    } catch (error) {
      console.error('Error adding mood entry:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add mood entry',
        loading: false,
      });
    }
  },

  getWeeklySummary: async () => {
    try {
      const summary = await getWeeklyMoodSummaryStorage();
      set({ weeklySummary: summary });
    } catch (error) {
      console.error('Error getting weekly summary:', error);
    }
  },

  getEntriesByDateRange: async (start: Date, end: Date) => {
    try {
      const entries = await getMoodEntriesByDateRange(start, end);
      return entries;
    } catch (error) {
      console.error('Error getting entries by date range:', error);
      return [];
    }
  },

  deleteMoodEntry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteMoodEntryStorage(id);
      const entries = await getMoodEntries();
      set({ moodEntries: entries, loading: false });
      // Refresh weekly summary
      await get().getWeeklySummary();
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete mood entry',
        loading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));


