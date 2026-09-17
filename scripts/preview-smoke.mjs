const REQUEST_TIMEOUT_MS = 10_000;

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

async function fetchChecked(url, accept) {
  const response = await fetch(url, {
    headers: { Accept: accept },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.url && new URL(response.url).protocol !== "https:") {
    throw new Error("Preview request redirected away from HTTPS.");
  }

  if (!response.ok) {
    throw new Error(`Preview request failed with HTTP ${response.status}.`);
  }

  return response;
}

async function checkApi(apiBaseUrl) {
  const healthUrl = new URL(apiBaseUrl);
  healthUrl.pathname = `${apiBaseUrl.pathname}/health`;

  const response = await fetchChecked(healthUrl, "application/json");
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Preview API health response is not JSON.");
  }

  const payload = await response.json();
  const keys =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? Object.keys(payload)
      : [];

  if (keys.length !== 1 || keys[0] !== "status" || payload.status !== "ok") {
    throw new Error('Preview API health response must be {"status":"ok"}.');
  }

  console.info("Preview API and database readiness: ok");
}

async function checkWeb(webUrl) {
  const response = await fetchChecked(webUrl, "text/html");
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Preview web response is not HTML.");
  }

  const html = await response.text();

  if (
    !html.includes('<div id="root"></div>') ||
    !html.includes("Sei — Job Tracker")
  ) {
    throw new Error("Preview web response is not the Sei application shell.");
  }

  console.info("Preview web application shell: ok");
}

async function main() {
  const apiBaseUrl = readHttpsUrl("PREVIEW_API_BASE_URL", { apiBase: true });
  const webUrl = readHttpsUrl("PREVIEW_WEB_URL");

  if (process.argv.includes("--validate-config")) {
    console.info("Preview smoke configuration: valid");
    return;
  }

  await checkApi(apiBaseUrl);
  await checkWeb(webUrl);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Preview smoke failed.",
  );
  process.exitCode = 1;
});
