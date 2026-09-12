export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAccessSecret(): string {
  const accessSecret = process.env.JWT_ACCESS_SECRET;

  if (!accessSecret) {
    throw new Error("JWT_ACCESS_SECRET is required to start the API.");
  }

  return accessSecret;
}

export function assertAuthEnvironment(): void {
  if (!isProduction()) {
    return;
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || accessSecret.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must be at least 32 characters in production.",
    );
  }

  if (!refreshSecret || refreshSecret.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be at least 32 characters in production.",
    );
  }
}
