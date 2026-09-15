import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import type {
  ReminderCreateInput,
  ReminderListQuery,
  ReminderUpdateInput,
} from "@sei/shared";

import { DatabaseService } from "../../drizzle/database.service";
import {
  applications,
  reminders,
  users,
  type ReminderDeliveryPayload,
} from "../../drizzle/schema";
import {
  ReminderActiveLimitError,
  REMINDER_MAX_ACTIVE_PER_USER,
  REMINDER_MAX_ATTEMPTS,
  REMINDER_MAX_TOTAL_PER_USER,
  ReminderStorageLimitError,
} from "./reminders.constants";
import {
  REMINDER_PROCESSING_STALE_AFTER_MS,
  REMINDER_STALE_PROCESSING_ERROR_CODE,
} from "./reminder-recovery.policy";

export type ReminderRecord = typeof reminders.$inferSelect;

export interface ClaimedReminder extends Omit<
  ReminderRecord,
  "deliveryPayload"
> {
  deliveryPayload: ReminderDeliveryPayload;
}

export interface ReminderCreateRecordInput {
  userId: string;
  applicationId: string | null;
  kind: ReminderCreateInput["kind"];
  dueAt: Date;
}

export interface ReminderWriteValues {
  applicationId?: string | null | undefined;
  kind?: ReminderUpdateInput["kind"];
  dueAt?: Date | undefined;
}

export interface RemindersRepositoryPort {
  list(
    userId: string,
    query: ReminderListQuery,
  ): Promise<{ rows: ReminderRecord[]; total: number }>;
  findOwned(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined>;
  applicationExistsOwned(
    userId: string,
    applicationId: string,
  ): Promise<boolean>;
  create(input: ReminderCreateRecordInput): Promise<ReminderRecord>;
  updateOwnedPending(
    userId: string,
    reminderId: string,
    values: ReminderWriteValues,
  ): Promise<ReminderRecord | undefined>;
  cancelOwnedPending(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined>;
  claimDue(
    now: Date,
    limit: number,
    appBaseUrl: string,
  ): Promise<ClaimedReminder[]>;
  recoverStaleProcessing(now: Date): Promise<number>;
  markSent(
    reminderId: string,
    providerMessageId: string,
    sentAt: Date,
  ): Promise<boolean>;
  markDeliveryFailure(
    reminderId: string,
    errorCode: string,
    terminal: boolean,
  ): Promise<boolean>;
}

@Injectable()
export class RemindersRepository implements RemindersRepositoryPort {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list(
    userId: string,
    query: ReminderListQuery,
  ): Promise<{ rows: ReminderRecord[]; total: number }> {
    const filters = [eq(reminders.userId, userId)];

    if (query.status) {
      filters.push(eq(reminders.deliveryStatus, query.status));
    }

    const whereClause = and(...filters);
    const [countRow] = await this.database.db
      .select({ total: count() })
      .from(reminders)
      .where(whereClause);
    const rows = await this.database.db
      .select()
      .from(reminders)
      .where(whereClause)
      .orderBy(asc(reminders.dueAt), asc(reminders.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { rows, total: Number(countRow?.total ?? 0) };
  }

  async findOwned(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined> {
    const [reminder] = await this.database.db
      .select()
      .from(reminders)
      .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)))
      .limit(1);

    return reminder;
  }

  async applicationExistsOwned(
    userId: string,
    applicationId: string,
  ): Promise<boolean> {
    const [application] = await this.database.db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, userId),
          isNull(applications.deletedAt),
        ),
      )
      .limit(1);

