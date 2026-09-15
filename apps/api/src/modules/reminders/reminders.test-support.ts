import { randomUUID } from "node:crypto";

import type { ReminderListQuery } from "@sei/shared";

import {
  ReminderActiveLimitError,
  REMINDER_MAX_ACTIVE_PER_USER,
  REMINDER_MAX_TOTAL_PER_USER,
  ReminderStorageLimitError,
  REMINDER_MAX_ATTEMPTS,
} from "./reminders.constants";
import {
  isReminderProcessingStale,
  REMINDER_STALE_PROCESSING_ERROR_CODE,
} from "./reminder-recovery.policy";
import type {
  ClaimedReminder,
  ReminderCreateRecordInput,
  ReminderRecord,
  RemindersRepositoryPort,
  ReminderWriteValues,
} from "./reminders.repository";

interface TestUser {
  email: string;
  displayName: string;
  timezone: string;
}

interface TestApplication {
  userId: string;
  title: string;
  organizationName: string;
  deleted: boolean;
}

export class InMemoryRemindersRepository implements RemindersRepositoryPort {
  readonly reminders: ReminderRecord[] = [];
  readonly users = new Map<string, TestUser>();
  readonly applications = new Map<string, TestApplication>();

  addUser(userId: string, input: Partial<TestUser> = {}): void {
    this.users.set(userId, {
      email: input.email ?? "morriz@example.com",
      displayName: input.displayName ?? "Morriz",
      timezone: input.timezone ?? "Asia/Jakarta",
    });
  }

  addApplication(
    applicationId: string,
    userId: string,
    input: Partial<Omit<TestApplication, "userId">> = {},
  ): void {
    this.applications.set(applicationId, {
      userId,
      title: input.title ?? "Backend Intern",
      organizationName: input.organizationName ?? "Contoh Teknologi",
      deleted: input.deleted ?? false,
    });
  }

  addReminder(
    input: ReminderCreateRecordInput &
      Partial<
        Pick<
          ReminderRecord,
          | "id"
          | "sentAt"
          | "attemptCount"
          | "deliveryStatus"
          | "lastErrorCode"
          | "providerMessageId"
          | "deliveryPayload"
          | "lastAttemptStartedAt"
          | "createdAt"
        >
      >,
  ): ReminderRecord {
    const reminder: ReminderRecord = {
      id: input.id ?? randomUUID(),
      userId: input.userId,
      applicationId: input.applicationId,
      kind: input.kind,
      dueAt: input.dueAt,
      sentAt: input.sentAt ?? null,
      attemptCount: input.attemptCount ?? 0,
      deliveryStatus: input.deliveryStatus ?? "PENDING",
      lastErrorCode: input.lastErrorCode ?? null,
      providerMessageId: input.providerMessageId ?? null,
      deliveryPayload: input.deliveryPayload ?? null,
      lastAttemptStartedAt: input.lastAttemptStartedAt ?? null,
      createdAt: input.createdAt ?? new Date(),
    };
    this.reminders.push(reminder);
    return reminder;
  }

  list(
    userId: string,
    query: ReminderListQuery,
  ): Promise<{ rows: ReminderRecord[]; total: number }> {
    const filtered = this.reminders
      .filter(
        (reminder) =>
          reminder.userId === userId &&
          (!query.status || reminder.deliveryStatus === query.status),
      )
      .sort(
        (left, right) =>
          left.dueAt.getTime() - right.dueAt.getTime() ||
          left.id.localeCompare(right.id),
      );
    const start = (query.page - 1) * query.limit;

    return Promise.resolve({
      rows: filtered.slice(start, start + query.limit),
      total: filtered.length,
    });
  }

