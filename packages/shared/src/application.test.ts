import { describe, expect, it } from "vitest";

import {
  apiPaths,
  applicationStatusSchema,
  applicationTypeSchema,
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
});
