import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Sermon, MoodType } from './types';

/**
 * Generate a sermon for a topic.
 *
 * Calls the `generateSermon` Cloud Function, which holds the Anthropic API key
 * server-side and calls Claude. The key never ships in the app.
 */
export async function generateSermon(topic: string): Promise<Sermon> {
  const callable = httpsCallable<{ topic: string }, Sermon>(functions, 'generateSermon');
  try {
    const result = await callable({ topic });
    return result.data;
  } catch (error: any) {
    console.error('Error generating sermon:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate sermon. Please try again.');
  }
}

/**
 * Generate a mood-based sermon.
 *
 * Calls the `generateMoodSermon` Cloud Function (same server-side key handling).
 */
export async function generateMoodSermon(
  mood: MoodType,
  reason: string[],
  customReason?: string
): Promise<Sermon> {
  const callable = httpsCallable<
    { mood: MoodType; reason: string[]; customReason?: string },
    Sermon
  >(functions, 'generateMoodSermon');
  try {
    const result = await callable({ mood, reason, customReason });
    return result.data;
  } catch (error: any) {
    console.error('Error generating mood sermon:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate sermon. Please try again.');
  }
}
