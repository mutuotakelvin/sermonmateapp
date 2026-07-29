/**
 * Text-to-speech, on-device.
 *
 * expo-speech uses the phone's own TTS engine, so a listen mode costs nothing
 * per play and works with no signal — both of which matter at our price point
 * and in our market. The trade-off is that it CANNOT play in the background:
 * Android stops it when the screen goes off. Listening on a commute needs real
 * audio files, which is a different build.
 *
 * Lazy-loaded behind a guard for the same reason as lib/googleSignin.ts and the
 * react-native-permissions load in lib/reminderScheduler.ts: a native module
 * that isn't in the binary throws at import scope, and this module is imported
 * by screens that render at startup.
 */

type SpeechSdk = typeof import('expo-speech');

let sdk: SpeechSdk | null = null;
let loaded = false;

function loadSdk(): SpeechSdk | null {
  if (loaded) return sdk;
  loaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = require('expo-speech') as SpeechSdk;
  } catch (error) {
    console.warn('expo-speech unavailable; listen mode disabled until a rebuild.', error);
    sdk = null;
  }
  return sdk;
}

/** Whether a listen control should be offered at all. */
export function isSpeechAvailable(): boolean {
  return loadSdk() !== null;
}

export interface SpeakOptions {
  onDone?: () => void;
  onError?: () => void;
}

/**
 * Speak `text`, replacing anything already being spoken. Slightly slower than
 * default: devotional prose read at the stock rate sounds hurried.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const speech = loadSdk();
  if (!speech) {
    options.onError?.();
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    options.onDone?.();
    return;
  }

  try {
    speech.stop();
    speech.speak(trimmed, {
      rate: 0.92,
      pitch: 1.0,
      onDone: options.onDone,
      onStopped: options.onDone,
      onError: options.onError,
    });
  } catch (error) {
    console.warn('Could not start speech', error);
    options.onError?.();
  }
}

export function stopSpeaking(): void {
  const speech = loadSdk();
  if (!speech) return;
  try {
    speech.stop();
  } catch (error) {
    console.warn('Could not stop speech', error);
  }
}
