import { describe, expect, it } from "vitest";

import {
  reminderCreateSchema,
  reminderListQuerySchema,
  reminderUpdateSchema,
} from "./reminder";

describe("reminder contracts", () => {
  it("parses create input and rejects unknown fields", () => {
    const input = {
      applicationId: null,
      kind: "CUSTOM",
      dueAt: "2026-09-15T12:00:00.000Z",
    };

    expect(reminderCreateSchema.parse(input)).toEqual(input);
    expect(
      reminderCreateSchema.safeParse({ ...input, deliveryStatus: "SENT" })
        .success,
    ).toBe(false);
  });

  it("requires at least one editable field", () => {
    expect(reminderUpdateSchema.safeParse({}).success).toBe(false);
    expect(reminderUpdateSchema.safeParse({ kind: "FOLLOW_UP" }).success).toBe(
      true,
    );
  });

  it("applies safe pagination defaults and limits", () => {
    expect(reminderListQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(reminderListQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false,
    );
  });
});
