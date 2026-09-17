import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "../app.bootstrap";
import { DatabaseService } from "../drizzle/database.service";
import { reminders } from "../drizzle/schema";
import {
  APPLICATION_CONTACT_MAX_PER_USER,
  APPLICATION_MAX_PER_USER,
  APPLICATION_NOTE_MAX_PER_USER,
} from "../modules/applications/applications.constants";
import type {
  EmailProvider,
  ReminderEmailInput,
} from "../modules/reminders/email.provider";
import {
  REMINDER_PROCESSING_STALE_AFTER_MS,
  REMINDER_STALE_PROCESSING_ERROR_CODE,
} from "../modules/reminders/reminder-recovery.policy";
import { ReminderSchedulerService } from "../modules/reminders/reminder-scheduler.service";
import { RemindersRepository } from "../modules/reminders/reminders.repository";
import { REMINDER_MAX_TOTAL_PER_USER } from "../modules/reminders/reminders.constants";
import { assertDisposableDatabaseTarget } from "./disposable-database.guard";

interface ApiResponse {
  status: number;
  body: unknown;
  headers: Headers;
}

interface RequestOptions {
  body?: unknown;
  method?: string;
  requestId?: string;
  token?: string;
}

interface SessionFixture {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

class FakeEmailProvider implements EmailProvider {
  readonly attempts: ReminderEmailInput[] = [];
  readonly deliveries = new Map<string, string>();
  failuresRemaining = 0;

  sendReminder(
    input: ReminderEmailInput,
  ): Promise<{ providerMessageId: string }> {
    this.attempts.push(input);

    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error("FAKE_PROVIDER_FAILURE");
    }

    const existing = this.deliveries.get(input.idempotencyKey);

    if (existing) {
      return Promise.resolve({ providerMessageId: existing });
    }

    const providerMessageId = `fake:${input.idempotencyKey}`;
    this.deliveries.set(input.idempotencyKey, providerMessageId);
    return Promise.resolve({ providerMessageId });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object response body.");
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected an array response field.");
  }

  return value;
}

