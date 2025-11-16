import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedSermon } from './types';

const STORAGE_KEY = '@saved_sermons';

export async function saveSermon(sermon: SavedSermon): Promise<void> {
  try {
    const sermons = await getSavedSermons();
    const existingIndex = sermons.findIndex(s => s.id === sermon.id);
    if (existingIndex >= 0) {
      // Update existing sermon
      sermons[existingIndex] = sermon;
    } else {
      // Add new sermon
      sermons.push(sermon);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sermons));
  } catch (error) {
    console.error('Error saving sermon:', error);
    throw error;
  }
}

export async function getSavedSermons(): Promise<SavedSermon[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as SavedSermon[];
    }
    return [];
  } catch (error) {
    console.error('Error loading sermons:', error);
    return [];
  }
}

export async function deleteSermon(id: string): Promise<void> {
  try {
    const sermons = await getSavedSermons();
    const filtered = sermons.filter(s => s.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting sermon:', error);
    throw error;
  }
}

