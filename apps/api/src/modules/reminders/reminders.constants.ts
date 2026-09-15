export const REMINDERS_REPOSITORY = Symbol("REMINDERS_REPOSITORY");
export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
export const REMINDER_RUNTIME_CONFIG = Symbol("REMINDER_RUNTIME_CONFIG");

export const REMINDER_NOT_FOUND = "Reminder was not found.";
export const REMINDER_NOT_PENDING = "Only pending reminders can be changed.";
export const REMINDER_ALREADY_ATTEMPTED =
  "A reminder cannot be edited after delivery has started.";
export const REMINDER_APPLICATION_NOT_FOUND = "Application was not found.";
export const REMINDER_DUE_IN_PAST = "dueAt must be in the future.";
export const REMINDER_ACTIVE_LIMIT_REACHED =
  "The active reminder limit has been reached.";
export const REMINDER_STORAGE_LIMIT_REACHED =
  "The reminder history storage limit has been reached.";

export const REMINDER_MAX_ATTEMPTS = 3;
export const REMINDER_DEFAULT_BATCH_SIZE = 25;
export const REMINDER_MAX_ACTIVE_PER_USER = 100;
export const REMINDER_MAX_TOTAL_PER_USER = 1_000;
export const EMAIL_PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

export class ReminderActiveLimitError extends Error {
  constructor() {
    super(REMINDER_ACTIVE_LIMIT_REACHED);
    this.name = "ReminderActiveLimitError";
  }
}

export class ReminderStorageLimitError extends Error {
  constructor() {
    super(REMINDER_STORAGE_LIMIT_REACHED);
    this.name = "ReminderStorageLimitError";
  }
}
