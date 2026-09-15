const DISPOSABLE_DATABASE_NAME = "job_tracker_e2e";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function parseDatabaseUrl(name: string, value: string | undefined): URL {
  if (!value) {
    throw new Error(`${name} is required for integration tests.`);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use the PostgreSQL protocol.`);
  }

  return parsed;
}

export function assertDisposableDatabaseTarget(environment: {
  DATABASE_URL?: string | undefined;
  TEST_DATABASE_URL?: string | undefined;
}): void {
  const databaseUrl = parseDatabaseUrl(
    "DATABASE_URL",
    environment.DATABASE_URL,
  );
  const testDatabaseUrl = parseDatabaseUrl(
    "TEST_DATABASE_URL",
    environment.TEST_DATABASE_URL,
  );

  if (databaseUrl.toString() !== testDatabaseUrl.toString()) {
    throw new Error(
      "DATABASE_URL and TEST_DATABASE_URL must identify the same disposable database.",
    );
  }

  if (!LOOPBACK_HOSTS.has(databaseUrl.hostname)) {
    throw new Error("Integration tests require a loopback PostgreSQL host.");
  }

  if (databaseUrl.pathname !== `/${DISPOSABLE_DATABASE_NAME}`) {
    throw new Error(
      `Integration tests require the ${DISPOSABLE_DATABASE_NAME} database.`,
    );
  }
}
