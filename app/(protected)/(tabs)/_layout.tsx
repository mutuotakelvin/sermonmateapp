import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

const TAB_BAR_HEIGHT = 64;

export default function TabsLayout() {
  const theme = useTheme();
  // A fixed tabBar height overrides React Navigation's automatic bottom inset,
  // which let Android's navigation bar sit on top of the Mood and Profile tabs
  // and swallow their taps. Add the inset back explicitly.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: theme.font.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      {/* PHASE 2 SEAM: add the Groups tab here (2nd position):
          <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ... }} /> */}
      <Tabs.Screen name="mood" options={{ title: 'Mood', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
