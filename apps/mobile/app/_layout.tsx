import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { AuthProvider } from "../src/auth/auth-provider";
import { connectQueryOnlineManager } from "../src/network";
import { colors } from "../src/theme";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 20_000 },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(() => connectQueryOnlineManager(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.canvas },
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="application/new"
            options={{ title: "Application baru" }}
          />
          <Stack.Screen
            name="application/[id]/index"
            options={{ title: "Detail application" }}
          />
          <Stack.Screen
            name="application/[id]/edit"
            options={{ title: "Edit application" }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
