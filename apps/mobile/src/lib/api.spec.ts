import { describe, expect, it } from "vitest";

import { resolveMobileApiBaseUrl } from "./api";

describe("resolveMobileApiBaseUrl", () => {
  it("requires an explicit URL and HTTPS for release builds", () => {
    expect(() => resolveMobileApiBaseUrl(undefined, false)).toThrow(
      "required for release builds",
    );
    expect(() =>
      resolveMobileApiBaseUrl("http://api.example.com/api/v1", false),
    ).toThrow("must use HTTPS");
    expect(
      resolveMobileApiBaseUrl("https://api.example.com/api/v1/", false),
    ).toBe("https://api.example.com/api/v1");
  });

  it("allows HTTP only for loopback or private LAN development hosts", () => {
    expect(resolveMobileApiBaseUrl(undefined, true)).toBe(
      "http://localhost:3000/api/v1",
    );
    expect(
      resolveMobileApiBaseUrl("http://192.168.1.20:3000/api/v1", true),
    ).toBe("http://192.168.1.20:3000/api/v1");
    expect(() =>
      resolveMobileApiBaseUrl("http://api.example.com/api/v1", true),
    ).toThrow("must use HTTPS");
  });

  it("rejects malformed and non-HTTP protocols", () => {
    expect(() => resolveMobileApiBaseUrl("not a url", true)).toThrow(
      "valid HTTP(S) URL",
    );
    expect(() =>
      resolveMobileApiBaseUrl("ftp://example.com/api/v1", true),
    ).toThrow("must use HTTPS");
  });
});
