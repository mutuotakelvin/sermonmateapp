import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { bundledVerseSource } from './verses';
import type { Translation } from './verseData';

const CHANNEL_ID = 'daily-verse';
const WINDOW_DAYS = 14;

// Android 12 (API 31) is where AlarmManager began gating exact alarms behind
// SCHEDULE_EXACT_ALARM. Below it, every alarm is exact and there is nothing to ask for.
const ANDROID_12 = 31;

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

// Type-only reference — fully erased at compile time, so it does NOT create a runtime
// import. Mirrors the lazy-load in lib/googleSignin.ts and for the same reason:
// react-native-permissions' spec module runs TurboModuleRegistry.getEnforcing('RNPermissions')
// at import scope, which THROWS when the native module isn't in the binary (e.g. a dev
// client built before this dependency was added). app/_layout.tsx calls
// configureNotifications() at module scope, so an eager import here would take down every
// screen rather than just degrade the exact-alarm prompt.
type PermissionsSdk = typeof import('react-native-permissions');

let permissionsSdk: PermissionsSdk | null = null;
let permissionsSdkLoaded = false;

function loadPermissionsSdk(): PermissionsSdk | null {
  if (permissionsSdkLoaded) return permissionsSdk;
  permissionsSdkLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    permissionsSdk = require('react-native-permissions') as PermissionsSdk;
  } catch (err) {
    console.warn('react-native-permissions unavailable; skipping exact-alarm check until a rebuild.', err);
    permissionsSdk = null;
  }
  return permissionsSdk;
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

// Whether the OS will honour our exact fire times. Only Android 12+ can refuse.
// Errs on the side of `true`: when we genuinely can't tell, stay quiet rather than
// warn about drift that may not be happening.
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (typeof Platform.Version === 'number' && Platform.Version < ANDROID_12) return true;

  const sdk = loadPermissionsSdk();
  if (!sdk) return true;

  try {
    return await sdk.canScheduleExactAlarms();
  } catch (error) {
    console.warn('Could not read exact-alarm setting:', error);
    return true;
  }
}

// Opens Settings → Special app access → Alarms & reminders. Granting there does not
// restart us, but app/_layout.tsx reschedules on every foreground, so returning to the
// app re-arms the window as exact alarms.
export async function openExactAlarmSettings(): Promise<void> {
  const sdk = loadPermissionsSdk();
  if (!sdk) return;

  try {
    await sdk.openSettings('alarms');
  } catch (error) {
    console.error('Error opening exact alarm settings:', error);
  }
}

// Cancel-and-reschedule the rolling window. Idempotent — call on app open
// and whenever reminder settings change. Returns the resulting schedule state.
async function runReschedule(settings: ReminderSettings): Promise<ReminderStatus> {
  try {
    // NOTE: cancels ALL scheduled notifications app-wide. Fine while daily-verse is the only notification type; switch to per-identifier cancellation if another type is ever added.
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!settings.reminderEnabled) return 'disabled';

    const granted = await requestVersePermission();
    if (!granted) return 'unavailable';

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

    // Scheduled either way — an inexact reminder still beats no reminder.
    return (await canScheduleExactAlarms()) ? 'ok' : 'inexact';
  } catch (error) {
    console.error('Error scheduling daily verse notifications:', error);
    return 'unavailable';
  }
}

// Serialize concurrent calls: a new reschedule waits for any in-flight one to
// finish, so two callers (settings screen + app-foreground top-up) can't
// interleave cancel/schedule and double the notification window.
let inFlight: Promise<ReminderStatus> = Promise.resolve('disabled');

export function rescheduleDailyVerse(settings: ReminderSettings): Promise<ReminderStatus> {
  const next = inFlight.catch((): ReminderStatus => 'disabled').then(() => runReschedule(settings));
  inFlight = next;
  return next;
}
