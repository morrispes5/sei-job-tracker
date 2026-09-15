import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  applicationContactCreateSchema,
  applicationContactUpdateSchema,
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationNoteBodySchema,
  applicationUpdateSchema,
  resourceIdSchema,
  type ApplicationActivityType,
  type ApplicationCreateInput,
  type ApplicationUpdateInput,
} from "@sei/shared";

import {
  APPLICATION_ALREADY_ARCHIVED,
  APPLICATION_CONTACT_STORAGE_LIMIT_REACHED,
  APPLICATION_NOTE_STORAGE_LIMIT_REACHED,
  APPLICATION_NOT_ARCHIVED,
  APPLICATION_NOT_FOUND,
  APPLICATION_STORAGE_LIMIT_REACHED,
  APPLICATIONS_REPOSITORY,
  ApplicationStorageLimitError,
  CONTACT_NOT_FOUND,
  NOTE_NOT_FOUND,
} from "./applications.constants";
import type {
  ActivityWriteInput,
  ApplicationActivityRecord,
  ApplicationContactRecord,
  ApplicationNoteRecord,
  ApplicationRecord,
  ApplicationsRepositoryPort,
  ApplicationWriteValues,
  CreateApplicationRecordInput,
} from "./applications.repository";

export interface ApplicationDto {
  id: string;
  userId: string;
  title: string;
  organizationName: string;
  type: ApplicationRecord["type"];
  status: ApplicationRecord["status"];
  sourceUrl: string | null;
  sourceName: string | null;
  location: string | null;
  workMode: ApplicationRecord["workMode"];
  salaryMin: string | null;
  salaryMax: string | null;
  currency: string | null;
  description: string | null;
  appliedAt: string | null;
  deadlineAt: string | null;
  nextStepAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationNoteDto {
  id: string;
  applicationId: string;
  body: string;
  createdAt: string;
}

export interface ApplicationContactDto {
  id: string;
  applicationId: string;
  name: string;
  role: string | null;
  email: string | null;
  profileUrl: string | null;
}

export interface ApplicationActivityDto {
  id: string;
  applicationId: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ApplicationDetailDto extends ApplicationDto {
  notes: ApplicationNoteDto[];
  contacts: ApplicationContactDto[];
  activities: ApplicationActivityDto[];
}

export interface ApplicationListResponse {
  data: ApplicationDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
}

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(APPLICATIONS_REPOSITORY)
    private readonly repository: ApplicationsRepositoryPort,
  ) {}

