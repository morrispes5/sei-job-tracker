import { Redirect, Tabs } from "expo-router";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  UserRound,
} from "lucide-react-native";

import { useAuth } from "../../src/auth/auth-provider";
import { LoadingState, Screen } from "../../src/components/ui";
import { colors } from "../../src/theme";

export default function TabLayout() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === "anonymous") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Applications",
          tabBarIcon: ({ color, size }) => (
            <BriefcaseBusiness color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
