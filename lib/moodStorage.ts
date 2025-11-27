import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MoodEntry, WeeklyMoodSummary } from './types';

const MOOD_ENTRIES_KEY = '@mood_entries';

/**
 * Save a mood entry to AsyncStorage
 */
export async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  try {
    const existingEntries = await getMoodEntries();
    const updatedEntries = [...existingEntries, entry];
    await AsyncStorage.setItem(MOOD_ENTRIES_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Error saving mood entry:', error);
    throw new Error('Failed to save mood entry');
  }
}

/**
 * Get all mood entries from AsyncStorage
 */
export async function getMoodEntries(): Promise<MoodEntry[]> {
  try {
    const data = await AsyncStorage.getItem(MOOD_ENTRIES_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as MoodEntry[];
  } catch (error) {
    console.error('Error loading mood entries:', error);
    return [];
  }
}

/**
 * Get mood entries within a date range
 */
export async function getMoodEntriesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<MoodEntry[]> {
  try {
    const allEntries = await getMoodEntries();
    return allEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });
  } catch (error) {
    console.error('Error getting mood entries by date range:', error);
    return [];
  }
}

/**
 * Get current week's mood summary
 */
export async function getWeeklyMoodSummary(): Promise<WeeklyMoodSummary | null> {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const entries = await getMoodEntriesByDateRange(weekStart, weekEnd);
    
    if (entries.length === 0) {
      return null;
    }

    // Calculate most common mood
    const moodCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });

    const mostCommonMood = Object.entries(moodCounts).reduce((a, b) =>
      moodCounts[a[0]] > moodCounts[b[0]] ? a : b
    )[0] as MoodEntry['mood'];

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      entries,
      mostCommonMood,
    };
  } catch (error) {
    console.error('Error getting weekly mood summary:', error);
    return null;
  }
}

/**
 * Get mood entry by ID
 */
export async function getMoodEntryById(id: string): Promise<MoodEntry | null> {
  try {
    const entries = await getMoodEntries();
    return entries.find((entry) => entry.id === id) || null;
  } catch (error) {
    console.error('Error getting mood entry by ID:', error);
    return null;
  }
}

/**
 * Delete a mood entry
 */
export async function deleteMoodEntry(id: string): Promise<void> {
  try {
    const entries = await getMoodEntries();
    const filtered = entries.filter((entry) => entry.id !== id);
    await AsyncStorage.setItem(MOOD_ENTRIES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting mood entry:', error);
    throw new Error('Failed to delete mood entry');
  }
}