    return Boolean(application);
  }

  async create(input: ReminderCreateRecordInput): Promise<ReminderRecord> {
    const reminder = await this.database.db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`,
      );

      const [totalRow] = await transaction
        .select({ total: count() })
        .from(reminders)
        .where(eq(reminders.userId, input.userId));

      if (Number(totalRow?.total ?? 0) >= REMINDER_MAX_TOTAL_PER_USER) {
        throw new ReminderStorageLimitError();
      }

      const [activeRow] = await transaction
        .select({ total: count() })
        .from(reminders)
        .where(
          and(
            eq(reminders.userId, input.userId),
            inArray(reminders.deliveryStatus, ["PENDING", "PROCESSING"]),
          ),
        );

      if (Number(activeRow?.total ?? 0) >= REMINDER_MAX_ACTIVE_PER_USER) {
        throw new ReminderActiveLimitError();
      }

      const [created] = await transaction
        .insert(reminders)
        .values(input)
        .returning();

      return created;
    });

    if (!reminder) {
      throw new Error("Reminder insert did not return a record.");
    }

    return reminder;
  }

  async updateOwnedPending(
    userId: string,
    reminderId: string,
    values: ReminderWriteValues,
  ): Promise<ReminderRecord | undefined> {
    const [reminder] = await this.database.db
      .update(reminders)
      .set(values)
      .where(
        and(
          eq(reminders.id, reminderId),
          eq(reminders.userId, userId),
          eq(reminders.deliveryStatus, "PENDING"),
          eq(reminders.attemptCount, 0),
        ),
      )
      .returning();

    return reminder;
  }

  async cancelOwnedPending(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord | undefined> {
    const [reminder] = await this.database.db
      .update(reminders)
      .set({ deliveryStatus: "CANCELLED" })
      .where(
        and(
          eq(reminders.id, reminderId),
          eq(reminders.userId, userId),
          eq(reminders.deliveryStatus, "PENDING"),
        ),
      )
      .returning();

    return reminder;
  }

  async claimDue(
    now: Date,
    limit: number,
    appBaseUrl: string,
  ): Promise<ClaimedReminder[]> {
    return this.database.db.transaction(async (transaction) => {
      const candidates = await transaction
        .select({
          id: reminders.id,
          userId: reminders.userId,
          applicationId: reminders.applicationId,
          kind: reminders.kind,
          dueAt: reminders.dueAt,
          sentAt: reminders.sentAt,
          attemptCount: reminders.attemptCount,
          deliveryStatus: reminders.deliveryStatus,
          lastErrorCode: reminders.lastErrorCode,
          providerMessageId: reminders.providerMessageId,
          deliveryPayload: reminders.deliveryPayload,
          lastAttemptStartedAt: reminders.lastAttemptStartedAt,
          createdAt: reminders.createdAt,
          userEmail: users.email,
          userDisplayName: users.displayName,
          userTimezone: users.timezone,
          applicationTitle: applications.title,
          organizationName: applications.organizationName,
        })
        .from(reminders)
        .innerJoin(users, eq(users.id, reminders.userId))
        .leftJoin(
          applications,
          and(
            eq(applications.id, reminders.applicationId),
            eq(applications.userId, reminders.userId),
          ),
        )
        .where(
          and(
            eq(reminders.deliveryStatus, "PENDING"),
            lte(reminders.dueAt, now),
            lt(reminders.attemptCount, REMINDER_MAX_ATTEMPTS),
            or(
              isNull(reminders.applicationId),
              and(isNotNull(applications.id), isNull(applications.deletedAt)),
            ),
          ),
        )
        .orderBy(asc(reminders.dueAt), asc(reminders.id))
        .limit(limit)
        .for("update", { of: reminders, skipLocked: true });

      const claimed: ClaimedReminder[] = [];

      for (const candidate of candidates) {
        const deliveryPayload =
          candidate.deliveryPayload ??
          this.createDeliveryPayload(candidate, appBaseUrl);
        const [updated] = await transaction
          .update(reminders)
          .set({
            deliveryStatus: "PROCESSING",
            attemptCount: sql`${reminders.attemptCount} + 1`,
            lastErrorCode: null,
            deliveryPayload,
            lastAttemptStartedAt: now,
          })
          .where(
            and(
              eq(reminders.id, candidate.id),
              eq(reminders.deliveryStatus, "PENDING"),
            ),
          )
          .returning();

        if (updated) {
          claimed.push({ ...updated, deliveryPayload });
        }
      }

      return claimed;
    });
  }

  async recoverStaleProcessing(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - REMINDER_PROCESSING_STALE_AFTER_MS);
    const recovered = await this.database.db
      .update(reminders)
      .set({
        deliveryStatus: "FAILED",
        lastErrorCode: REMINDER_STALE_PROCESSING_ERROR_CODE,
      })
      .where(
        and(
          eq(reminders.deliveryStatus, "PROCESSING"),
          or(
            isNull(reminders.lastAttemptStartedAt),
            lte(reminders.lastAttemptStartedAt, cutoff),
          ),
        ),
      )
      .returning({ id: reminders.id });

    return recovered.length;
  }

  private createDeliveryPayload(
    candidate: {
      id: string;
      applicationId: string | null;
      kind: ReminderRecord["kind"];
      dueAt: Date;
      userEmail: string;
      userDisplayName: string;
      userTimezone: string;
      applicationTitle: string | null;
      organizationName: string | null;
    },
    appBaseUrl: string,
  ): ReminderDeliveryPayload {
    return {
      to: candidate.userEmail,
      userDisplayName: candidate.userDisplayName,
      timezone: candidate.userTimezone,
      applicationTitle: candidate.applicationTitle,
      organizationName: candidate.organizationName,
      applicationUrl: candidate.applicationId
        ? `${appBaseUrl}/applications/${candidate.applicationId}`
        : null,
      dueAt: candidate.dueAt.toISOString(),
      reminderKind: candidate.kind,
    };
  }

  async markSent(
    reminderId: string,
    providerMessageId: string,
    sentAt: Date,
  ): Promise<boolean> {
    const updated = await this.database.db
      .update(reminders)
      .set({
        deliveryStatus: "SENT",
        sentAt,
        providerMessageId,
        lastErrorCode: null,
      })
      .where(
        and(
          eq(reminders.id, reminderId),
          eq(reminders.deliveryStatus, "PROCESSING"),
        ),
      )
      .returning({ id: reminders.id });

    return updated.length === 1;
  }

  async markDeliveryFailure(
    reminderId: string,
    errorCode: string,
    terminal: boolean,
  ): Promise<boolean> {
    const updated = await this.database.db
      .update(reminders)
      .set({
        deliveryStatus: terminal ? "FAILED" : "PENDING",
        lastErrorCode: errorCode.slice(0, 120),
      })
      .where(
        and(
          eq(reminders.id, reminderId),
          eq(reminders.deliveryStatus, "PROCESSING"),
        ),
      )
      .returning({ id: reminders.id });

    return updated.length === 1;
  }
}
