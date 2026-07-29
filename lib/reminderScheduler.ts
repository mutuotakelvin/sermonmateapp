import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { bundledVerseSource } from './verses';
import type { PrayerSlot } from './types';
import type { ReminderSettings, ReminderStatus } from './notifications';

/**
 * The ONLY module that mutates the notification schedule.
 *
 * Arming the daily verse and the prayer reminders independently is not possible:
 * re-arming requires cancelling first, and expo-notifications cancels by
 * identifier or cancels everything. `lib/notifications.ts` used to call
 * cancelAllScheduledNotificationsAsync() directly, with a note saying to switch
 * "if another type is ever added". Prayer times are that other type — so the
 * cancel lives here, once, and every re-arm rebuilds both kinds together.
 *
 * Do not call cancelAllScheduledNotificationsAsync() anywhere else.
 */

export const VERSE_CHANNEL_ID = 'daily-verse';
export const PRAYER_CHANNEL_ID = 'prayer-times';
export const PRAYER_CATEGORY_ID = 'prayer-reminder';

const WINDOW_DAYS = 14;

// Android 12 (API 31) is where AlarmManager began gating exact alarms behind
// SCHEDULE_EXACT_ALARM. Below it, every alarm is exact and there is nothing to ask for.
const ANDROID_12 = 31;

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

/** Separate channels so prayer nudges can be muted without losing the daily verse. */
export function ensureChannels(): void {
  if (Platform.OS !== 'android') return;

  Notifications.setNotificationChannelAsync(VERSE_CHANNEL_ID, {
    name: 'Daily Verse',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch((error) => console.error('Error creating verse channel:', error));

  Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
    name: 'Prayer Times',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch((error) => console.error('Error creating prayer channel:', error));

  // Both actions open the app.
  //
  // "I prayed" was originally opensAppToForeground: false, so it could log from
  // the lock screen without a visible launch. On Android that requires a
  // registered background notification task to receive the response — without
  // one the response has no handler, and it broke the whole notification: the
  // body tap opened the app and immediately failed too. The daily verse
  // notification carries no category and was never affected, which is what
  // pointed at this.
  //
  // Opening the app costs one extra beat but the log always lands. Revisit with
  // registerTaskAsync if lock-screen logging turns out to matter.
  Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY_ID, [
    { identifier: 'LOG_PRAYER', buttonTitle: 'I prayed', options: { opensAppToForeground: true } },
    { identifier: 'PRAY_WITH_ME', buttonTitle: 'Pray with me', options: { opensAppToForeground: true } },
  ]).catch((error) => console.error('Error creating prayer category:', error));
}

export async function requestNotificationPermission(): Promise<boolean> {
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

async function scheduleVerseWindow(settings: ReminderSettings): Promise<void> {
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
        channelId: VERSE_CHANNEL_ID,
      },
    });
  }
}

/**
 * One repeating daily trigger per slot. The verse reminder needs a rolling window
 * because each day's text differs; a prayer nudge is identical every day, so
 * there is nothing to refresh.
 */
async function schedulePrayerSlot(slot: PrayerSlot): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${slot.label} prayer`,
      // Unpressured on purpose. Never "don't break your streak".
      body: "A few minutes, whenever you're ready.",
      data: { screen: 'prayer', slotId: slot.id },
      categoryIdentifier: PRAYER_CATEGORY_ID,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: slot.hour,
      minute: slot.minute,
      channelId: PRAYER_CHANNEL_ID,
    },
  });
}

async function rearmAll(
  settings: ReminderSettings,
  slots: PrayerSlot[],
): Promise<ReminderStatus> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const enabledSlots = slots.filter((slot) => slot.enabled);
    if (!settings.reminderEnabled && enabledSlots.length === 0) return 'disabled';

    const granted = await requestNotificationPermission();
    if (!granted) return 'unavailable';

    if (settings.reminderEnabled) await scheduleVerseWindow(settings);
    for (const slot of enabledSlots) await schedulePrayerSlot(slot);

    // Scheduled either way — an inexact reminder still beats no reminder.
    return (await canScheduleExactAlarms()) ? 'ok' : 'inexact';
  } catch (error) {
    console.error('Error arming reminders:', error);
    return 'unavailable';
  }
}

// Serialize concurrent calls: a new re-arm waits for any in-flight one to finish,
// so two callers (settings screen + app-foreground top-up) can't interleave
// cancel/schedule and double the notification window.
let inFlight: Promise<ReminderStatus> = Promise.resolve('disabled');

export function rearmAllSerialized(
  settings: ReminderSettings,
  slots: PrayerSlot[],
): Promise<ReminderStatus> {
  const next = inFlight
    .catch((): ReminderStatus => 'disabled')
    .then(() => rearmAll(settings, slots));
  inFlight = next;
  return next;
}
