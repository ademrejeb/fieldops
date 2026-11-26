import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#C2410C",
        tabBarInactiveTintColor: "#A8A29E",
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E8DCC9" },
      }}
    >
      <Tabs.Screen name="jobs" options={{ title: "Missions", tabBarIcon: () => <Text>🧰</Text> }} />
      <Tabs.Screen name="settings" options={{ title: "Réglages", tabBarIcon: () => <Text>⚙️</Text> }} />
    </Tabs>
  );
}
