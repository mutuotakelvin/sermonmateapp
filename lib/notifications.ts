import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { bundledVerseSource } from './verses';
import type { Translation } from './verseData';

const CHANNEL_ID = 'daily-verse';
const WINDOW_DAYS = 14;

export interface ReminderSettings {
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  translation: Translation;
}

// Call once at app startup.
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Verse',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch((error) => console.error('Error creating notification channel:', error));
  }
}

export async function requestVersePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Cancel-and-reschedule the rolling window. Idempotent — call on app open
// and whenever reminder settings change. Returns true when a schedule is active.
export async function rescheduleDailyVerse(settings: ReminderSettings): Promise<boolean> {
  try {
    // NOTE: cancels ALL scheduled notifications app-wide. Fine while daily-verse is the only notification type; switch to per-identifier cancellation if another type is ever added.
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.reminderEnabled) return false;

    const granted = await requestVersePermission();
    if (!granted) return false;

    const now = new Date();
    const upcoming = bundledVerseSource.getUpcoming(now, WINDOW_DAYS);

    for (const { verse, date } of upcoming) {
      const fireDate = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        settings.reminderHour, settings.reminderMinute, 0
      );
      if (fireDate <= now) continue; // today's slot already passed

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Verse of the Day',
          body: `"${verse.text[settings.translation]}" — ${verse.reference}`,
          data: { screen: 'verse' },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: CHANNEL_ID,
        },
      });
    }
    return true;
  } catch (error) {
    console.error('Error scheduling daily verse notifications:', error);
    return false;
  }
}
