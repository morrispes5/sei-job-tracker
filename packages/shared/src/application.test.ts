import { describe, expect, it } from "vitest";

import {
  apiPaths,
  applicationActivityTypeSchema,
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationStatusSchema,
  applicationTypeSchema,
  applicationUpdateSchema,
  httpUrlSchema,
  reminderDeliveryStatusSchema,
  workModeSchema,
} from "./application";
import {
  authLoginSchema,
  authRegisterSchema,
  clientPlatformSchema,
} from "./auth";

describe("shared application contracts", () => {
  it("accepts only documented application enums", () => {
    expect(applicationTypeSchema.options).toEqual([
      "JOB",
      "INTERNSHIP",
      "FREELANCE",
    ]);
    expect(applicationStatusSchema.options).toEqual([
      "WISHLIST",
      "APPLIED",
      "INTERVIEW",
      "OFFER",
      "REJECTED",
    ]);
    expect(applicationTypeSchema.safeParse("VOLUNTEER").success).toBe(false);
    expect(workModeSchema.safeParse("REMOTE").success).toBe(true);
    expect(workModeSchema.safeParse("FLEXIBLE").success).toBe(false);
  });

  it("keeps reminder delivery states closed", () => {
    expect(reminderDeliveryStatusSchema.safeParse("SENT").success).toBe(true);
    expect(reminderDeliveryStatusSchema.safeParse("RETRYING").success).toBe(
      false,
    );
  });

  it("builds paths from the REST contract", () => {
    expect(apiPaths.v1).toBe("/api/v1");
    expect(apiPaths.applications.noteById("application-1", "note-1")).toBe(
      "/applications/application-1/notes/note-1",
    );
  });

  it("normalizes auth email and keeps the platform transport closed", () => {
    expect(
      authRegisterSchema.parse({
        email: "  USER@Example.COM ",
        password: "a-secure-password",
        displayName: "Demo",
      }),
    ).toMatchObject({ email: "user@example.com", timezone: "UTC" });
    expect(
      authLoginSchema.safeParse({ email: "invalid", password: "short" })
        .success,
    ).toBe(false);
    expect(clientPlatformSchema.safeParse("mobile").success).toBe(true);
    expect(clientPlatformSchema.safeParse("desktop").success).toBe(false);
  });

  it("validates application create payloads and https URLs", () => {
    expect(
      applicationCreateSchema.safeParse({
        title: "Backend Intern",
        organizationName: "Contoh Teknologi",
        type: "INTERNSHIP",
        status: "WISHLIST",
        sourceUrl: "https://example.com/jobs/123",
        deadlineAt: "2026-10-05T16:59:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      applicationCreateSchema.safeParse({
        organizationName: "Contoh Teknologi",
        type: "INTERNSHIP",
        status: "WISHLIST",
      }).success,
    ).toBe(false);
    expect(
      httpUrlSchema.safeParse("https://example.com/jobs/123").success,
    ).toBe(true);
    expect(httpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(
      applicationActivityTypeSchema.safeParse("STATUS_CHANGED").success,
    ).toBe(true);
    expect(applicationUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("parses list query defaults and rejects oversized pages", () => {
    expect(applicationListQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
      sort: "updatedAt_desc",
      archived: false,
    });
    expect(applicationListQuerySchema.safeParse({ limit: "101" }).success).toBe(
      false,
    );
    expect(
      applicationListQuerySchema.parse({
        status: "APPLIED",
        archived: "true",
        q: "intern",
      }),
    ).toMatchObject({
      status: "APPLIED",
      archived: true,
      q: "intern",
    });
  });
});
