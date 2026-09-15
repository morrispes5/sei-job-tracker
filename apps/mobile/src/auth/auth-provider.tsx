import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AuthLoginInput, AuthRegisterInput, AuthUser } from "@sei/shared";

import {
  ApiError,
  authApi,
  requestJson,
  type ApiRequestOptions,
} from "../lib/api";
import {
  deleteRefreshToken,
  readRefreshToken,
  writeRefreshToken,
} from "./refresh-token-store";

type AuthState =
  | { status: "loading"; session: null }
  | { status: "anonymous"; session: null }
  | {
      status: "authenticated";
      session: { accessToken: string; user: AuthUser };
    };

interface AuthContextValue {
  state: AuthState;
  login(input: AuthLoginInput): Promise<void>;
  register(input: AuthRegisterInput): Promise<void>;
  logout(): Promise<void>;
  request<T>(
    path: string,
    options?: Omit<ApiRequestOptions, "accessToken">,
  ): Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
  });
  const sessionRef = useRef<AuthState["session"]>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const clearSession = useCallback(async (): Promise<void> => {
    refreshTokenRef.current = null;
    sessionRef.current = null;
    await deleteRefreshToken();
    setState({ status: "anonymous", session: null });
  }, []);

  const saveSession = useCallback(
    async (session: {
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }): Promise<void> => {
      await writeRefreshToken(session.refreshToken);
      refreshTokenRef.current = session.refreshToken;
      const memorySession = {
        accessToken: session.accessToken,
        user: session.user,
      };
      sessionRef.current = memorySession;
      setState({ status: "authenticated", session: memorySession });
    },
    [],
  );

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    refreshPromise.current = (async () => {
      const token = refreshTokenRef.current ?? (await readRefreshToken());

      if (!token) {
        setState({ status: "anonymous", session: null });
        return null;
      }

      refreshTokenRef.current = token;

      try {
        const session = await authApi.refresh(token);
        await saveSession(session);
        return session.accessToken;
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 0) {
          setState({ status: "anonymous", session: null });
          return null;
        }

        await clearSession();
        return null;
      }
    })().finally(() => {
      refreshPromise.current = null;
    });

    return refreshPromise.current;
  }, [clearSession, saveSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(
    () =>
      NetInfo.addEventListener((networkState) => {
        const connected =
          networkState.isConnected !== false &&
          networkState.isInternetReachable !== false;

        if (
          connected &&
          !sessionRef.current &&
          refreshTokenRef.current &&
          !refreshPromise.current
        ) {
          void refresh();
        }
      }),
    [refresh],
  );

  const login = useCallback(
    async (input: AuthLoginInput): Promise<void> => {
      const session = await authApi.login(input);
      await saveSession(session);
    },
    [saveSession],
  );

  const register = useCallback(
    async (input: AuthRegisterInput): Promise<void> => {
      const session = await authApi.register(input);
      await saveSession(session);
    },
    [saveSession],
  );

  const logout = useCallback(async (): Promise<void> => {
    const token = refreshTokenRef.current ?? (await readRefreshToken());

    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch {
      // Local logout remains authoritative when the API is unreachable.
    } finally {
      await clearSession();
    }
  }, [clearSession]);

  const request = useCallback(
    async <T,>(
      path: string,
      options: Omit<ApiRequestOptions, "accessToken"> = {},
    ): Promise<T> => {
      const accessToken = sessionRef.current?.accessToken;

      try {
        return await requestJson<T>(
          path,
          accessToken ? { ...options, accessToken } : options,
        );
      } catch (error: unknown) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedToken = await refresh();

        if (!refreshedToken) {
          throw error;
        }

        return requestJson<T>(path, {
          ...options,
          accessToken: refreshedToken,
        });
      }
    },
    [refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, register, logout, request }),
    [state, login, register, logout, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
