import type { MoodType } from './types';

export const MOOD_REASONS: Record<MoodType, string[]> = {
  Happy: [
    'Work',
    'Family',
    'Health',
    'Relationships',
    'Faith',
    'Achievement',
    'Gratitude',
    'Peace',
  ],
  Grateful: [
    'Blessings',
    'Family',
    'Health',
    'Provision',
    'Faith',
    'Community',
    'Answered Prayers',
    'Growth',
  ],
  Hopeful: [
    'Future Plans',
    'New Opportunities',
    'Faith',
    'Progress',
    'Prayers',
    'Dreams',
    'Potential',
    'Change',
  ],
  Peaceful: [
    'Prayer',
    'Meditation',
    'Rest',
    'Nature',
    'Faith',
    'Contentment',
    'Acceptance',
    'Trust',
  ],
  Anxious: [
    'Work',
    'Health',
    'Finances',
    'Relationships',
    'Future',
    'Decisions',
    'Uncertainty',
    'Pressure',
  ],
  Sad: [
    'Loss',
    'Disappointment',
    'Health',
    'Relationships',
    'Loneliness',
    'Regret',
    'Grief',
    'Struggles',
  ],
  Overwhelmed: [
    'Work',
    'Responsibilities',
    'Time',
    'Expectations',
    'Multiple Tasks',
    'Pressure',
    'Demands',
    'Stress',
  ],
  Angry: [
    'Injustice',
    'Conflict',
    'Disappointment',
    'Frustration',
    'Betrayal',
    'Unfairness',
    'Boundaries',
    'Misunderstanding',
  ],
};

/**
 * Get reason options for a specific mood
 */
export function getReasonsForMood(mood: MoodType): string[] {
  return MOOD_REASONS[mood] || [];
}

/**
 * Get all common reasons (used as fallback or for "other" category)
 */
export const COMMON_REASONS = [
  'Work',
  'Family',
  'Health',
  'Relationships',
  'Faith',
  'Finances',
  'Future',
  'Personal Growth',
];


