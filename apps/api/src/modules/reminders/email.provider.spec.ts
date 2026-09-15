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

  it("uses a no-send development adapter outside production", () => {
    expect(createEmailProvider({ NODE_ENV: "development" })).toBeInstanceOf(
      DevelopmentEmailProvider,
    );
    expect(() =>
      createEmailProvider({
        NODE_ENV: "production",
        EMAIL_PROVIDER: "development",
      }),
    ).toThrow("cannot be used in production");
  });

  it("falls back to UTC for an invalid stored timezone", () => {
    const formatted = formatReminderDueAt(
      new Date("2026-09-15T12:00:00.000Z"),
      "Not/A-Timezone",
    );
    expect(formatted).toContain("12.00");
  });
});
