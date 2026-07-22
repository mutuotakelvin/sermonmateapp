import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { sanitizeAiText } from './sanitizeAiText';

/**
 * Generate a short prayer responding to a reflection. Quota-free follow-up —
 * calls the `generatePrayer` Cloud Function. The caller persists the result
 * alongside the reflection (see `SermonModal`).
 */
export async function generatePrayer(context: string): Promise<string> {
  const callable = httpsCallable<{ context: string }, { prayer: string }>(functions, 'generatePrayer');
  try {
    const result = await callable({ context });
    return sanitizeAiText(result.data.prayer);
  } catch (error: any) {
    console.error('Error generating prayer:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate. Please try again.');
  }
}
