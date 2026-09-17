import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

import EmbeddedPostgres from "embedded-postgres";

const DATABASE_NAME = "job_tracker_e2e";
const DATABASE_USER = "sei_e2e";
const DATABASE_PASSWORD = "sei_e2e_disposable_only";

async function findAvailablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a PostgreSQL test port."));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(port);
      });
    });
  });
}

async function runPnpm(
  args: string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  const pnpmCli = process.env.npm_execpath;

  if (!pnpmCli) {
    throw new Error("npm_execpath is required to run the integration gate.");
  }

  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(process.execPath, [pnpmCli, ...args], {
      cwd: resolve(__dirname, "../../../.."),
      env: environment,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      reject(new Error(`pnpm ${args.join(" ")} exited with code ${code}.`));
    });
  });
}

async function main(): Promise<void> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sei-postgres-e2e-"));
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const resolvedSystemTemp = resolve(tmpdir());
  const temporaryRootRelativePath = relative(
    resolvedSystemTemp,
    resolvedTemporaryRoot,
  );

  if (
    !temporaryRootRelativePath ||
    temporaryRootRelativePath.startsWith("..") ||
    isAbsolute(temporaryRootRelativePath)
  ) {
    throw new Error(
      "Refusing to use a PostgreSQL test directory outside temp.",
    );
  }

  const port = await findAvailablePort();
  const postgres = new EmbeddedPostgres({
    databaseDir: join(temporaryRoot, "cluster"),
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    port,
    persistent: false,
    onLog: () => undefined,
    onError: (error) => {
      if (process.env.DEBUG_E2E_POSTGRES === "true") {
        console.error(error);
      }
    },
  });

  let started = false;

  try {
    await postgres.initialise();
    await postgres.start();
    started = true;
    await postgres.createDatabase(DATABASE_NAME);

    const databaseUrl = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@127.0.0.1:${port}/${DATABASE_NAME}`;
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      APP_ENV: "local",
      APP_BASE_URL: "http://127.0.0.1:5173",
      DATABASE_URL: databaseUrl,
      EMAIL_PROVIDER: "development",
      JWT_ACCESS_SECRET: "sei-e2e-access-secret-at-least-32-characters",
      JWT_REFRESH_SECRET: "sei-e2e-refresh-secret-at-least-32-characters",
      NODE_ENV: "test",
      TEST_DATABASE_URL: databaseUrl,
      WEB_ORIGIN: "http://127.0.0.1:5173",
    };

    await runPnpm(["--filter", "@sei/api", "db:migrate"], environment);
    await runPnpm(
      [
        "--filter",
        "@sei/api",
        "exec",
        "vitest",
        "run",
        "--config",
        "vitest.integration.config.ts",
      ],
      environment,
    );
  } finally {
    if (started) {
      await postgres.stop();
    }

    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "E2E gate failed.");
  process.exitCode = 1;
});
