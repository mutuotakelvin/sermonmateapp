import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { theme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textMuted,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.border,
          height: 64,
          paddingBottom: 8,
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
