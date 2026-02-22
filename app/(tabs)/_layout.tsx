import { Tabs } from "expo-router";
import React from "react";

import { CustomTabBar } from "@/components/ui/custom-tab-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
        }}
      />
      <Tabs.Screen
        name="logbook"
        options={{
          title: "Logbook",
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan",
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: "Asisten",
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Monitor",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
