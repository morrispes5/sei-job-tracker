import { describe, expect, it } from "vitest";

import { assertDisposableDatabaseTarget } from "./disposable-database.guard";

const disposableUrl =
  "postgresql://sei_e2e:synthetic@127.0.0.1:55432/job_tracker_e2e";

describe("assertDisposableDatabaseTarget", () => {
  it("accepts only matching loopback URLs for the named E2E database", () => {
    expect(() =>
      assertDisposableDatabaseTarget({
        DATABASE_URL: disposableUrl,
        TEST_DATABASE_URL: disposableUrl,
      }),
    ).not.toThrow();
  });

  it("rejects mismatched runtime and test database URLs", () => {
    expect(() =>
      assertDisposableDatabaseTarget({
        DATABASE_URL: "postgresql://user:secret@db.example.com/production",
        TEST_DATABASE_URL: disposableUrl,
      }),
    ).toThrow("must identify the same disposable database");
  });

  it("rejects remote hosts and non-E2E database names", () => {
    expect(() =>
      assertDisposableDatabaseTarget({
        DATABASE_URL:
          "postgresql://sei_e2e:synthetic@db.example.com/job_tracker_e2e",
        TEST_DATABASE_URL:
          "postgresql://sei_e2e:synthetic@db.example.com/job_tracker_e2e",
      }),
    ).toThrow("loopback PostgreSQL host");
    expect(() =>
      assertDisposableDatabaseTarget({
        DATABASE_URL: "postgresql://sei_e2e:synthetic@localhost/job_tracker",
        TEST_DATABASE_URL:
          "postgresql://sei_e2e:synthetic@localhost/job_tracker",
      }),
    ).toThrow("job_tracker_e2e database");
  });
});
