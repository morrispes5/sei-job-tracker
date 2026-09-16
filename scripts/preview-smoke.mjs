const REQUEST_TIMEOUT_MS = 10_000;

const TARGETS = [
  {
    label: "Preview",
    apiEnv: "PREVIEW_API_BASE_URL",
    webEnv: "PREVIEW_WEB_URL",
  },
  {
    label: "Production",
    apiEnv: "PRODUCTION_API_BASE_URL",
    webEnv: "PRODUCTION_WEB_URL",
  },
];

function resolveTarget() {
  const configured = TARGETS.filter(
    (target) => process.env[target.apiEnv] || process.env[target.webEnv],
  );

  if (configured.length !== 1) {
    throw new Error(
      "Set exactly one target pair: PREVIEW_API_BASE_URL+PREVIEW_WEB_URL or PRODUCTION_API_BASE_URL+PRODUCTION_WEB_URL.",
    );
  }

  return configured[0];
}

function readHttpsUrl(name, { apiBase = false } = {}) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `${name} must not include credentials, query, or fragment.`,
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "");

  if (apiBase && !url.pathname.endsWith("/api/v1")) {
    throw new Error(`${name} must end with /api/v1.`);
  }

  return url;
}

async function fetchChecked(url, accept, label) {
  const response = await fetch(url, {
    headers: { Accept: accept },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.url && new URL(response.url).protocol !== "https:") {
    throw new Error(`${label} request redirected away from HTTPS.`);
  }

  if (!response.ok) {
    throw new Error(`${label} request failed with HTTP ${response.status}.`);
  }

  return response;
}

async function checkApi(apiBaseUrl, label) {
  const healthUrl = new URL(apiBaseUrl);
  healthUrl.pathname = `${apiBaseUrl.pathname}/health`;

  const response = await fetchChecked(healthUrl, "application/json", label);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${label} API health response is not JSON.`);
  }

  const payload = await response.json();
  const keys =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? Object.keys(payload)
      : [];

  if (keys.length !== 1 || keys[0] !== "status" || payload.status !== "ok") {
    throw new Error(`${label} API health response must be {"status":"ok"}.`);
  }

  console.info(`${label} API and database readiness: ok`);
}

async function checkWeb(webUrl, label) {
  const response = await fetchChecked(webUrl, "text/html", label);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`${label} web response is not HTML.`);
  }

  const html = await response.text();

  if (
    !html.includes('<div id="root"></div>') ||
    !html.includes("Sei — Job Tracker")
  ) {
    throw new Error(`${label} web response is not the Sei application shell.`);
  }

  console.info(`${label} web application shell: ok`);
}

async function main() {
  const target = resolveTarget();
  const apiBaseUrl = readHttpsUrl(target.apiEnv, { apiBase: true });
  const webUrl = readHttpsUrl(target.webEnv);

  if (process.argv.includes("--validate-config")) {
    console.info(`${target.label} smoke configuration: valid`);
    return;
  }

  await checkApi(apiBaseUrl, target.label);
  await checkWeb(webUrl, target.label);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Smoke check failed.");
  process.exitCode = 1;
});
