export const APP_ENVIRONMENTS = ["local", "preview", "production"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export function readAppEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AppEnvironment {
  const configured = environment.APP_ENV;

  if (configured === undefined) {
    return environment.NODE_ENV === "production" ? "production" : "local";
  }

  if (APP_ENVIRONMENTS.some((candidate) => candidate === configured)) {
    return configured as AppEnvironment;
  }

  throw new Error("APP_ENV must be local, preview, or production.");
}
