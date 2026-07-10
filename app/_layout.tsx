import 'react-native-url-polyfill/auto';
import { Lora_500Medium, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ToastProvider } from '@/components/ToastProvider';
import { configureNotifications, rescheduleDailyVerse } from '@/lib/notifications';
import { useVerseStore } from '@/lib/stores/verse';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({ Lora_500Medium, Lora_600SemiBold });
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const { initialized, initializeVerseSettings } = useVerseStore();

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

  // Route notification taps (cold start and background) to the verse screen.
  useEffect(() => {
    const screen =
      lastNotificationResponse?.notification.request.content.data?.screen;
    if (screen === 'verse') {
      router.push('/(protected)/verse' as never);
    }
  }, [lastNotificationResponse, router]);

  if (!fontsLoaded && !fontError) {
    return null; // splash stays visible
  }

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
  );
}
