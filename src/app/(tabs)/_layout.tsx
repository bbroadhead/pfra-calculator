import React from "react";
import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TabSwipeProvider, useTabSwipe } from "@/contexts/TabSwipeContext";

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(Navigator);

function TabsInner() {
  const { swipeEnabled } = useTabSwipe();
  const renderTabIcon = (name: React.ComponentProps<typeof Ionicons>["name"]) => ({ color }: { color: string }) => (
    <Ionicons name={name} size={22} color={color} />
  );

  return (
    <Tabs
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled,
        lazy: true,
        animationEnabled: true,
        tabBarShowIcon: true,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: {
          backgroundColor: "#071226",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 66,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          textTransform: "none",
          marginTop: -2,
        },
        tabBarIndicatorStyle: {
          display: "none",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: renderTabIcon("home-outline"),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: renderTabIcon("barbell-outline"),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: renderTabIcon("checkbox-outline"),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: "Calculator",
          tabBarIcon: renderTabIcon("calculator-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: renderTabIcon("person-outline"),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabSwipeProvider>
      <TabsInner />
    </TabSwipeProvider>
  );
}
