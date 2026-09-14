import {
  apiPaths,
  type ApplicationContactCreateInput,
  type ApplicationContactDto,
  type ApplicationContactUpdateInput,
  type ApplicationCreateInput,
  type ApplicationDetailDto,
  type ApplicationDto,
  type ApplicationListResponse,
  type ApplicationNoteBodyInput,
  type ApplicationNoteDto,
  type ApplicationUpdateInput,
  type AuthLoginInput,
  type AuthRegisterInput,
  type AuthWebSession,
} from "@sei/shared";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1"
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

function buildUrl(path: string, query?: ApplicationListParams): string {
  const url = new URL(`${apiBaseUrl}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
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
  const headers = new Headers({
    Accept: "application/json",
    "X-Client-Platform": "web",
  });

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  if (options.signal) {
    requestInit.signal = options.signal;
  }

  const response = await fetch(buildUrl(path), requestInit);

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}

export const authApi = {
  login(input: AuthLoginInput): Promise<AuthWebSession> {
    return requestJson<AuthWebSession>(apiPaths.auth.login, {
      method: "POST",
      body: input,
    });
  },
  register(input: AuthRegisterInput): Promise<AuthWebSession> {
    return requestJson<AuthWebSession>(apiPaths.auth.register, {
      method: "POST",
      body: input,
    });
  },
  refresh(): Promise<AuthWebSession> {
    return requestJson<AuthWebSession>(apiPaths.auth.refresh, {
      method: "POST",
    });
  },
  logout(): Promise<{ success: true }> {
    return requestJson<{ success: true }>(apiPaths.auth.logout, {
      method: "POST",
    });
  },
};

export const applicationsApi = {
  list(
    query: ApplicationListParams,
    accessToken: string,
  ): Promise<ApplicationListResponse> {
    return requestJson<ApplicationListResponse>(
      `${apiPaths.applications.root}?${new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== "")
          .map(([key, value]) => [key, String(value)]),
      ).toString()}`,
      { accessToken },
    );
  },
  get(
    applicationId: string,
    accessToken: string,
  ): Promise<ApplicationDetailDto> {
    return requestJson<ApplicationDetailDto>(
      apiPaths.applications.byId(applicationId),
      { accessToken },
    );
  },
  create(
    input: ApplicationCreateInput,
    accessToken: string,
  ): Promise<ApplicationDto> {
    return requestJson<ApplicationDto>(apiPaths.applications.root, {
      method: "POST",
      body: input,
      accessToken,
    });
  },
  update(
    applicationId: string,
    input: ApplicationUpdateInput,
    accessToken: string,
  ): Promise<ApplicationDto> {
    return requestJson<ApplicationDto>(
      apiPaths.applications.byId(applicationId),
      {
        method: "PATCH",
        body: input,
        accessToken,
      },
    );
  },
  archive(applicationId: string, accessToken: string): Promise<ApplicationDto> {
    return requestJson<ApplicationDto>(
      apiPaths.applications.archive(applicationId),
      {
        method: "POST",
        accessToken,
      },
    );
  },
  restore(applicationId: string, accessToken: string): Promise<ApplicationDto> {
    return requestJson<ApplicationDto>(
      apiPaths.applications.restore(applicationId),
      {
        method: "POST",
        accessToken,
      },
    );
  },
  remove(
    applicationId: string,
    accessToken: string,
  ): Promise<{ success: true }> {
    return requestJson<{ success: true }>(
      apiPaths.applications.byId(applicationId),
      {
        method: "DELETE",
        accessToken,
      },
    );
  },
  createNote(
    applicationId: string,
    input: ApplicationNoteBodyInput,
    accessToken: string,
  ): Promise<ApplicationNoteDto> {
    return requestJson<ApplicationNoteDto>(
      apiPaths.applications.notes(applicationId),
      {
        method: "POST",
        body: input,
        accessToken,
      },
    );
  },
  deleteNote(
    applicationId: string,
    noteId: string,
    accessToken: string,
  ): Promise<{ success: true }> {
    return requestJson<{ success: true }>(
      apiPaths.applications.noteById(applicationId, noteId),
      { method: "DELETE", accessToken },
    );
  },
  createContact(
    applicationId: string,
    input: ApplicationContactCreateInput,
    accessToken: string,
  ): Promise<ApplicationContactDto> {
    return requestJson<ApplicationContactDto>(
      apiPaths.applications.contacts(applicationId),
      {
        method: "POST",
        body: input,
        accessToken,
      },
    );
  },
  updateContact(
    applicationId: string,
    contactId: string,
    input: ApplicationContactUpdateInput,
    accessToken: string,
  ): Promise<ApplicationContactDto> {
    return requestJson<ApplicationContactDto>(
      apiPaths.applications.contactById(applicationId, contactId),
      { method: "PATCH", body: input, accessToken },
    );
  },
  deleteContact(
    applicationId: string,
    contactId: string,
    accessToken: string,
  ): Promise<{ success: true }> {
    return requestJson<{ success: true }>(
      apiPaths.applications.contactById(applicationId, contactId),
      { method: "DELETE", accessToken },
    );
  },
};
