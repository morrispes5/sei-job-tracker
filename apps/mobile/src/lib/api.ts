import {
  apiPaths,
  type AuthLoginInput,
  type AuthMobileSession,
  type AuthRegisterInput,
} from "@sei/shared";

export const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
  };
}

export class ApiError extends Error {
  readonly code: string | undefined;
  readonly fields: Record<string, string[]> | undefined;

  constructor(
    readonly status: number,
    payload: ApiErrorPayload,
  ) {
    super(payload.error?.message ?? "Permintaan tidak dapat diproses.");
    this.name = "ApiError";
    this.code = payload.error?.code;
    this.fields = payload.error?.fields;
  }
}

export interface ApiRequestOptions {
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  body?: unknown;
  accessToken?: string | undefined;
  signal?: AbortSignal | undefined;
}

export interface ApplicationListParams {
  status?: string | undefined;
  type?: string | undefined;
  q?: string | undefined;
  archived?: "true" | "false" | undefined;
  deadlineFrom?: string | undefined;
  deadlineTo?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sort?: string | undefined;
}

export function listPath(query: ApplicationListParams = {}): string {
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");

  return search
    ? `${apiPaths.applications.root}?${search}`
    : apiPaths.applications.root;
}

async function readPayload(response: Response): Promise<ApiErrorPayload> {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return {};
  }
}

export async function requestJson<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Client-Platform": "mobile",
  };

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  if (options.signal) {
    requestInit.signal = options.signal;
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, requestInit);
  } catch {
    throw new ApiError(0, {
      error: {
        code: "NETWORK_ERROR",
        message:
          "API tidak dapat dihubungi. Periksa koneksi dan EXPO_PUBLIC_API_BASE_URL.",
      },
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}

export const authApi = {
  login(input: AuthLoginInput): Promise<AuthMobileSession> {
    return requestJson<AuthMobileSession>(apiPaths.auth.login, {
      method: "POST",
      body: input,
    });
  },
  register(input: AuthRegisterInput): Promise<AuthMobileSession> {
    return requestJson<AuthMobileSession>(apiPaths.auth.register, {
      method: "POST",
      body: input,
    });
  },
  refresh(refreshToken: string): Promise<AuthMobileSession> {
    return requestJson<AuthMobileSession>(apiPaths.auth.refresh, {
      method: "POST",
      body: { refreshToken },
    });
  },
  logout(refreshToken: string): Promise<{ success: true }> {
    return requestJson<{ success: true }>(apiPaths.auth.logout, {
      method: "POST",
      body: { refreshToken },
    });
  },
};