  async list(
    userId: string,
    rawQuery: unknown,
  ): Promise<ApplicationListResponse> {
    const query = applicationListQuerySchema.parse(rawQuery);
    const { rows, total } = await this.repository.list(userId, query);

    return {
      data: rows.map((row) => this.toApplicationDto(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        hasNextPage: query.page * query.limit < total,
      },
    };
  }

  async getById(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationDetailDto> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const [notes, contacts, activities] = await Promise.all([
      this.repository.listNotes(application.id),
      this.repository.listContacts(application.id),
      this.repository.listActivities(application.id),
    ]);

    return {
      ...this.toApplicationDto(application),
      notes: notes.map((note) => this.toNoteDto(note)),
      contacts: contacts.map((contact) => this.toContactDto(contact)),
      activities: activities.map((activity) => this.toActivityDto(activity)),
    };
  }

  async create(userId: string, rawInput: unknown): Promise<ApplicationDto> {
    const data = applicationCreateSchema.parse(rawInput);
    const createdAt = new Date();
    const deadlineAt = this.parseDate(data.deadlineAt);

    this.assertDeadlineAfterCreated(deadlineAt, createdAt);

    const appliedAt = this.resolveAppliedAt(
      undefined,
      data.status,
      data.appliedAt,
    );
    let application: ApplicationRecord;

    try {
      application = await this.repository.createWithActivity(
        this.toCreateRecord(userId, data, appliedAt, deadlineAt),
        {
          type: "CREATED",
          metadata: {
            type: data.type,
            status: data.status,
            title: data.title,
          },
        },
      );
    } catch (error: unknown) {
      this.rethrowStorageLimit(error);
    }

    return this.toApplicationDto(application);
  }

  async update(
    userId: string,
    applicationId: string,
    rawInput: unknown,
  ): Promise<ApplicationDto> {
    const data = applicationUpdateSchema.parse(rawInput);
    const current = await this.requireOwnedApplication(userId, applicationId);
    const deadlineAt =
      data.deadlineAt === undefined
        ? undefined
        : this.parseDate(data.deadlineAt);

    if (deadlineAt) {
      this.assertDeadlineAfterCreated(deadlineAt, current.createdAt);
    }

    const nextStatus = data.status ?? current.status;
    const appliedAt = this.resolveAppliedAt(
      current.appliedAt,
      nextStatus,
      data.appliedAt,
    );
    const values = this.toUpdateValues(data, deadlineAt, appliedAt);
    const activity = this.buildUpdateActivity(current, data, nextStatus);
    const updated = await this.repository.updateOwned(
      userId,
      current.id,
      values,
      activity,
    );

    if (!updated) {
      throw new NotFoundException(APPLICATION_NOT_FOUND);
    }

    return this.toApplicationDto(updated);
  }

  async archive(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationDto> {
    const current = await this.requireOwnedApplication(userId, applicationId);

    if (current.archivedAt) {
      throw new ConflictException(APPLICATION_ALREADY_ARCHIVED);
    }

    const updated = await this.repository.updateOwned(
      userId,
      current.id,
      { archivedAt: new Date() },
      { type: "ARCHIVED", metadata: {} },
    );

    if (!updated) {
      throw new NotFoundException(APPLICATION_NOT_FOUND);
    }

    return this.toApplicationDto(updated);
  }

  async restore(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationDto> {
    const current = await this.requireOwnedApplication(userId, applicationId);

    if (!current.archivedAt) {
      throw new ConflictException(APPLICATION_NOT_ARCHIVED);
    }

    const updated = await this.repository.updateOwned(
      userId,
      current.id,
      { archivedAt: null },
      { type: "RESTORED", metadata: {} },
    );

    if (!updated) {
      throw new NotFoundException(APPLICATION_NOT_FOUND);
    }

    return this.toApplicationDto(updated);
  }

  async remove(
    userId: string,
    applicationId: string,
  ): Promise<{ success: true }> {
    const current = await this.requireOwnedApplication(userId, applicationId);
    const updated = await this.repository.updateOwned(
      userId,
      current.id,
      { deletedAt: new Date() },
      { type: "DELETED", metadata: {} },
    );

    if (!updated) {
      throw new NotFoundException(APPLICATION_NOT_FOUND);
    }

    return { success: true };
  }

  async listNotes(
    userId: string,
    applicationId: string,
  ): Promise<{ data: ApplicationNoteDto[] }> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const notes = await this.repository.listNotes(application.id);

    return { data: notes.map((note) => this.toNoteDto(note)) };
  }

  async createNote(
    userId: string,
    applicationId: string,
    rawInput: unknown,
  ): Promise<ApplicationNoteDto> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const data = applicationNoteBodySchema.parse(rawInput);
    let note: ApplicationNoteRecord;

    try {
      note = await this.repository.createNote({
        userId,
        applicationId: application.id,
        body: data.body,
      });
    } catch (error: unknown) {
      this.rethrowStorageLimit(error);
    }

    return this.toNoteDto(note);
  }

  async updateNote(
    userId: string,
    applicationId: string,
    noteId: string,
    rawInput: unknown,
  ): Promise<ApplicationNoteDto> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const parsedNoteId = this.parseId(noteId);
    const data = applicationNoteBodySchema.parse(rawInput);
    const note = await this.repository.updateNote(
      application.id,
      parsedNoteId,
      data.body,
    );

    if (!note) {
      throw new NotFoundException(NOTE_NOT_FOUND);
    }

    return this.toNoteDto(note);
  }

  async deleteNote(
    userId: string,
    applicationId: string,
    noteId: string,
  ): Promise<{ success: true }> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const deleted = await this.repository.deleteNote(
      application.id,
      this.parseId(noteId),
    );

