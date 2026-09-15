import { Redirect } from "expo-router";

import { useAuth } from "../src/auth/auth-provider";
import { AuthScreen } from "../src/components/auth-screen";
import { LoadingState, Screen } from "../src/components/ui";

export default function RegisterScreen() {
  const { state } = useAuth();
  if (state.status === "loading") {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status === "authenticated") {
    return <Redirect href="/dashboard" />;
  }
  return <AuthScreen mode="register" />;
}
