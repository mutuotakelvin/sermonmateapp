import 'react-native-url-polyfill/auto';
import { Newsreader_500Medium, Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, useFonts } from '@expo-google-fonts/work-sans';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ToastProvider } from '@/components/ToastProvider';
import { configureNotifications, rescheduleDailyVerse } from '@/lib/notifications';
import { configurePurchases, identifyPurchaser, logoutPurchaser, addProListener, syncEntitlement } from '@/lib/purchases';
import { useVerseStore } from '@/lib/stores/verse';
import { usePurchasesStore } from '@/lib/stores/purchases';
import { usePrayerStore } from '@/lib/stores/prayer';
import { useAuthStore } from '@/lib/stores/auth';
import { useAppearanceStore } from '@/lib/stores/appearance';
import { useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();
configurePurchases();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const { initialized, initializeVerseSettings } = useVerseStore();
  const handledResponseId = useRef<string | null>(null);
  const authUserId = useAuthStore((s) => s.user?.id);
  const setPro = usePurchasesStore((s) => s.setPro);
  const initializeAppearance = useAppearanceStore((s) => s.initializeAppearance);
  const theme = useTheme();

  // Restore the saved light/dark preference before the first paint we can control.
  useEffect(() => {
    initializeAppearance();
  }, [initializeAppearance]);

  // Keep the window background in step so overscroll and transitions don't flash
  // the wrong scheme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.color.paper).catch(() => {});
  }, [theme]);

  // Keep the Pro flag live from RevenueCat's SDK.
  useEffect(() => {
    const remove = addProListener((isPro) => setPro(isPro));
    return remove;
  }, [setPro]);

  // On sign-in: identify the purchaser + sync entitlement. On sign-out: clear.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authUserId) {
        try {
          await identifyPurchaser(authUserId);
          await syncEntitlement();
        } catch (err) {
          console.warn('Entitlement sync failed', err);
        }
        if (!cancelled) await usePurchasesStore.getState().refresh();
      } else {
        try { await logoutPurchaser(); } catch { /* not configured yet */ }
        setPro(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUserId, setPro]);

  // Re-verify Pro entitlement whenever the app returns to the foreground, so a
  // buyer who hit a transient RevenueCat/webhook hiccup self-heals.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAuthStore.getState().user?.id) {
        syncEntitlement()
          .then(() => usePurchasesStore.getState().refresh())
          .catch(() => { /* webhook will backstop */ });
      }
    });
    return () => sub.remove();
  }, []);

  // Hide the splash once fonts are ready (or failed — don't block the app on a font).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Load verse settings, then keep the rolling notification window topped up
  // on every app foreground.
  useEffect(() => {
    initializeVerseSettings();
  }, [initializeVerseSettings]);

  useEffect(() => {
    if (!initialized) return;

    const topUp = () => {
      const { reminderEnabled, reminderHour, reminderMinute, translation } =
        useVerseStore.getState();
      rescheduleDailyVerse({ reminderEnabled, reminderHour, reminderMinute, translation });
    };

    topUp();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') topUp();
    });
    return () => sub.remove();
  }, [initialized]);

  // Route notification taps (cold start and background) to the right screen, and
  // handle the prayer reminder's inline actions.
  //
  // "I prayed" is declared opensAppToForeground: false, so when the app is alive
  // this logs without a visible launch. When the app was killed there is no JS to
  // run at tap time — expo-notifications replays the response here on next start,
  // which is why the write happens from the response rather than from a native
  // handler. If that replay proves unreliable on device, flip LOG_PRAYER to
  // opensAppToForeground: true in reminderScheduler.ts and log from the screen.
  useEffect(() => {
    const id = lastNotificationResponse?.notification.request.identifier;
    if (!id || id === handledResponseId.current) return;

    const data = lastNotificationResponse?.notification.request.content.data;
    const action = lastNotificationResponse?.actionIdentifier;
    const screen = data?.screen;

    if (screen === 'verse') {
      handledResponseId.current = id;
      router.push('/(protected)/verse' as never);
      return;
    }

    if (screen === 'prayer') {
      handledResponseId.current = id;
      if (action === 'LOG_PRAYER') {
        const slotId = typeof data?.slotId === 'string' ? data.slotId : null;
        usePrayerStore.getState().logPrayer(slotId).catch(() => {});
        return;
      }
      router.push('/(protected)/prayer' as never);
    }
  }, [lastNotificationResponse, router]);

  if (!fontsLoaded && !fontError) {
    return null; // splash stays visible
  }

  return (
    <ToastProvider>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
  );
}
