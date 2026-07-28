import * as Notifications from 'expo-notifications';
import type { Translation } from './verseData';
import {
  canScheduleExactAlarms,
  ensureChannels,
  openExactAlarmSettings,
  rearmAllSerialized,
  requestNotificationPermission,
} from './reminderScheduler';
import { getPrayerSlots } from './prayerApi';

/**
 * Daily-verse reminder settings and status. The scheduling itself lives in
 * lib/reminderScheduler.ts, which owns the whole notification schedule — see the
 * comment there for why it cannot be split per notification type.
 */

export interface ReminderSettings {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  translation: Translation;
}

export type ReminderStatus =
  // Reminder toggle is off.
  | 'disabled'
  // Couldn't arm reminders at all — notification permission denied, or scheduling threw.
  | 'unavailable'
  // Scheduled, but the OS won't honour the chosen time: expo-notifications falls back to
  // an inexact alarm that Doze batches into a maintenance window, so a 7:27 AM reminder
  // can land hours late. Recoverable — the user can grant exact alarms.
  | 'inexact'
  // Scheduled and will fire at the chosen time.
  | 'ok';

// Re-exported so existing callers (the verse screen) keep importing from here.
export { canScheduleExactAlarms, openExactAlarmSettings };

/** Call once at app startup. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  ensureChannels();
}

export async function requestVersePermission(): Promise<boolean> {
  return requestNotificationPermission();
}

/**
 * Cancel-and-reschedule everything. Idempotent — call on app open and whenever
 * reminder settings change.
 *
 * Reads the current prayer slots first: re-arming cancels the whole schedule, so
 * skipping this would silently destroy the user's prayer reminders every time
 * they touched the verse reminder time. A failed read degrades to no prayer
 * reminders for this pass rather than blocking the verse reminder entirely.
 */
export async function rescheduleDailyVerse(settings: ReminderSettings): Promise<ReminderStatus> {
  const slots = await getPrayerSlots().catch((error) => {
    console.warn('Could not read prayer slots while re-arming reminders', error);
    return [];
  });
  return rearmAllSerialized(settings, slots);
}
