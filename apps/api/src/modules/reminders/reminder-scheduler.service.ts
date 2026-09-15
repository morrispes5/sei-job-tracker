import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import type { EmailProvider } from "./email.provider";
import { buildReminderSubject, emailErrorCode } from "./email.provider";
import type { ReminderRuntimeConfig } from "./reminder.config";
import {
  EMAIL_PROVIDER,
  REMINDER_MAX_ATTEMPTS,
  REMINDER_RUNTIME_CONFIG,
  REMINDERS_REPOSITORY,
} from "./reminders.constants";
import type {
  ClaimedReminder,
  RemindersRepositoryPort,
} from "./reminders.repository";

@Injectable()
export class ReminderSchedulerService {
  constructor(
    @Inject(REMINDERS_REPOSITORY)
    private readonly repository: RemindersRepositoryPort,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    @Inject(REMINDER_RUNTIME_CONFIG)
    private readonly config: ReminderRuntimeConfig,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "sei-reminder-delivery",
    waitForCompletion: true,
  })
  async handleReminderTick(): Promise<void> {
    await this.processDue(new Date());
  }

  async processDue(now: Date): Promise<number> {
    await this.repository.recoverStaleProcessing(now);

    const reminders = await this.repository.claimDue(
      now,
      this.config.batchSize,
      this.config.appBaseUrl,
    );

    for (const reminder of reminders) {
      await this.deliver(reminder, now);
    }

    return reminders.length;
  }

  private async deliver(
    reminder: ClaimedReminder,
    sentAt: Date,
  ): Promise<void> {
    const payload = reminder.deliveryPayload;

    let result: { providerMessageId: string };

    try {
      result = await this.emailProvider.sendReminder({
        idempotencyKey: `reminder:${reminder.id}`,
        to: payload.to,
        subject: buildReminderSubject(
          payload.applicationTitle,
          payload.reminderKind,
        ),
        userDisplayName: payload.userDisplayName,
        ...(payload.applicationTitle
          ? { applicationTitle: payload.applicationTitle }
          : {}),
        ...(payload.organizationName
          ? { organizationName: payload.organizationName }
          : {}),
        dueAt: new Date(payload.dueAt),
        timezone: payload.timezone,
        ...(payload.applicationUrl
          ? { applicationUrl: payload.applicationUrl }
          : {}),
        reminderKind: payload.reminderKind,
      });
    } catch (error: unknown) {
      await this.repository.markDeliveryFailure(
        reminder.id,
        emailErrorCode(error),
        reminder.attemptCount >= REMINDER_MAX_ATTEMPTS,
      );
      return;
    }

    const marked = await this.repository.markSent(
      reminder.id,
      result.providerMessageId,
      sentAt,
    );

    if (!marked) {
      throw new Error("Claimed reminder could not be marked as sent.");
    }
  }
}
