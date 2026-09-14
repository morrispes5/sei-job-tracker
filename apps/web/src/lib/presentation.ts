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

export function formatDate(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  if (!value) {
    return "Belum ditentukan";
  }

  return new Intl.DateTimeFormat("id-ID", options).format(new Date(value));
}

export function formatCurrency(
  value: string | null,
  currency: string | null,
): string | null {
  if (!value || !currency) {
    return null;
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "API tidak dapat dihubungi. Pastikan API dan database lokal sedang aktif.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error instanceof TypeError) {
      return "API tidak dapat dihubungi. Pastikan API dan database lokal sedang aktif.";
    }

    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}
