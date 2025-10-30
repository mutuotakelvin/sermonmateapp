import { ElevenLabsProvider } from "@elevenlabs/react-native";
import { Stack } from "expo-router";

export default function RootLayout() {
  // ElevenLabs Provider doesn't accept props - it reads from environment
  // The API key should be available via process.env or Constants
  return (
    <ElevenLabsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ElevenLabsProvider>
  );
}
