import type { ReminderKind } from "@sei/shared";

import { EMAIL_PROVIDER_REQUEST_TIMEOUT_MS } from "./reminders.constants";

export interface ReminderEmailInput {
  idempotencyKey: string;
  to: string;
  subject: string;
  userDisplayName: string;
  applicationTitle?: string | undefined;
  organizationName?: string | undefined;
  dueAt: Date;
  timezone: string;
  applicationUrl?: string | undefined;
  reminderKind: ReminderKind;
}

export interface EmailProvider {
  sendReminder(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId: string }>;
}

export class EmailProviderError extends Error {
  constructor(readonly code: string) {
    super("Email provider request failed.");
    this.name = "EmailProviderError";
  }
}

export function formatReminderDueAt(dueAt: Date, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  };

  try {
    return new Intl.DateTimeFormat("id-ID", options).format(dueAt);
  } catch {
    return new Intl.DateTimeFormat("id-ID", {
      ...options,
      timeZone: "UTC",
      timeZoneName: undefined,
    }).format(dueAt);
  }
}

export function buildReminderEmailText(input: ReminderEmailInput): string {
  const lines = [
    `Halo ${singleLine(input.userDisplayName)},`,
    "",
    `Ini pengingat ${kindLabel(input.reminderKind)} dari Sei — Job Tracker.`,
    `Waktu: ${formatReminderDueAt(input.dueAt, input.timezone)} (${safeTimezone(input.timezone)})`,
  ];

  if (input.applicationTitle) {
    lines.push(`Application: ${singleLine(input.applicationTitle)}`);
  }

  if (input.organizationName) {
    lines.push(`Organisasi: ${singleLine(input.organizationName)}`);
  }

  if (input.applicationUrl) {
    lines.push("", `Buka detail: ${input.applicationUrl}`);
  }

  lines.push("", "— Sei");
  return lines.join("\n");
}

export function buildReminderSubject(
  applicationTitle: string | null,
  kind: ReminderKind,
): string {
  const title = singleLine(applicationTitle ?? "Sei Job Tracker");
  return `Reminder: ${title} ${kindLabel(kind)}`.slice(0, 200);
}

export function emailErrorCode(error: unknown): string {
  return error instanceof EmailProviderError
    ? error.code.slice(0, 120)
    : "EMAIL_SEND_ERROR";
}

function kindLabel(kind: ReminderKind): string {
  switch (kind) {
    case "DEADLINE":
      return "deadline";
    case "FOLLOW_UP":
      return "follow-up";
    case "INTERVIEW":
      return "interview";
    default:
      return "custom";
  }
}

function singleLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

export class DevelopmentEmailProvider implements EmailProvider {
  sendReminder(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId: string }> {
    return Promise.resolve({
      providerMessageId: `development:${input.idempotencyKey}`,
    });
  }
}

interface ResendResponse {
  id?: unknown;
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async sendReminder(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId: string }> {
    let response: Response;

    try {
      response = await this.request("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [input.to],
          subject: input.subject,
          text: buildReminderEmailText(input),
        }),
        signal: AbortSignal.timeout(EMAIL_PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new EmailProviderError("RESEND_NETWORK_ERROR");
    }

    if (!response.ok) {
      throw new EmailProviderError(`RESEND_HTTP_${response.status}`);
    }

    let payload: ResendResponse;

    try {
      payload = (await response.json()) as ResendResponse;
    } catch {
      throw new EmailProviderError("RESEND_INVALID_RESPONSE");
    }

    if (typeof payload.id !== "string" || payload.id.length === 0) {
      throw new EmailProviderError("RESEND_INVALID_RESPONSE");
    }

    return { providerMessageId: payload.id };
  }
}

export function createEmailProvider(
  environment: NodeJS.ProcessEnv = process.env,
): EmailProvider {
  const configured = environment.EMAIL_PROVIDER;
  const provider =
    configured ??
    (environment.NODE_ENV === "production" ? undefined : "development");

  if (provider === "development") {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "Development email provider cannot be used in production.",
      );
    }

    return new DevelopmentEmailProvider();
  }

  if (provider === "resend") {
    const apiKey = environment.EMAIL_PROVIDER_API_KEY;
    const from = environment.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new Error(
        "EMAIL_PROVIDER_API_KEY and EMAIL_FROM are required for Resend.",
      );
    }

    return new ResendEmailProvider(apiKey, from);
  }

  throw new Error(
    "EMAIL_PROVIDER must be development or resend; production requires resend.",
  );
}
