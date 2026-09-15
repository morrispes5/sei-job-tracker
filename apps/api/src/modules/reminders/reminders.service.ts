import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  reminderCreateSchema,
  reminderListQuerySchema,
  reminderUpdateSchema,
  resourceIdSchema,
  type ReminderDto,
  type ReminderListResponse,
  type ReminderUpdateInput,
} from "@sei/shared";

import {
  REMINDER_APPLICATION_NOT_FOUND,
  REMINDER_ALREADY_ATTEMPTED,
  REMINDER_ACTIVE_LIMIT_REACHED,
  REMINDER_DUE_IN_PAST,
  REMINDER_NOT_FOUND,
  REMINDER_NOT_PENDING,
  REMINDERS_REPOSITORY,
  ReminderActiveLimitError,
} from "./reminders.constants";
import type {
  ReminderRecord,
  RemindersRepositoryPort,
  ReminderWriteValues,
} from "./reminders.repository";

@Injectable()
export class RemindersService {
  constructor(
    @Inject(REMINDERS_REPOSITORY)
    private readonly repository: RemindersRepositoryPort,
  ) {}

  async list(userId: string, rawQuery: unknown): Promise<ReminderListResponse> {
    const query = reminderListQuerySchema.parse(rawQuery);
    const { rows, total } = await this.repository.list(userId, query);

    return {
      data: rows.map((row) => this.toDto(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        hasNextPage: query.page * query.limit < total,
      },
    };
  }

  async create(userId: string, rawInput: unknown): Promise<ReminderDto> {
    const data = reminderCreateSchema.parse(rawInput);
    const dueAt = new Date(data.dueAt);
    this.assertFutureDueAt(dueAt);
    await this.assertOwnedApplication(userId, data.applicationId);

    let reminder: ReminderRecord;

    try {
      reminder = await this.repository.create({
        userId,
        applicationId: data.applicationId ?? null,
        kind: data.kind,
        dueAt,
      });
    } catch (error: unknown) {
      if (error instanceof ReminderActiveLimitError) {
        throw new ConflictException(REMINDER_ACTIVE_LIMIT_REACHED);
      }

      throw error;
    }

    return this.toDto(reminder);
  }

  async update(
    userId: string,
    reminderId: string,
    rawInput: unknown,
  ): Promise<ReminderDto> {
    const id = resourceIdSchema.parse(reminderId);
    const data = reminderUpdateSchema.parse(rawInput);
    const current = await this.requireOwned(userId, id);

    if (current.deliveryStatus !== "PENDING") {
      throw new ConflictException(REMINDER_NOT_PENDING);
    }

    if (current.attemptCount > 0) {
      throw new ConflictException(REMINDER_ALREADY_ATTEMPTED);
    }

    if (data.dueAt !== undefined) {
      this.assertFutureDueAt(new Date(data.dueAt));
    }

    if (data.applicationId !== undefined) {
      await this.assertOwnedApplication(userId, data.applicationId);
    }

    const updated = await this.repository.updateOwnedPending(
      userId,
      id,
      this.toUpdateValues(data),
    );

    if (!updated) {
      throw new ConflictException(REMINDER_ALREADY_ATTEMPTED);
    }

    return this.toDto(updated);
  }

  async cancel(userId: string, reminderId: string): Promise<ReminderDto> {
    const id = resourceIdSchema.parse(reminderId);
    const current = await this.requireOwned(userId, id);

    if (current.deliveryStatus !== "PENDING") {
      throw new ConflictException(REMINDER_NOT_PENDING);
    }

    const cancelled = await this.repository.cancelOwnedPending(userId, id);

    if (!cancelled) {
      throw new ConflictException(REMINDER_NOT_PENDING);
    }

    return this.toDto(cancelled);
  }

  private async requireOwned(
    userId: string,
    reminderId: string,
  ): Promise<ReminderRecord> {
    const reminder = await this.repository.findOwned(userId, reminderId);

    if (!reminder) {
      throw new NotFoundException(REMINDER_NOT_FOUND);
    }

    return reminder;
  }

  private async assertOwnedApplication(
    userId: string,
    applicationId: string | null | undefined,
  ): Promise<void> {
    if (
      applicationId &&
      !(await this.repository.applicationExistsOwned(userId, applicationId))
    ) {
      throw new NotFoundException(REMINDER_APPLICATION_NOT_FOUND);
    }
  }

  private assertFutureDueAt(dueAt: Date): void {
    if (dueAt.getTime() <= Date.now()) {
      throw new BadRequestException(REMINDER_DUE_IN_PAST);
    }
  }

  private toUpdateValues(data: ReminderUpdateInput): ReminderWriteValues {
    return {
      ...(data.applicationId !== undefined
        ? { applicationId: data.applicationId }
        : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.dueAt !== undefined ? { dueAt: new Date(data.dueAt) } : {}),
    };
  }

  private toDto(record: ReminderRecord): ReminderDto {
    return {
      id: record.id,
      userId: record.userId,
      applicationId: record.applicationId,
      kind: record.kind,
      dueAt: record.dueAt.toISOString(),
      sentAt: record.sentAt?.toISOString() ?? null,
      attemptCount: record.attemptCount,
      deliveryStatus: record.deliveryStatus,
      lastErrorCode: record.lastErrorCode,
      providerMessageId: record.providerMessageId,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
