import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";

import type {
  ApplicationActivityType,
  ApplicationListQuery,
  ApplicationSort,
} from "@sei/shared";

import { DatabaseService } from "../../drizzle/database.service";
import {
  applicationActivities,
  applicationContacts,
  applicationNotes,
  applications,
} from "../../drizzle/schema";
export type ApplicationRecord = typeof applications.$inferSelect;
export type ApplicationNoteRecord = typeof applicationNotes.$inferSelect;
export type ApplicationContactRecord = typeof applicationContacts.$inferSelect;
export type ApplicationActivityRecord =
  typeof applicationActivities.$inferSelect;

export interface CreateApplicationRecordInput {
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
  deadlineAt: Date | null;
  nextStepAt: Date | null;
}

export type ApplicationWriteValues = Partial<{
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
  deadlineAt: Date | null;
  nextStepAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
}>;

export interface ActivityWriteInput {
  type: ApplicationActivityType;
  metadata: Record<string, unknown>;
}

export interface CreateNoteInput {
  applicationId: string;
  body: string;
}

export interface CreateContactInput {
  applicationId: string;
  name: string;
  role: string | null;
  email: string | null;
  profileUrl: string | null;
}

export interface ApplicationsRepositoryPort {
  list(
    userId: string,
    query: ApplicationListQuery,
  ): Promise<{ rows: ApplicationRecord[]; total: number }>;
  findOwned(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | undefined>;
  createWithActivity(
    input: CreateApplicationRecordInput,
    activity: ActivityWriteInput,
  ): Promise<ApplicationRecord>;
  updateOwned(
    userId: string,
    applicationId: string,
    values: ApplicationWriteValues,
    activity?: ActivityWriteInput,
  ): Promise<ApplicationRecord | undefined>;
  listNotes(applicationId: string): Promise<ApplicationNoteRecord[]>;
  createNote(input: CreateNoteInput): Promise<ApplicationNoteRecord>;
  updateNote(
    applicationId: string,
    noteId: string,
    body: string,
  ): Promise<ApplicationNoteRecord | undefined>;
  deleteNote(applicationId: string, noteId: string): Promise<boolean>;
  listContacts(applicationId: string): Promise<ApplicationContactRecord[]>;
  createContact(input: CreateContactInput): Promise<ApplicationContactRecord>;
  updateContact(
    applicationId: string,
    contactId: string,
    values: Partial<
      Pick<CreateContactInput, "name" | "role" | "email" | "profileUrl">
    >,
  ): Promise<ApplicationContactRecord | undefined>;
  deleteContact(applicationId: string, contactId: string): Promise<boolean>;
  listActivities(applicationId: string): Promise<ApplicationActivityRecord[]>;
}

function sortExpression(sort: ApplicationSort): SQL {
  switch (sort) {
    case "updatedAt_asc":
      return asc(applications.updatedAt);
    case "deadlineAt_asc":
      return asc(applications.deadlineAt);
    case "deadlineAt_desc":
      return desc(applications.deadlineAt);
    case "createdAt_asc":
      return asc(applications.createdAt);
    case "createdAt_desc":
      return desc(applications.createdAt);
    default:
      return desc(applications.updatedAt);
  }
}

function sanitizeSearch(value: string): string {
  return value.replace(/[%_\\]/g, " ").trim();
}

@Injectable()
export class ApplicationsRepository implements ApplicationsRepositoryPort {
  constructor(private readonly database: DatabaseService) {}

  async list(
    userId: string,
    query: ApplicationListQuery,
  ): Promise<{ rows: ApplicationRecord[]; total: number }> {
    const whereClause = this.listWhere(userId, query);
    const [countRow] = await this.database.db
      .select({ total: count() })
      .from(applications)
      .where(whereClause);
    const rows = await this.database.db
      .select()
      .from(applications)
      .where(whereClause)
      .orderBy(sortExpression(query.sort))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return {
      rows,
      total: Number(countRow?.total ?? 0),
    };
  }

  async findOwned(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | undefined> {
    const [application] = await this.database.db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.userId, userId),
          isNull(applications.deletedAt),
        ),
      )
      .limit(1);