    if (!deleted) {
      throw new NotFoundException(NOTE_NOT_FOUND);
    }

    return { success: true };
  }

  async listContacts(
    userId: string,
    applicationId: string,
  ): Promise<{ data: ApplicationContactDto[] }> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const contacts = await this.repository.listContacts(application.id);

    return { data: contacts.map((contact) => this.toContactDto(contact)) };
  }

  async createContact(
    userId: string,
    applicationId: string,
    rawInput: unknown,
  ): Promise<ApplicationContactDto> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const data = applicationContactCreateSchema.parse(rawInput);
    let contact: ApplicationContactRecord;

    try {
      contact = await this.repository.createContact({
        userId,
        applicationId: application.id,
        name: data.name,
        role: data.role ?? null,
        email: data.email ?? null,
        profileUrl: data.profileUrl ?? null,
      });
    } catch (error: unknown) {
      this.rethrowStorageLimit(error);
    }

    return this.toContactDto(contact);
  }

  async updateContact(
    userId: string,
    applicationId: string,
    contactId: string,
    rawInput: unknown,
  ): Promise<ApplicationContactDto> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const data = applicationContactUpdateSchema.parse(rawInput);
    const values: Partial<{
      name: string;
      role: string | null;
      email: string | null;
      profileUrl: string | null;
    }> = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.profileUrl !== undefined ? { profileUrl: data.profileUrl } : {}),
    };
    const contact = await this.repository.updateContact(
      application.id,
      this.parseId(contactId),
      values,
    );

    if (!contact) {
      throw new NotFoundException(CONTACT_NOT_FOUND);
    }

    return this.toContactDto(contact);
  }

  async deleteContact(
    userId: string,
    applicationId: string,
    contactId: string,
  ): Promise<{ success: true }> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const deleted = await this.repository.deleteContact(
      application.id,
      this.parseId(contactId),
    );

    if (!deleted) {
      throw new NotFoundException(CONTACT_NOT_FOUND);
    }

    return { success: true };
  }

  async listActivities(
    userId: string,
    applicationId: string,
  ): Promise<{ data: ApplicationActivityDto[] }> {
    const application = await this.requireOwnedApplication(
      userId,
      applicationId,
    );
    const activities = await this.repository.listActivities(application.id);

    return {
      data: activities.map((activity) => this.toActivityDto(activity)),
    };
  }

  private async requireOwnedApplication(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationRecord> {
    const application = await this.repository.findOwned(
      userId,
      this.parseId(applicationId),
    );

    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND);
    }

    return application;
  }

  private rethrowStorageLimit(error: unknown): never {
    if (!(error instanceof ApplicationStorageLimitError)) {
      throw error;
    }

    const messages = {
      application: APPLICATION_STORAGE_LIMIT_REACHED,
      note: APPLICATION_NOTE_STORAGE_LIMIT_REACHED,
      contact: APPLICATION_CONTACT_STORAGE_LIMIT_REACHED,
    } satisfies Record<ApplicationStorageLimitError["resource"], string>;

    throw new ConflictException(messages[error.resource]);
  }

  private parseId(value: string): string {
    return resourceIdSchema.parse(value);
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (value == null) {
      return null;
    }

    return new Date(value);
  }

  private assertDeadlineAfterCreated(
    deadlineAt: Date | null,
    createdAt: Date,
  ): void {
    if (deadlineAt && deadlineAt.getTime() <= createdAt.getTime()) {
      throw new BadRequestException(
        "deadlineAt must be after the created date.",
      );
    }
  }

  private resolveAppliedAt(
    currentAppliedAt: string | null | undefined,
    nextStatus: ApplicationRecord["status"],
    requestedAppliedAt: string | null | undefined,
  ): string | null | undefined {
    if (requestedAppliedAt !== undefined) {
      return requestedAppliedAt;
    }

    if (nextStatus === "APPLIED" && !currentAppliedAt) {
      return new Date().toISOString().slice(0, 10);
    }

    return undefined;
  }

  private toCreateRecord(
    userId: string,
    data: ApplicationCreateInput,
    appliedAt: string | null | undefined,
    deadlineAt: Date | null,
  ): CreateApplicationRecordInput {
    return {
      userId,
      title: data.title,
      organizationName: data.organizationName,
      type: data.type,
      status: data.status,
      sourceUrl: data.sourceUrl ?? null,
      sourceName: data.sourceName ?? null,
      location: data.location ?? null,
      workMode: data.workMode ?? null,
      salaryMin: this.toMoney(data.salaryMin),
      salaryMax: this.toMoney(data.salaryMax),
      currency: data.currency ?? null,
      description: data.description ?? null,
      appliedAt: appliedAt ?? null,
      deadlineAt,
      nextStepAt: this.parseDate(data.nextStepAt),
    };
  }

  private toUpdateValues(
    data: ApplicationUpdateInput,
    deadlineAt: Date | null | undefined,
    appliedAt: string | null | undefined,
  ): ApplicationWriteValues {
    return {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.organizationName !== undefined
        ? { organizationName: data.organizationName }
        : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.sourceUrl !== undefined ? { sourceUrl: data.sourceUrl } : {}),
      ...(data.sourceName !== undefined ? { sourceName: data.sourceName } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.workMode !== undefined ? { workMode: data.workMode } : {}),
      ...(data.salaryMin !== undefined
        ? { salaryMin: this.toMoney(data.salaryMin) }
        : {}),
      ...(data.salaryMax !== undefined
        ? { salaryMax: this.toMoney(data.salaryMax) }
        : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(appliedAt !== undefined ? { appliedAt } : {}),
      ...(deadlineAt !== undefined ? { deadlineAt } : {}),
      ...(data.nextStepAt !== undefined
        ? { nextStepAt: this.parseDate(data.nextStepAt) }
        : {}),
    };
  }

  private buildUpdateActivity(
    current: ApplicationRecord,
    data: ApplicationUpdateInput,
    nextStatus: ApplicationRecord["status"],
  ): ActivityWriteInput | undefined {
    const fields = Object.keys(data);
    const statusChanged =
      data.status !== undefined && data.status !== current.status;

    if (statusChanged) {
      return {
        type: "STATUS_CHANGED",
        metadata: {
          from: current.status,
          to: nextStatus,
          fields,
        },
      };
    }

    const trackedFields = fields.filter((field) => field !== "appliedAt");

    if (trackedFields.length === 0) {
      return undefined;
    }

    return {
      type: "UPDATED" satisfies ApplicationActivityType,
      metadata: { fields: trackedFields },
    };
  }

  private toMoney(value: number | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    return value.toFixed(2);
  }

  private toIso(value: Date | null): string | null {
    return value ? value.toISOString() : null;
  }

  private toApplicationDto(record: ApplicationRecord): ApplicationDto {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      organizationName: record.organizationName,
      type: record.type,
      status: record.status,
      sourceUrl: record.sourceUrl,
      sourceName: record.sourceName,
      location: record.location,
      workMode: record.workMode,
      salaryMin: record.salaryMin,
      salaryMax: record.salaryMax,
      currency: record.currency,
      description: record.description,
      appliedAt: record.appliedAt,
      deadlineAt: this.toIso(record.deadlineAt),
      nextStepAt: this.toIso(record.nextStepAt),
      archivedAt: this.toIso(record.archivedAt),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toNoteDto(record: ApplicationNoteRecord): ApplicationNoteDto {
    return {
      id: record.id,
      applicationId: record.applicationId,
      body: record.body,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private toContactDto(
    record: ApplicationContactRecord,
  ): ApplicationContactDto {
    return {
      id: record.id,
      applicationId: record.applicationId,
      name: record.name,
      role: record.role,
      email: record.email,
      profileUrl: record.profileUrl,
    };
  }

  private toActivityDto(
    record: ApplicationActivityRecord,
  ): ApplicationActivityDto {
    return {
      id: record.id,
      applicationId: record.applicationId,
      type: record.type,
      metadata: record.metadata,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
