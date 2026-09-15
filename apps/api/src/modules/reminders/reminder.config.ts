import { REMINDER_DEFAULT_BATCH_SIZE } from "./reminders.constants";

export interface ReminderRuntimeConfig {
  appBaseUrl: string;
  batchSize: number;
}

function readHttpUrl(value: string, name: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https.`);
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS in production.`);
  }

  return url.toString().replace(/\/$/, "");
}

export function readReminderRuntimeConfig(): ReminderRuntimeConfig {
  const rawBatchSize = process.env.REMINDER_BATCH_SIZE;
  const batchSize = rawBatchSize
    ? Number.parseInt(rawBatchSize, 10)
    : REMINDER_DEFAULT_BATCH_SIZE;

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("REMINDER_BATCH_SIZE must be an integer from 1 to 100.");
  }

  return {
    appBaseUrl: readHttpUrl(
      process.env.APP_BASE_URL ?? "http://localhost:5173",
      "APP_BASE_URL",
    ),
    batchSize,
  };
}
