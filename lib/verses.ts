import { BundledVerse, Translation, VERSES } from './verseData';

export interface DailyVerse {
  verse: BundledVerse;
  date: Date;
}

export interface VerseSource {
  getVerseForDate(date: Date): BundledVerse;
  getUpcoming(from: Date, days: number): DailyVerse[];
}

// Defensive fallback if VERSES were ever empty (spec: cannot crash).
const FALLBACK: BundledVerse = {
  id: 'john-3-16',
  reference: 'John 3:16',
  text: {
    WEB: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    KJV: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  },
};

// Days since epoch in LOCAL calendar time, so the verse flips at local midnight
// and is the same for every user on a given calendar date.
function localDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

export const bundledVerseSource: VerseSource = {
  getVerseForDate(date: Date): BundledVerse {
    if (VERSES.length === 0) return FALLBACK;
    return VERSES[localDayNumber(date) % VERSES.length];
  },

  getUpcoming(from: Date, days: number): DailyVerse[] {
    const result: DailyVerse[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      result.push({ verse: this.getVerseForDate(date), date });
    }
    return result;
  },
};

export function formatVerseForShare(verse: BundledVerse, translation: Translation): string {
  return `"${verse.text[translation]}"\n— ${verse.reference} (${translation})`;
}
