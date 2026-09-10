import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required to run migrations. Set it from the local environment contract first.",
  );
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function run(): Promise<void> {
  try {
    await migrate(db, { migrationsFolder: resolve(__dirname, "migrations") });
    console.info("Database migrations completed.");
  } finally {
    await client.end();
  }
}

void run();
