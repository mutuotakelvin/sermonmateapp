import { ElevenLabsProvider } from "@elevenlabs/react-native";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <ElevenLabsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ElevenLabsProvider>
  );
}
