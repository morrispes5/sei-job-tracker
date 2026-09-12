import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly db: Database;

  private readonly client: ReturnType<typeof postgres>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required to start the API.");
    }

    this.client = postgres(connectionString, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.end();
  }
}
