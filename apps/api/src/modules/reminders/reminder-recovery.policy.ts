export const REMINDER_PROCESSING_STALE_AFTER_MS = 15 * 60 * 1_000;
export const REMINDER_STALE_PROCESSING_ERROR_CODE =
  "PROCESSING_STALE_DELIVERY_UNKNOWN";

export function isReminderProcessingStale(
  lastAttemptStartedAt: Date | null,
  now: Date,
): boolean {
  if (!lastAttemptStartedAt) {
    return true;
  }

  return (
    lastAttemptStartedAt.getTime() <=
    now.getTime() - REMINDER_PROCESSING_STALE_AFTER_MS
  );
}
