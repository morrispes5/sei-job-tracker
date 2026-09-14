import { describe, expect, it } from "vitest";

import { ApiError } from "./api";
import { errorMessage, formatDate, statusLabel } from "./presentation";

describe("web presentation helpers", () => {
  it("uses the product labels for application statuses", () => {
    expect(statusLabel("INTERVIEW")).toBe("Interview");
    expect(statusLabel("WISHLIST")).toBe("Wishlist");
  });

  it("uses a meaningful placeholder when a date is absent", () => {
    expect(formatDate(null)).toBe("Belum ditentukan");
  });

  it("keeps API errors actionable", () => {
    expect(
      errorMessage(new ApiError(401, { error: { message: "Sesi habis" } })),
    ).toBe("Sesi habis");
    expect(errorMessage(new TypeError("Failed to fetch"))).toContain(
      "API tidak dapat dihubungi",
    );
  });
});
