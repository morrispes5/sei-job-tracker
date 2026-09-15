import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

export function connectQueryOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      );
    }),
  );
}

export function useIsOffline(): boolean {
  const state = useNetInfo();
  return state.isConnected === false || state.isInternetReachable === false;
}
