import { z } from "zod";

export const applicationType = ["JOB", "INTERNSHIP", "FREELANCE"] as const;
export const applicationStatus = [
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;
export const workMode = ["REMOTE", "HYBRID", "ONSITE"] as const;
export const reminderKind = [
  "DEADLINE",
  "FOLLOW_UP",
  "INTERVIEW",
  "CUSTOM",
] as const;
export const reminderDeliveryStatus = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;

export const applicationTypeSchema = z.enum(applicationType);
export const applicationStatusSchema = z.enum(applicationStatus);
export const workModeSchema = z.enum(workMode);
export const reminderKindSchema = z.enum(reminderKind);
export const reminderDeliveryStatusSchema = z.enum(reminderDeliveryStatus);

export type ApplicationType = z.infer<typeof applicationTypeSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type WorkMode = z.infer<typeof workModeSchema>;
export type ReminderKind = z.infer<typeof reminderKindSchema>;
export type ReminderDeliveryStatus = z.infer<
  typeof reminderDeliveryStatusSchema
>;

/** REST paths without the API version prefix; clients prepend `apiPaths.v1`. */
export const apiPaths = {
  v1: "/api/v1",
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  applications: {
    root: "/applications",
    byId: (applicationId: string): string => `/applications/${applicationId}`,
    archive: (applicationId: string): string =>
      `/applications/${applicationId}/archive`,
    restore: (applicationId: string): string =>
      `/applications/${applicationId}/restore`,
    notes: (applicationId: string): string =>
      `/applications/${applicationId}/notes`,
    noteById: (applicationId: string, noteId: string): string =>
      `/applications/${applicationId}/notes/${noteId}`,
    contacts: (applicationId: string): string =>
      `/applications/${applicationId}/contacts`,
    contactById: (applicationId: string, contactId: string): string =>
      `/applications/${applicationId}/contacts/${contactId}`,
    activities: (applicationId: string): string =>
      `/applications/${applicationId}/activities`,
  },
  reminders: {
    root: "/reminders",
    byId: (reminderId: string): string => `/reminders/${reminderId}`,
  },
  dashboard: {
    summary: "/dashboard/summary",
  },
} as const;
