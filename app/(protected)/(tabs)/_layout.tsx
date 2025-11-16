import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      {/* Hide profile tab since it's now in the drawer */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This hides the tab
        }}
      />
      {/* Hide any sermon route if it still exists */}
      <Tabs.Screen
        name="sermon/index"
        options={{
          href: null, // This hides the tab
        }}
      />
    </Tabs>
  );
}


