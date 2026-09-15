import { describe, expect, it, vi } from "vitest";

import {
  REMINDER_APPLICATION_NOT_FOUND,
  REMINDER_ALREADY_ATTEMPTED,
  REMINDER_ACTIVE_LIMIT_REACHED,
  REMINDER_DUE_IN_PAST,
  REMINDER_MAX_ACTIVE_PER_USER,
  REMINDER_NOT_FOUND,
  REMINDER_NOT_PENDING,
} from "./reminders.constants";
import { RemindersService } from "./reminders.service";
import { InMemoryRemindersRepository } from "./reminders.test-support";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const applicationA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function createService() {
  const repository = new InMemoryRemindersRepository();
  repository.addUser(userA);
  repository.addUser(userB);
  repository.addApplication(applicationA, userA);
  return { repository, service: new RemindersService(repository) };
}

describe("RemindersService", () => {
  it("creates and lists only reminders owned by the authenticated user", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { service } = createService();

    const created = await service.create(userA, {
      applicationId: applicationA,
      kind: "FOLLOW_UP",
      dueAt: "2026-09-16T12:00:00.000Z",
    });
    await service.create(userB, {
      applicationId: null,
      kind: "CUSTOM",
      dueAt: "2026-09-17T12:00:00.000Z",
    });

    const listed = await service.list(userA, {});
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.id).toBe(created.id);
    expect(listed.meta).toMatchObject({ total: 1, hasNextPage: false });
    vi.useRealTimers();
  });

  it("rejects another user's application and hides another user's reminder", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { service } = createService();

    await expect(
      service.create(userB, {
        applicationId: applicationA,
        kind: "INTERVIEW",
        dueAt: "2026-09-16T12:00:00.000Z",
      }),
    ).rejects.toThrow(REMINDER_APPLICATION_NOT_FOUND);

    const reminder = await service.create(userA, {
      applicationId: applicationA,
      kind: "INTERVIEW",
      dueAt: "2026-09-16T12:00:00.000Z",
    });
    await expect(
      service.update(userB, reminder.id, { kind: "CUSTOM" }),
    ).rejects.toThrow(REMINDER_NOT_FOUND);
    await expect(service.cancel(userB, reminder.id)).rejects.toThrow(
      REMINDER_NOT_FOUND,
    );
    vi.useRealTimers();
  });

  it("rejects past due times and changes only pending reminders", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { repository, service } = createService();

    await expect(
      service.create(userA, {
        applicationId: null,
        kind: "CUSTOM",
        dueAt: "2026-09-15T11:59:59.000Z",
      }),
    ).rejects.toThrow(REMINDER_DUE_IN_PAST);

    const sent = repository.addReminder({
      userId: userA,
      applicationId: applicationA,
      kind: "DEADLINE",
      dueAt: new Date("2026-09-16T12:00:00.000Z"),
      deliveryStatus: "SENT",
      sentAt: new Date("2026-09-15T12:00:00.000Z"),
    });
    await expect(
      service.update(userA, sent.id, { kind: "FOLLOW_UP" }),
    ).rejects.toThrow(REMINDER_NOT_PENDING);
    await expect(service.cancel(userA, sent.id)).rejects.toThrow(
      REMINDER_NOT_PENDING,
    );
    vi.useRealTimers();
  });

  it("edits and cancels a pending reminder without deleting its audit row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { repository, service } = createService();
    const reminder = await service.create(userA, {
      applicationId: null,
      kind: "CUSTOM",
      dueAt: "2026-09-16T12:00:00.000Z",
    });

    const updated = await service.update(userA, reminder.id, {
      applicationId: applicationA,
      kind: "FOLLOW_UP",
      dueAt: "2026-09-18T12:00:00.000Z",
    });
    const cancelled = await service.cancel(userA, reminder.id);

    expect(updated.applicationId).toBe(applicationA);
    expect(cancelled.deliveryStatus).toBe("CANCELLED");
    expect(repository.reminders).toHaveLength(1);
    vi.useRealTimers();
  });

  it("rejects edits after a delivery attempt but still allows cancellation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { repository, service } = createService();
    const reminder = repository.addReminder({
      userId: userA,
      applicationId: applicationA,
      kind: "FOLLOW_UP",
      dueAt: new Date("2026-09-16T12:00:00.000Z"),
      attemptCount: 1,
    });

    await expect(
      service.update(userA, reminder.id, { kind: "CUSTOM" }),
    ).rejects.toThrow(REMINDER_ALREADY_ATTEMPTED);
    await expect(service.cancel(userA, reminder.id)).resolves.toMatchObject({
      deliveryStatus: "CANCELLED",
    });
    vi.useRealTimers();
  });

  it("enforces the active reminder quota per user and releases it on cancel", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    const { repository, service } = createService();

    for (let index = 0; index < REMINDER_MAX_ACTIVE_PER_USER; index += 1) {
      repository.addReminder({
        userId: userA,
        applicationId: null,
        kind: "CUSTOM",
        dueAt: new Date("2026-09-16T12:00:00.000Z"),
      });
    }

    await expect(
      service.create(userA, {
        applicationId: null,
        kind: "CUSTOM",
        dueAt: "2026-09-17T12:00:00.000Z",
      }),
    ).rejects.toThrow(REMINDER_ACTIVE_LIMIT_REACHED);

    await service.cancel(userA, repository.reminders[0]!.id);
    await expect(
      service.create(userA, {
        applicationId: null,
        kind: "CUSTOM",
        dueAt: "2026-09-17T12:00:00.000Z",
      }),
    ).resolves.toBeDefined();
    await expect(
      service.create(userB, {
        applicationId: null,
        kind: "CUSTOM",
        dueAt: "2026-09-17T12:00:00.000Z",
      }),
    ).resolves.toBeDefined();
    vi.useRealTimers();
  });
});
