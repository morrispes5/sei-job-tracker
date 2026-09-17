import { describe, expect, it, vi } from "vitest";

import type { DatabaseService } from "../../drizzle/database.service";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("reports ok only after PostgreSQL accepts a minimal query", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const database = {
      db: { execute },
    } as unknown as DatabaseService;
    const service = new HealthService(database);

    await expect(service.check()).resolves.toEqual({ status: "ok" });
    expect(execute).toHaveBeenCalledOnce();
  });
});
