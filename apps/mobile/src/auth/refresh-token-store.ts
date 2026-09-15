import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const refreshTokenKey = "sei.refresh-token.v1";
let webMemoryToken: string | null = null;

export async function readRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webMemoryToken;
  }

  return SecureStore.getItemAsync(refreshTokenKey);
}

export async function writeRefreshToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    webMemoryToken = token;
    return;
  }

  await SecureStore.setItemAsync(refreshTokenKey, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function deleteRefreshToken(): Promise<void> {
  if (Platform.OS === "web") {
    webMemoryToken = null;
    return;
  }

  await SecureStore.deleteItemAsync(refreshTokenKey);
}
