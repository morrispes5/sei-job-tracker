import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import type { ApplicationListQuery } from "@sei/shared";

import { APPLICATION_NOT_FOUND } from "./applications.constants";
import type {
  ActivityWriteInput,
  ApplicationActivityRecord,
  ApplicationContactRecord,
  ApplicationNoteRecord,
  ApplicationRecord,
  ApplicationsRepositoryPort,
  ApplicationWriteValues,
  CreateApplicationRecordInput,
  CreateContactInput,
  CreateNoteInput,
} from "./applications.repository";
import { ApplicationsService } from "./applications.service";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

class InMemoryApplicationsRepository implements ApplicationsRepositoryPort {
  readonly applications: ApplicationRecord[] = [];
  readonly notes: ApplicationNoteRecord[] = [];
  readonly contacts: ApplicationContactRecord[] = [];
  readonly activities: ApplicationActivityRecord[] = [];

  list(
    userId: string,
    query: ApplicationListQuery,
  ): Promise<{ rows: ApplicationRecord[]; total: number }> {
    const search = query.q?.trim().toLowerCase() ?? "";
    const filtered = this.applications.filter((application) => {
      if (application.userId !== userId || application.deletedAt) {
        return false;
      }

      if (query.archived ? !application.archivedAt : application.archivedAt) {
        return false;
      }

      if (query.status && application.status !== query.status) {
        return false;
      }

      if (query.type && application.type !== query.type) {
        return false;
      }

      if (
        search &&
        !application.title.toLowerCase().includes(search) &&
        !application.organizationName.toLowerCase().includes(search)
      ) {
        return false;
      }

      if (
        query.deadlineFrom &&
        (!application.deadlineAt ||
          application.deadlineAt.getTime() <
            new Date(query.deadlineFrom).getTime())
      ) {
        return false;
      }

      if (
        query.deadlineTo &&
        (!application.deadlineAt ||
          application.deadlineAt.getTime() >
            new Date(query.deadlineTo).getTime())
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((left, right) =>
      this.compare(left, right, query.sort),
    );
    const start = (query.page - 1) * query.limit;

    return Promise.resolve({
      rows: sorted.slice(start, start + query.limit),
      total: sorted.length,
    });
  }

  findOwned(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | undefined> {
    return Promise.resolve(
      this.applications.find(
        (application) =>
          application.id === applicationId &&
          application.userId === userId &&
          application.deletedAt === null,
      ),
    );
  }

  createWithActivity(
    input: CreateApplicationRecordInput,
    activity: ActivityWriteInput,
  ): Promise<ApplicationRecord> {
    const now = new Date();
    const application: ApplicationRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      deletedAt: null,
      ...input,
    };
    this.applications.push(application);
    this.activities.push({
      id: randomUUID(),
      applicationId: application.id,
      type: activity.type,
      metadata: activity.metadata,
      createdAt: now,
    });

    return Promise.resolve(application);
  }

  async updateOwned(
    userId: string,
    applicationId: string,
    values: ApplicationWriteValues,
    activity?: ActivityWriteInput,
  ): Promise<ApplicationRecord | undefined> {
    const application = await this.findOwned(userId, applicationId);

    if (!application) {
      return undefined;
    }

    Object.assign(application, values, { updatedAt: new Date() });

    if (activity) {
      this.activities.push({
        id: randomUUID(),
        applicationId: application.id,
        type: activity.type,
        metadata: activity.metadata,
        createdAt: new Date(),
      });
    }

    return application;
  }

  listNotes(applicationId: string): Promise<ApplicationNoteRecord[]> {
    return Promise.resolve(
      this.notes
        .filter((note) => note.applicationId === applicationId)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        ),
    );
  }

  createNote(input: CreateNoteInput): Promise<ApplicationNoteRecord> {
    const note: ApplicationNoteRecord = {
      id: randomUUID(),
      createdAt: new Date(),
      ...input,
    };
    this.notes.push(note);
    return Promise.resolve(note);
  }

  updateNote(
    applicationId: string,
    noteId: string,
    body: string,
  ): Promise<ApplicationNoteRecord | undefined> {
    const note = this.notes.find(
      (candidate) =>
        candidate.id === noteId && candidate.applicationId === applicationId,
    );

    if (note) {
      note.body = body;
    }

    return Promise.resolve(note);
  }

  deleteNote(applicationId: string, noteId: string): Promise<boolean> {
    const index = this.notes.findIndex(
      (note) => note.id === noteId && note.applicationId === applicationId,
    );

    if (index < 0) {
      return Promise.resolve(false);
    }

    this.notes.splice(index, 1);
    return Promise.resolve(true);
  }

  listContacts(applicationId: string): Promise<ApplicationContactRecord[]> {
    return Promise.resolve(
      this.contacts
        .filter((contact) => contact.applicationId === applicationId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  createContact(input: CreateContactInput): Promise<ApplicationContactRecord> {
    const contact: ApplicationContactRecord = {
      id: randomUUID(),
      ...input,
    };
    this.contacts.push(contact);
    return Promise.resolve(contact);
  }

  updateContact(
    applicationId: string,
    contactId: string,
    values: Partial<
      Pick<CreateContactInput, "name" | "role" | "email" | "profileUrl">
    >,
  ): Promise<ApplicationContactRecord | undefined> {
    const contact = this.contacts.find(
      (candidate) =>
        candidate.id === contactId && candidate.applicationId === applicationId,
    );

    if (contact) {
      Object.assign(contact, values);
    }

    return Promise.resolve(contact);
  }

  deleteContact(applicationId: string, contactId: string): Promise<boolean> {
    const index = this.contacts.findIndex(
      (contact) =>
        contact.id === contactId && contact.applicationId === applicationId,
    );

    if (index < 0) {
      return Promise.resolve(false);
    }

    this.contacts.splice(index, 1);
    return Promise.resolve(true);
  }

  listActivities(applicationId: string): Promise<ApplicationActivityRecord[]> {
    return Promise.resolve(
      this.activities
        .filter((activity) => activity.applicationId === applicationId)
        .sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        ),
    );
  }

  private compare(
    left: ApplicationRecord,
    right: ApplicationRecord,
    sort: ApplicationListQuery["sort"],
  ): number {
    const direction = sort.endsWith("_asc") ? 1 : -1;

    if (sort.startsWith("deadlineAt")) {
      return this.compareNullableDates(
        left.deadlineAt,
        right.deadlineAt,
        direction,
      );
    }

    const leftValue = sort.startsWith("createdAt")
      ? left.createdAt
      : left.updatedAt;
    const rightValue = sort.startsWith("createdAt")
      ? right.createdAt
      : right.updatedAt;

    return (leftValue.getTime() - rightValue.getTime()) * direction;
  }

  private compareNullableDates(
    left: Date | null,
    right: Date | null,
    direction: number,
  ): number {
    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return direction;
    }

    if (right === null) {
      return -direction;
    }

    return (left.getTime() - right.getTime()) * direction;
  }
}

function createService(repository = new InMemoryApplicationsRepository()) {
  return {
    repository,
    service: new ApplicationsService(repository),
  };
}

function futureDeadline(): string {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Backend Intern",
    organizationName: "Contoh Teknologi",
    type: "INTERNSHIP",
    status: "WISHLIST",
    deadlineAt: futureDeadline(),
    ...overrides,
  };
}

describe("ApplicationsService", () => {
  it("rejects create payloads that omit required fields", async () => {
    const { service } = createService();

    await expect(
      service.create(userA, {
        organizationName: "Contoh Teknologi",
        type: "INTERNSHIP",
        status: "WISHLIST",
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("hides another user's application behind a generic 404", async () => {
    const { service } = createService();
    const created = await service.create(userA, createInput());

    await expect(service.getById(userB, created.id)).rejects.toThrow(
      APPLICATION_NOT_FOUND,
    );
    await expect(
      service.update(userB, created.id, { title: "Hacked" }),
    ).rejects.toThrow(APPLICATION_NOT_FOUND);
    await expect(service.remove(userB, created.id)).rejects.toThrow(
      APPLICATION_NOT_FOUND,
    );
  });

  it("filters type, status, and search to the owner only", async () => {
    const { service } = createService();
    await service.create(
      userA,
      createInput({ title: "Backend Intern", status: "APPLIED" }),
    );
    await service.create(
      userA,
      createInput({
        title: "Frontend Contract",
        organizationName: "Other Studio",
        type: "FREELANCE",
        status: "WISHLIST",
      }),
    );
    await service.create(
      userB,
      createInput({ title: "Backend Intern", status: "APPLIED" }),
    );

    const listed = await service.list(userA, {
      status: "APPLIED",
      type: "INTERNSHIP",
      q: "backend",
    });

    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.userId).toBe(userA);
    expect(listed.data[0]?.title).toBe("Backend Intern");
    expect(listed.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      hasNextPage: false,
    });
  });

  it("writes one STATUS_CHANGED activity and fills appliedAt from wishlist", async () => {
    const { service } = createService();
    const created = await service.create(userA, createInput());

    expect(created.appliedAt).toBeNull();

    const updated = await service.update(userA, created.id, {
      status: "APPLIED",
    });
    const activities = await service.listActivities(userA, created.id);

    expect(updated.status).toBe("APPLIED");
    expect(updated.appliedAt).toBe(new Date().toISOString().slice(0, 10));
    expect(
      activities.data.filter((activity) => activity.type === "STATUS_CHANGED"),
    ).toHaveLength(1);
    expect(
      activities.data.filter((activity) => activity.type === "CREATED"),
    ).toHaveLength(1);
  });

  it("hides archived applications from the default list and restores them", async () => {
    const { service } = createService();
    const created = await service.create(userA, createInput());

    await service.archive(userA, created.id);

    const active = await service.list(userA, {});
    const archived = await service.list(userA, { archived: "true" });

    expect(active.data).toHaveLength(0);
    expect(archived.data).toHaveLength(1);
    expect(archived.data[0]?.id).toBe(created.id);

    const restored = await service.restore(userA, created.id);
    const afterRestore = await service.list(userA, {});

    expect(restored.archivedAt).toBeNull();
    expect(afterRestore.data).toHaveLength(1);
  });

  it("soft-deletes an application so later reads return 404", async () => {
    const { service } = createService();
    const created = await service.create(userA, createInput());

    await service.remove(userA, created.id);

    await expect(service.getById(userA, created.id)).rejects.toThrow(
      APPLICATION_NOT_FOUND,
    );
    expect((await service.list(userA, {})).data).toHaveLength(0);
  });

  it("keeps notes behind parent ownership", async () => {
    const { service } = createService();
    const created = await service.create(userA, createInput());
    const note = await service.createNote(userA, created.id, {
      body: "Prepare a system design walkthrough.",
    });

    await expect(service.listNotes(userB, created.id)).rejects.toThrow(
      APPLICATION_NOT_FOUND,
    );
    await expect(
      service.updateNote(userB, created.id, note.id, { body: "nope" }),
    ).rejects.toThrow(APPLICATION_NOT_FOUND);

    const listed = await service.listNotes(userA, created.id);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.body).toContain("system design");
  });

  it("rejects invalid application ids before querying", async () => {
    const { service } = createService();

    await expect(service.getById(userA, "not-a-uuid")).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});
