import { ToastProvider } from "@/components/ToastProvider";
import { Stack } from "expo-router";

export default function RootLayout() {
  // ElevenLabs Provider doesn't accept props - it reads from environment
  // The API key should be available via process.env or Constants
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
