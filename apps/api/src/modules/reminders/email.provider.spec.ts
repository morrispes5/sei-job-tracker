import { describe, expect, it, vi } from "vitest";

import {
  createEmailProvider,
  DevelopmentEmailProvider,
  formatReminderDueAt,
  ResendEmailProvider,
} from "./email.provider";

describe("EmailProvider", () => {
  it("sends Resend requests with a server-side key and idempotency header", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "provider-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new ResendEmailProvider(
      "server-secret",
      "Sei <notify@example.com>",
      request,
    );

    const result = await provider.sendReminder({
      idempotencyKey: "reminder:abc",
      to: "morriz@example.com",
      subject: "Reminder: Backend Intern deadline",
      userDisplayName: "Morriz",
      applicationTitle: "Backend Intern",
      organizationName: "Contoh Teknologi",
      dueAt: new Date("2026-09-15T12:00:00.000Z"),
      timezone: "Asia/Jakarta",
      applicationUrl: "https://jobs.example.com/applications/abc",
      reminderKind: "DEADLINE",
    });

    expect(result.providerMessageId).toBe("provider-message-1");
    const init = request.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      "reminder:abc",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer server-secret",
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(String(init?.body)).not.toContain("server-secret");
  });

  it("allows no-send preview email but fails closed in production", () => {
    expect(
      createEmailProvider({
        APP_ENV: "preview",
        EMAIL_PROVIDER: "development",
        NODE_ENV: "production",
      }),
    ).toBeInstanceOf(DevelopmentEmailProvider);
    expect(() =>
      createEmailProvider({
        APP_ENV: "production",
        NODE_ENV: "production",
        EMAIL_PROVIDER: "development",
      }),
    ).toThrow("APP_ENV=production");
    expect(() =>
      createEmailProvider({
        APP_ENV: "prod",
        EMAIL_PROVIDER: "resend",
      }),
    ).toThrow("APP_ENV must be local, preview, or production");
  });

  it("falls back to UTC for an invalid stored timezone", () => {
    const formatted = formatReminderDueAt(
      new Date("2026-09-15T12:00:00.000Z"),
      "Not/A-Timezone",
    );
    expect(formatted).toContain("12.00");
  });

  it("rejects placeholder sender domains for Resend at boot", () => {
    const base = {
      APP_ENV: "production",
      NODE_ENV: "production",
      EMAIL_PROVIDER: "resend",
      EMAIL_PROVIDER_API_KEY: "re_test_key",
    };

    for (const from of [
      "Sei <no-reply@example.com>",
      "Sei <no-reply@notify.example.net>",
      "no-reply@localhost",
      "Sei <no-reply@app.test>",
    ]) {
      expect(() => createEmailProvider({ ...base, EMAIL_FROM: from })).toThrow(
        "verified sending domain",
      );
    }

    expect(() =>
      createEmailProvider({ ...base, EMAIL_FROM: "not-an-email" }),
    ).toThrow("parseable address");

    expect(() =>
      createEmailProvider({ ...base, EMAIL_FROM: "Sei <missing-at>" }),
    ).toThrow("parseable address");

    expect(
      createEmailProvider({
        ...base,
        EMAIL_FROM: "Sei <no-reply@notify.morriztech.cloud>",
      }),
    ).toBeInstanceOf(ResendEmailProvider);

    expect(
      createEmailProvider({
        ...base,
        EMAIL_FROM: "no-reply@notify.morriztech.cloud",
      }),
    ).toBeInstanceOf(ResendEmailProvider);
  });
});
