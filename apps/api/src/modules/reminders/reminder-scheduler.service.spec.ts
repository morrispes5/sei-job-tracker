import { describe, expect, it } from "vitest";

import type { EmailProvider, ReminderEmailInput } from "./email.provider";
import { buildReminderEmailText, EmailProviderError } from "./email.provider";
import { ReminderSchedulerService } from "./reminder-scheduler.service";
import { InMemoryRemindersRepository } from "./reminders.test-support";

const userId = "11111111-1111-4111-8111-111111111111";
const applicationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const dueAt = new Date("2026-09-15T12:00:00.000Z");

class CapturingEmailProvider implements EmailProvider {
  readonly sends: ReminderEmailInput[] = [];
  failuresRemaining = 0;

  sendReminder(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId: string }> {
    this.sends.push(input);

    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new EmailProviderError("TEST_PROVIDER_FAILURE");
    }

    return Promise.resolve({ providerMessageId: `email-${this.sends.length}` });
  }
}

function createScheduler(provider = new CapturingEmailProvider()) {
  const repository = new InMemoryRemindersRepository();
  repository.addUser(userId, {
    email: "morriz@example.com",
    displayName: "Morriz",
    timezone: "Asia/Jakarta",
  });
  repository.addApplication(applicationId, userId);
  const scheduler = new ReminderSchedulerService(repository, provider, {
    appBaseUrl: "https://jobs.example.com",
    batchSize: 25,
  });
  return { provider, repository, scheduler };
}

describe("ReminderSchedulerService", () => {
  it("claims a due reminder and never sends it twice after SENT", async () => {
    const { provider, repository, scheduler } = createScheduler();
    const reminder = repository.addReminder({
      userId,
      applicationId,
      kind: "FOLLOW_UP",
      dueAt,
    });

    expect(await scheduler.processDue(dueAt)).toBe(1);
    expect(
      await scheduler.processDue(new Date(dueAt.getTime() + 300_000)),
    ).toBe(0);
    expect(provider.sends).toHaveLength(1);
    expect(provider.sends[0]?.idempotencyKey).toBe(`reminder:${reminder.id}`);
    expect(reminder.deliveryStatus).toBe("SENT");
    expect(reminder.attemptCount).toBe(1);
  });

  it("retries at most three times and then marks the reminder FAILED", async () => {
    const provider = new CapturingEmailProvider();
    provider.failuresRemaining = 3;
    const { repository, scheduler } = createScheduler(provider);
    const reminder = repository.addReminder({
      userId,
      applicationId,
      kind: "INTERVIEW",
      dueAt,
    });

    await scheduler.processDue(dueAt);
    expect(reminder.deliveryStatus).toBe("PENDING");
    expect(reminder.attemptCount).toBe(1);
    await scheduler.processDue(new Date(dueAt.getTime() + 300_000));
    expect(reminder.deliveryStatus).toBe("PENDING");
    expect(reminder.attemptCount).toBe(2);
    await scheduler.processDue(new Date(dueAt.getTime() + 600_000));
    expect(reminder.deliveryStatus).toBe("FAILED");
    expect(reminder.attemptCount).toBe(3);
    expect(reminder.lastErrorCode).toBe("TEST_PROVIDER_FAILURE");
    expect(provider.sends).toHaveLength(3);
    expect(
      new Set(provider.sends.map((send) => send.idempotencyKey)).size,
    ).toBe(1);
  });

  it("reuses the exact frozen payload when user or application data changes", async () => {
    const provider = new CapturingEmailProvider();
    provider.failuresRemaining = 1;
    const { repository, scheduler } = createScheduler(provider);
    repository.addReminder({
      userId,
      applicationId,
      kind: "FOLLOW_UP",
      dueAt,
    });

    await scheduler.processDue(dueAt);
    repository.addUser(userId, {
      email: "changed@example.com",
      displayName: "Changed",
      timezone: "UTC",
    });
    repository.addApplication(applicationId, userId, {
      title: "Changed role",
      organizationName: "Changed org",
    });
    await scheduler.processDue(new Date(dueAt.getTime() + 300_000));

    expect(provider.sends).toHaveLength(2);
    expect(provider.sends[1]).toEqual(provider.sends[0]);
  });

  it("does not send cancelled, future, or deleted-application reminders", async () => {
    const { provider, repository, scheduler } = createScheduler();
    repository.addReminder({
      userId,
      applicationId,
      kind: "CUSTOM",
      dueAt,
      deliveryStatus: "CANCELLED",
    });
    repository.addReminder({
      userId,
      applicationId: null,
      kind: "CUSTOM",
      dueAt: new Date(dueAt.getTime() + 1),
    });
    repository.addApplication(applicationId, userId, { deleted: true });
    repository.addReminder({
      userId,
      applicationId,
      kind: "DEADLINE",
      dueAt,
    });

    expect(await scheduler.processDue(dueAt)).toBe(0);
    expect(provider.sends).toHaveLength(0);
  });

  it("formats the user's timezone and includes the direct application link", async () => {
    const { provider, repository, scheduler } = createScheduler();
    repository.addReminder({
      userId,
      applicationId,
      kind: "DEADLINE",
      dueAt,
    });

    await scheduler.processDue(dueAt);
    const sent = provider.sends[0];
    expect(sent?.applicationUrl).toBe(
      `https://jobs.example.com/applications/${applicationId}`,
    );
    expect(buildReminderEmailText(sent!)).toContain("19.00");
    expect(buildReminderEmailText(sent!)).toContain("Asia/Jakarta");
  });

  it("keeps processing other rows within the configured batch", async () => {
    const { provider, repository, scheduler } = createScheduler();
    repository.addReminder({
      userId,
      applicationId: null,
      kind: "CUSTOM",
      dueAt,
    });
    repository.addReminder({
      userId,
      applicationId: null,
      kind: "FOLLOW_UP",
      dueAt,
    });

    expect(await scheduler.processDue(dueAt)).toBe(2);
    expect(provider.sends).toHaveLength(2);
  });
});