describe.sequential("real PostgreSQL API and reminder integration", () => {
  let app: INestApplication;
  let baseUrl: string;
  let database: DatabaseService;
  let reminderRepository: RemindersRepository;
  let userA: SessionFixture;
  let userB: SessionFixture;
  let activeApplicationId: string;

  async function request(path: string, options: RequestOptions = {}) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Client-Platform": "mobile",
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    if (options.requestId) {
      headers["X-Request-Id"] = options.requestId;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    });
    const responseText = await response.text();

    return {
      status: response.status,
      body: responseText ? (JSON.parse(responseText) as unknown) : null,
      headers: response.headers,
    } satisfies ApiResponse;
  }

  async function register(label: string): Promise<SessionFixture> {
    const emailLabel = label.toLowerCase().replace(/\s+/g, "-");
    const response = await request("/api/v1/auth/register", {
      method: "POST",
      body: {
        email: `${emailLabel}-${randomUUID()}@example.com`,
        password: "correct-horse-battery-staple",
        displayName: label,
        timezone: "Asia/Jakarta",
      },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    const body = asRecord(response.body);
    const user = asRecord(body.user);

    return {
      accessToken: String(body.accessToken),
      refreshToken: String(body.refreshToken),
      userId: String(user.id),
    };
  }

  async function createApplication(token: string, suffix: string) {
    const response = await request("/api/v1/applications", {
      method: "POST",
      token,
      body: {
        title: `Backend Engineer ${suffix}`,
        organizationName: `Sei Test ${suffix}`,
        type: "JOB",
        status: "WISHLIST",
        sourceUrl: "https://example.com/jobs/backend",
        deadlineAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    expect(response.status).toBe(201);
    return asRecord(response.body);
  }

  async function createReminder(
    token: string,
    applicationId: string | null,
    kind: "DEADLINE" | "FOLLOW_UP" | "INTERVIEW" | "CUSTOM",
  ) {
    const response = await request("/api/v1/reminders", {
      method: "POST",
      token,
      body: {
        applicationId,
        kind,
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    expect(response.status).toBe(201);
    return asRecord(response.body);
  }

  beforeAll(async () => {
    assertDisposableDatabaseTarget(process.env);

    app = await createApiApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as AddressInfo | null;

    if (!address) {
      throw new Error("Nest test server did not expose a listening address.");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
    database = app.get(DatabaseService);
    reminderRepository = app.get(RemindersRepository);

    const schedulerRegistry = app.get(SchedulerRegistry);
    if (schedulerRegistry.doesExist("cron", "sei-reminder-delivery")) {
      schedulerRegistry.deleteCronJob("sei-reminder-delivery");
    }

    await database.db.execute(sql`
      truncate table
        application_activities,
        application_contacts,
        application_notes,
        refresh_tokens,
        reminders,
        applications,
        users
      restart identity cascade
    `);
  });

  afterAll(async () => {
    if (database) {
      await database.db.execute(sql`
        truncate table
          application_activities,
          application_contacts,
          application_notes,
          refresh_tokens,
          reminders,
          applications,
          users
        restart identity cascade
      `);
    }

    if (app) {
      await app.close();
    }
  });

  it("proves auth validation, generic login failure, rotation, and logout", async () => {
    const health = await request("/api/v1/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });

    const invalid = await request("/api/v1/auth/register", {
      method: "POST",
      requestId: "m7-validation-check",
      body: { email: "not-an-email", password: "short" },
    });
    expect(invalid.status, JSON.stringify(invalid.body)).toBe(400);
    expect(asRecord(invalid.body)).toMatchObject({
      requestId: "m7-validation-check",
      error: { code: "VALIDATION_ERROR", message: "Input tidak valid." },
    });
    expect(JSON.stringify(invalid.body)).not.toContain("stack");

    userA = await register("User A");
    userB = await register("User B");

    const formLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://attacker.example",
      },
      body: new URLSearchParams({
        email: "attacker@example.com",
        password: "correct-horse-battery-staple",
      }),
    });
    expect(formLogin.status).toBe(400);
    expect(formLogin.headers.get("set-cookie")).toBeNull();

    const userAProfile = await request("/api/v1/auth/me", {
      token: userA.accessToken,
    });
    expect(userAProfile.status).toBe(200);
    const registeredEmail = String(
      asRecord(asRecord(userAProfile.body).user).email,
    );

    const knownFailure = await request("/api/v1/auth/login", {
      method: "POST",
      body: { email: registeredEmail, password: "wrong-password-value" },
    });
    const unknownFailure = await request("/api/v1/auth/login", {
      method: "POST",
      body: {
        email: `missing-${randomUUID()}@example.com`,
        password: "wrong-password-value",
      },
    });
    expect(knownFailure.status).toBe(401);
    expect(unknownFailure.status).toBe(401);
    expect(knownFailure.body).toEqual(unknownFailure.body);

    const previousRefreshToken = userA.refreshToken;
    const rotated = await request("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: previousRefreshToken },
    });
    expect(rotated.status).toBe(201);
    const rotatedBody = asRecord(rotated.body);
    expect(String(rotatedBody.refreshToken)).not.toBe(userA.refreshToken);
    userA = {
      ...userA,
      accessToken: String(rotatedBody.accessToken),
      refreshToken: String(rotatedBody.refreshToken),
    };

    const reused = await request("/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: previousRefreshToken },
    });
    expect(reused.status).toBe(401);

    const disposableLogin = await request("/api/v1/auth/login", {
      method: "POST",
      body: {
        email: registeredEmail,
        password: "correct-horse-battery-staple",
      },
    });
    expect(disposableLogin.status).toBe(201);
    const disposableRefresh = String(
      asRecord(disposableLogin.body).refreshToken,
    );
    expect(
      (
        await request("/api/v1/auth/logout", {
          method: "POST",
          body: { refreshToken: disposableRefresh },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await request("/api/v1/auth/refresh", {
          method: "POST",
          body: { refreshToken: disposableRefresh },
        })
      ).status,
    ).toBe(401);
  });

  it("proves application CRUD, ownership, activity, archive, restore, and soft delete", async () => {
    const invalid = await request("/api/v1/applications", {
      method: "POST",
      token: userA.accessToken,
      body: { title: "", organizationName: "", type: "JOB" },
    });
    expect(invalid.status).toBe(400);

    const created = await createApplication(userA.accessToken, "Owned");
    const applicationId = String(created.id);

    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const denied = await request(`/api/v1/applications/${applicationId}`, {
        method,
        token: userB.accessToken,
        ...(method === "PATCH" ? { body: { title: "Stolen" } } : {}),
      });
      expect(denied.status).toBe(404);
    }

    const updated = await request(`/api/v1/applications/${applicationId}`, {
      method: "PATCH",
      token: userA.accessToken,
      body: { status: "APPLIED", title: "Backend Engineer Updated" },
    });
    expect(updated.status).toBe(200);
    expect(asRecord(updated.body)).toMatchObject({
      status: "APPLIED",
      title: "Backend Engineer Updated",
    });
    expect(asRecord(updated.body).appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const activities = await request(
      `/api/v1/applications/${applicationId}/activities`,
      { token: userA.accessToken },
    );
    expect(activities.status).toBe(200);
    const statusChanges = asArray(asRecord(activities.body).data).filter(
      (activity) => asRecord(activity).type === "STATUS_CHANGED",
    );
    expect(statusChanges).toHaveLength(1);

    expect(
      (
        await request(`/api/v1/applications/${applicationId}/archive`, {
          method: "POST",
          token: userA.accessToken,
        })
      ).status,
    ).toBe(200);
    const activeList = await request("/api/v1/applications", {
      token: userA.accessToken,
    });
    expect(
      asArray(asRecord(activeList.body).data).some(
        (item) => asRecord(item).id === applicationId,
      ),
    ).toBe(false);
    const archivedList = await request("/api/v1/applications?archived=true", {
      token: userA.accessToken,
    });
    expect(
      asArray(asRecord(archivedList.body).data).some(
        (item) => asRecord(item).id === applicationId,
      ),
    ).toBe(true);

    expect(
      (
        await request(`/api/v1/applications/${applicationId}/restore`, {
          method: "POST",
          token: userA.accessToken,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`/api/v1/applications/${applicationId}`, {
          method: "DELETE",
          token: userA.accessToken,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(`/api/v1/applications/${applicationId}`, {
          token: userA.accessToken,
        })
      ).status,
    ).toBe(404);

    activeApplicationId = String(
      (await createApplication(userA.accessToken, "Reminder")).id,
    );
  });

  it("proves reminder CRUD and cross-user ownership", async () => {
    const created = await createReminder(
      userA.accessToken,
      activeApplicationId,
      "FOLLOW_UP",
    );
    const reminderId = String(created.id);

    const list = await request("/api/v1/reminders?status=PENDING", {
      token: userA.accessToken,
    });
    expect(list.status).toBe(200);
    expect(
      asArray(asRecord(list.body).data).some(
        (item) => asRecord(item).id === reminderId,
      ),
    ).toBe(true);

    expect(
      (
        await request(`/api/v1/reminders/${reminderId}`, {
          method: "PATCH",
          token: userB.accessToken,
          body: { kind: "CUSTOM" },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/api/v1/reminders/${reminderId}`, {
          method: "DELETE",
          token: userB.accessToken,
        })
      ).status,
    ).toBe(404);

    const updated = await request(`/api/v1/reminders/${reminderId}`, {
      method: "PATCH",
      token: userA.accessToken,
      body: { kind: "INTERVIEW" },
    });
    expect(updated.status).toBe(200);
    expect(asRecord(updated.body).kind).toBe("INTERVIEW");

    const cancelled = await request(`/api/v1/reminders/${reminderId}`, {
      method: "DELETE",
      token: userA.accessToken,
    });
    expect(cancelled.status).toBe(200);
    expect(asRecord(cancelled.body).deliveryStatus).toBe("CANCELLED");
  });

  it("proves concurrent claim, retry, no duplicate delivery, and stale recovery", async () => {
    const now = new Date();
    const concurrent = await createReminder(
      userA.accessToken,
      activeApplicationId,
      "DEADLINE",
    );
    const concurrentId = String(concurrent.id);
    await database.db
      .update(reminders)
      .set({ dueAt: new Date(now.getTime() - 1_000) })
      .where(eq(reminders.id, concurrentId));

    const concurrentProvider = new FakeEmailProvider();
    const schedulerA = new ReminderSchedulerService(
      reminderRepository,
      concurrentProvider,
      { appBaseUrl: "http://127.0.0.1:5173", batchSize: 25 },
    );
    const schedulerB = new ReminderSchedulerService(
      reminderRepository,
      concurrentProvider,
      { appBaseUrl: "http://127.0.0.1:5173", batchSize: 25 },
    );
    const claimCounts = await Promise.all([
      schedulerA.processDue(now),
      schedulerB.processDue(now),
    ]);
    expect(claimCounts.reduce((total, count) => total + count, 0)).toBe(1);
    expect(concurrentProvider.attempts).toHaveLength(1);
    expect(concurrentProvider.deliveries.size).toBe(1);
    expect(await schedulerA.processDue(new Date(now.getTime() + 300_000))).toBe(
      0,
    );
    expect(concurrentProvider.attempts).toHaveLength(1);

    const retry = await createReminder(
      userA.accessToken,
      activeApplicationId,
      "FOLLOW_UP",
    );
    const retryId = String(retry.id);
    await database.db
      .update(reminders)
      .set({ dueAt: new Date(now.getTime() - 1_000) })
      .where(eq(reminders.id, retryId));
    const retryProvider = new FakeEmailProvider();
    retryProvider.failuresRemaining = 2;
    const retryScheduler = new ReminderSchedulerService(
      reminderRepository,
      retryProvider,
      { appBaseUrl: "http://127.0.0.1:5173", batchSize: 25 },
    );
    await retryScheduler.processDue(now);
    await retryScheduler.processDue(new Date(now.getTime() + 300_000));
    await retryScheduler.processDue(new Date(now.getTime() + 600_000));
    const [retried] = await database.db
      .select()
      .from(reminders)
      .where(eq(reminders.id, retryId));
    expect(retried?.deliveryStatus).toBe("SENT");
    expect(retried?.attemptCount).toBe(3);
    expect(retryProvider.attempts).toHaveLength(3);
    expect(
      new Set(retryProvider.attempts.map((item) => item.idempotencyKey)).size,
    ).toBe(1);
    expect(retryProvider.deliveries.size).toBe(1);

    const staleId = randomUUID();
    await database.db.insert(reminders).values({
      id: staleId,
      userId: userA.userId,
      applicationId: activeApplicationId,
      kind: "INTERVIEW",
      dueAt: new Date(now.getTime() - 1_000),
      deliveryStatus: "PROCESSING",
      attemptCount: 1,
      lastAttemptStartedAt: new Date(
        now.getTime() - REMINDER_PROCESSING_STALE_AFTER_MS,
      ),
    });
    const staleProvider = new FakeEmailProvider();
    const staleScheduler = new ReminderSchedulerService(
      reminderRepository,
      staleProvider,
      { appBaseUrl: "http://127.0.0.1:5173", batchSize: 25 },
    );
    expect(await staleScheduler.processDue(now)).toBe(0);
    const [stale] = await database.db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.id, staleId), eq(reminders.userId, userA.userId)),
      );
    expect(stale?.deliveryStatus).toBe("FAILED");
    expect(stale?.lastErrorCode).toBe(REMINDER_STALE_PROCESSING_ERROR_CODE);
    expect(staleProvider.attempts).toHaveLength(0);
  });

  it("enforces durable tenant storage quotas with real PostgreSQL", async () => {
    const quotaUser = await register("Quota User");
    const quotaApplication = await createApplication(
      quotaUser.accessToken,
      "Quota",
    );
    const quotaApplicationId = String(quotaApplication.id);

    await database.db.execute(sql`
      insert into applications (user_id, title, organization_name, type, status)
      select
        ${quotaUser.userId}::uuid,
        'Quota application',
        'Quota organization',
        'JOB'::application_type,
        'WISHLIST'::application_status
      from generate_series(1, ${APPLICATION_MAX_PER_USER - 1})
    `);
    expect(
      (
        await request("/api/v1/applications", {
          method: "POST",
          token: quotaUser.accessToken,
          body: {
            title: "Over quota",
            organizationName: "Quota",
            type: "JOB",
            status: "WISHLIST",
          },
        })
      ).status,
    ).toBe(409);

    await database.db.execute(sql`
      insert into application_notes (application_id, body)
      select ${quotaApplicationId}::uuid, 'bounded note'
      from generate_series(1, ${APPLICATION_NOTE_MAX_PER_USER})
    `);
    expect(
      (
        await request(`/api/v1/applications/${quotaApplicationId}/notes`, {
          method: "POST",
          token: quotaUser.accessToken,
          body: { body: "Over quota" },
        })
      ).status,
    ).toBe(409);

    await database.db.execute(sql`
      insert into application_contacts (application_id, name)
      select ${quotaApplicationId}::uuid, 'Bounded contact'
      from generate_series(1, ${APPLICATION_CONTACT_MAX_PER_USER})
    `);
    expect(
      (
        await request(`/api/v1/applications/${quotaApplicationId}/contacts`, {
          method: "POST",
          token: quotaUser.accessToken,
          body: { name: "Over quota" },
        })
      ).status,
    ).toBe(409);

    await database.db.execute(sql`
      insert into reminders (user_id, kind, due_at, delivery_status)
      select
        ${quotaUser.userId}::uuid,
        'CUSTOM'::reminder_kind,
        now() + interval '1 day',
        'CANCELLED'::reminder_delivery_status
      from generate_series(1, ${REMINDER_MAX_TOTAL_PER_USER})
    `);
    expect(
      (
        await request("/api/v1/reminders", {
          method: "POST",
          token: quotaUser.accessToken,
          body: {
            applicationId: quotaApplicationId,
            kind: "CUSTOM",
            dueAt: new Date(Date.now() + 86_400_000).toISOString(),
          },
        })
      ).status,
    ).toBe(409);
  });
});