  findOwned(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined> {
    return Promise.resolve(
      this.reminders.find(
        (reminder) => reminder.id === reminderId && reminder.userId === userId,
      ),
    );
  }

  applicationExistsOwned(
    userId: string,
    applicationId: string,
  ): Promise<boolean> {
    const application = this.applications.get(applicationId);
    return Promise.resolve(
      Boolean(
        application && application.userId === userId && !application.deleted,
      ),
    );
  }

  create(input: ReminderCreateRecordInput): Promise<ReminderRecord> {
    const totalCount = this.reminders.filter(
      (reminder) => reminder.userId === input.userId,
    ).length;

    if (totalCount >= REMINDER_MAX_TOTAL_PER_USER) {
      throw new ReminderStorageLimitError();
    }

    const activeCount = this.reminders.filter(
      (reminder) =>
        reminder.userId === input.userId &&
        (reminder.deliveryStatus === "PENDING" ||
          reminder.deliveryStatus === "PROCESSING"),
    ).length;

    if (activeCount >= REMINDER_MAX_ACTIVE_PER_USER) {
      throw new ReminderActiveLimitError();
    }

    return Promise.resolve(this.addReminder(input));
  }

  async updateOwnedPending(
    userId: string,
    reminderId: string,
    values: ReminderWriteValues,
  ): Promise<ReminderRecord | undefined> {
    const reminder = await this.findOwned(userId, reminderId);

    if (
      !reminder ||
      reminder.deliveryStatus !== "PENDING" ||
      reminder.attemptCount > 0
    ) {
      return undefined;
    }

    Object.assign(reminder, values);
    return reminder;
  }

  async cancelOwnedPending(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined> {
    const reminder = await this.findOwned(userId, reminderId);

    if (!reminder || reminder.deliveryStatus !== "PENDING") {
      return undefined;
    }

    reminder.deliveryStatus = "CANCELLED";
    return reminder;
  }

  claimDue(
    now: Date,
    limit: number,
    appBaseUrl: string,
  ): Promise<ClaimedReminder[]> {
    const due = this.reminders
      .filter((reminder) => {
        if (
          reminder.deliveryStatus !== "PENDING" ||
          reminder.dueAt.getTime() > now.getTime() ||
          reminder.attemptCount >= REMINDER_MAX_ATTEMPTS
        ) {
          return false;
        }

        if (!reminder.applicationId) {
          return true;
        }

        const application = this.applications.get(reminder.applicationId);
        return Boolean(
          application &&
          application.userId === reminder.userId &&
          !application.deleted,
        );
      })
      .sort(
        (left, right) =>
          left.dueAt.getTime() - right.dueAt.getTime() ||
          left.id.localeCompare(right.id),
      )
      .slice(0, limit);

    const claimed = due.flatMap((reminder) => {
      const user = this.users.get(reminder.userId);

      if (!user) {
        return [];
      }

      reminder.deliveryStatus = "PROCESSING";
      reminder.attemptCount += 1;
      reminder.lastErrorCode = null;
      reminder.lastAttemptStartedAt = now;
      const application = reminder.applicationId
        ? this.applications.get(reminder.applicationId)
        : undefined;
      const deliveryPayload = reminder.deliveryPayload ?? {
        to: user.email,
        userDisplayName: user.displayName,
        timezone: user.timezone,
        applicationTitle: application?.title ?? null,
        organizationName: application?.organizationName ?? null,
        applicationUrl: reminder.applicationId
          ? `${appBaseUrl}/applications/${reminder.applicationId}`
          : null,
        dueAt: reminder.dueAt.toISOString(),
        reminderKind: reminder.kind,
      };
      reminder.deliveryPayload = deliveryPayload;

      return [
        {
          ...reminder,
          deliveryPayload,
        },
      ];
    });

    return Promise.resolve(claimed);
  }

  recoverStaleProcessing(now: Date): Promise<number> {
    let recovered = 0;

    for (const reminder of this.reminders) {
      if (
        reminder.deliveryStatus === "PROCESSING" &&
        isReminderProcessingStale(reminder.lastAttemptStartedAt, now)
      ) {
        reminder.deliveryStatus = "FAILED";
        reminder.lastErrorCode = REMINDER_STALE_PROCESSING_ERROR_CODE;
        recovered += 1;
      }
    }

    return Promise.resolve(recovered);
  }

  markSent(
    reminderId: string,
    providerMessageId: string,
    sentAt: Date,
  ): Promise<boolean> {
    const reminder = this.reminders.find(
      (candidate) =>
        candidate.id === reminderId &&
        candidate.deliveryStatus === "PROCESSING",
    );

    if (!reminder) {
      return Promise.resolve(false);
    }

    reminder.deliveryStatus = "SENT";
    reminder.sentAt = sentAt;
    reminder.providerMessageId = providerMessageId;
    reminder.lastErrorCode = null;
    return Promise.resolve(true);
  }

  markDeliveryFailure(
    reminderId: string,
    errorCode: string,
    terminal: boolean,
  ): Promise<boolean> {
    const reminder = this.reminders.find(
      (candidate) =>
        candidate.id === reminderId &&
        candidate.deliveryStatus === "PROCESSING",
    );

    if (!reminder) {
      return Promise.resolve(false);
    }

    reminder.deliveryStatus = terminal ? "FAILED" : "PENDING";
    reminder.lastErrorCode = errorCode;
    return Promise.resolve(true);
  }
}
