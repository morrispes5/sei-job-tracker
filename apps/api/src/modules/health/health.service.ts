import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import { DatabaseService } from "../../drizzle/database.service";

export interface HealthResponse {
  status: "ok";
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async check(): Promise<HealthResponse> {
    await this.database.db.execute(sql`select 1`);
    return { status: "ok" };
  }
}
