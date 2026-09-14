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
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  const setSession = useCallback((session: AuthState["session"]) => {
    sessionRef.current = session;
    setState(
      session
        ? { status: "authenticated", session }
        : { status: "anonymous", session: null },
    );
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    refreshPromise.current = authApi
      .refresh()
      .then((session) => {
        setSession(session);
        return session.accessToken;
      })
      .catch(() => {
        setSession(null);
        return null;
      })
      .finally(() => {
        refreshPromise.current = null;
      });

    return refreshPromise.current;
  }, [setSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: AuthLoginInput): Promise<void> => {
      const session = await authApi.login(input);
      setSession(session);
    },
    [setSession],
  );

  const register = useCallback(
    async (input: AuthRegisterInput): Promise<void> => {
      const session = await authApi.register(input);
      setSession(session);
    },
    [setSession],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setSession(null);
    }
  }, [setSession]);

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
