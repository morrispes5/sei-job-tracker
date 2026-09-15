import { describe, expect, it } from "vitest";

import {
  isReminderProcessingStale,
  REMINDER_PROCESSING_STALE_AFTER_MS,
} from "./reminder-recovery.policy";

const now = new Date("2026-09-15T12:00:00.000Z");

describe("stale reminder processing recovery policy", () => {
  it("treats a claim at the 15 minute boundary as stale", () => {
    expect(
      isReminderProcessingStale(
        new Date(now.getTime() - REMINDER_PROCESSING_STALE_AFTER_MS),
        now,
      ),
    ).toBe(true);
  });

  it("does not recover a processing attempt younger than 15 minutes", () => {
    expect(
      isReminderProcessingStale(
        new Date(now.getTime() - REMINDER_PROCESSING_STALE_AFTER_MS + 1),
        now,
      ),
    ).toBe(false);
  });

  it("fails closed for a legacy processing row without a claim timestamp", () => {
    expect(isReminderProcessingStale(null, now)).toBe(true);
  });
});
