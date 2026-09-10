import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dbCredentials: {
    // The fallback is the documented local Docker database, never a production URL.
    url:
      process.env.DATABASE_URL ??
      "postgresql://job_tracker:job_tracker_dev@localhost:5432/job_tracker",
  },
  strict: true,
  verbose: true,
});
