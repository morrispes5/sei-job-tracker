import { describe, expect, it } from "vitest";

import { ApiError, listPath } from "./api";
import { errorMessage, formatDate, statusLabel } from "./presentation";

describe("mobile helpers", () => {
  it("serializes application filters", () => {
    expect(listPath({ status: "APPLIED", page: 2 })).toBe(
      "/applications?status=APPLIED&page=2",
    );
  });

  it("uses readable status and date placeholders", () => {
    expect(statusLabel("INTERVIEW")).toBe("Interview");
    expect(formatDate(null)).toBe("Belum ditentukan");
    expect(formatDate("2026-09-15")).toContain("15");
  });

  it("keeps API error messages", () => {
    const error = new ApiError(401, {
      error: { message: "Session berakhir." },
    });
    expect(errorMessage(error)).toBe("Session berakhir.");
  });
});