    return application;
  }

  async createWithActivity(
    input: CreateApplicationRecordInput,
    activity: ActivityWriteInput,
  ): Promise<ApplicationRecord> {
    return this.database.db.transaction(async (transaction) => {
      const [application] = await transaction
        .insert(applications)
        .values(input)
        .returning();

      if (!application) {
        throw new Error("Application insert did not return a record.");
      }

      await transaction.insert(applicationActivities).values({
        applicationId: application.id,
        type: activity.type,
        metadata: activity.metadata,
      });

      return application;
    });
  }

  async updateOwned(
    userId: string,
    applicationId: string,
    values: ApplicationWriteValues,
    activity?: ActivityWriteInput,
  ): Promise<ApplicationRecord | undefined> {
    return this.database.db.transaction(async (transaction) => {
      const [application] = await transaction
        .update(applications)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.userId, userId),
            isNull(applications.deletedAt),
          ),
        )
        .returning();

      if (!application) {
        return undefined;
      }

      if (activity) {
        await transaction.insert(applicationActivities).values({
          applicationId: application.id,
          type: activity.type,
          metadata: activity.metadata,
        });
      }

      return application;
    });
  }

  async listNotes(applicationId: string): Promise<ApplicationNoteRecord[]> {
    return this.database.db
      .select()
      .from(applicationNotes)
      .where(eq(applicationNotes.applicationId, applicationId))
      .orderBy(desc(applicationNotes.createdAt));
  }

  async createNote(input: CreateNoteInput): Promise<ApplicationNoteRecord> {
    const [note] = await this.database.db
      .insert(applicationNotes)
      .values(input)
      .returning();

    if (!note) {
      throw new Error("Note insert did not return a record.");
    }

    return note;
  }

  async updateNote(
    applicationId: string,
    noteId: string,
    body: string,
  ): Promise<ApplicationNoteRecord | undefined> {
    const [note] = await this.database.db
      .update(applicationNotes)
      .set({ body })
      .where(
        and(
          eq(applicationNotes.id, noteId),
          eq(applicationNotes.applicationId, applicationId),
        ),
      )
      .returning();

    return note;
  }

  async deleteNote(applicationId: string, noteId: string): Promise<boolean> {
    const deleted = await this.database.db
      .delete(applicationNotes)
      .where(
        and(
          eq(applicationNotes.id, noteId),
          eq(applicationNotes.applicationId, applicationId),
        ),
      )
      .returning({ id: applicationNotes.id });

    return deleted.length > 0;
  }

  async listContacts(
    applicationId: string,
  ): Promise<ApplicationContactRecord[]> {
    return this.database.db
      .select()
      .from(applicationContacts)
      .where(eq(applicationContacts.applicationId, applicationId))
      .orderBy(asc(applicationContacts.name));
  }

  async createContact(
    input: CreateContactInput,
  ): Promise<ApplicationContactRecord> {
    const [contact] = await this.database.db
      .insert(applicationContacts)
      .values(input)
      .returning();

    if (!contact) {
      throw new Error("Contact insert did not return a record.");
    }

    return contact;
  }

  async updateContact(
    applicationId: string,
    contactId: string,
    values: Partial<
      Pick<CreateContactInput, "name" | "role" | "email" | "profileUrl">
    >,
  ): Promise<ApplicationContactRecord | undefined> {
    const [contact] = await this.database.db
      .update(applicationContacts)
      .set(values)
      .where(
        and(
          eq(applicationContacts.id, contactId),
          eq(applicationContacts.applicationId, applicationId),
        ),
      )
      .returning();

    return contact;
  }

  async deleteContact(
    applicationId: string,
    contactId: string,
  ): Promise<boolean> {
    const deleted = await this.database.db
      .delete(applicationContacts)
      .where(
        and(
          eq(applicationContacts.id, contactId),
          eq(applicationContacts.applicationId, applicationId),
        ),
      )
      .returning({ id: applicationContacts.id });

    return deleted.length > 0;
  }

  async listActivities(
    applicationId: string,
  ): Promise<ApplicationActivityRecord[]> {
    return this.database.db
      .select()
      .from(applicationActivities)
      .where(eq(applicationActivities.applicationId, applicationId))
      .orderBy(asc(applicationActivities.createdAt));
  }

  private listWhere(userId: string, query: ApplicationListQuery): SQL {
    const filters: SQL[] = [
      eq(applications.userId, userId),
      isNull(applications.deletedAt),
    ];

    if (query.archived) {
      filters.push(isNotNull(applications.archivedAt));
    } else {
      filters.push(isNull(applications.archivedAt));
    }

    if (query.status) {
      filters.push(eq(applications.status, query.status));
    }

    if (query.type) {
      filters.push(eq(applications.type, query.type));
    }

    const search = query.q ? sanitizeSearch(query.q) : "";

    if (search) {
      const pattern = `%${search}%`;
      const searchFilter = or(
        ilike(applications.title, pattern),
        ilike(applications.organizationName, pattern),
      );

      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (query.deadlineFrom) {
      filters.push(gte(applications.deadlineAt, new Date(query.deadlineFrom)));
    }

    if (query.deadlineTo) {
      filters.push(lte(applications.deadlineAt, new Date(query.deadlineTo)));
    }

    return and(...filters)!;
  }
}
