import type { ApplicationActivityType, ApplicationStatus } from "@sei/shared";

import { ApiError } from "./api";

const statusLabels: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const activityLabels: Record<ApplicationActivityType, string> = {
  CREATED: "Application dibuat",
  STATUS_CHANGED: "Status diperbarui",
  UPDATED: "Detail diperbarui",
  ARCHIVED: "Application diarsipkan",
  RESTORED: "Application dipulihkan",
  DELETED: "Application dihapus",
};

export function statusLabel(status: ApplicationStatus): string {
  return statusLabels[status];
}

export function activityLabel(type: ApplicationActivityType): string {
  return activityLabels[type];
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Belum ditentukan";
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseLocalDate(value)
    : new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "Belum ditentukan";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}
