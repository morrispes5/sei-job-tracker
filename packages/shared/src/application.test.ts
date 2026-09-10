import { describe, expect, it } from "vitest";

import {
  apiPaths,
  applicationStatusSchema,
  applicationTypeSchema,
  reminderDeliveryStatusSchema,
  workModeSchema,
} from "./application";

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
});
