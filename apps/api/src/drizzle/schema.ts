import { desc, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  applicationStatus,
  applicationType,
  reminderDeliveryStatus,
  reminderKind,
  workMode,
  type ReminderKind,
} from "@sei/shared";

export interface ReminderDeliveryPayload {
  to: string;
  userDisplayName: string;
  timezone: string;
  applicationTitle: string | null;
  organizationName: string | null;
  applicationUrl: string | null;
  dueAt: string;
  reminderKind: ReminderKind;
}

export const applicationTypeEnum = pgEnum("application_type", applicationType);
export const applicationStatusEnum = pgEnum(
  "application_status",
  applicationStatus,
);
export const workModeEnum = pgEnum("work_mode", workMode);
export const reminderKindEnum = pgEnum("reminder_kind", reminderKind);
export const reminderDeliveryStatusEnum = pgEnum(
  "reminder_delivery_status",
  reminderDeliveryStatus,
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    deviceLabel: varchar("device_label", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("refresh_tokens_user_expires_idx").on(table.userId, table.expiresAt),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    organizationName: varchar("organization_name", { length: 255 }).notNull(),
    type: applicationTypeEnum("type").notNull(),
    status: applicationStatusEnum("status").notNull(),
    sourceUrl: varchar("source_url", { length: 2048 }),
    sourceName: varchar("source_name", { length: 255 }),
    location: varchar("location", { length: 255 }),
    workMode: workModeEnum("work_mode"),
    salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
    description: text("description"),
    appliedAt: date("applied_at"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    nextStepAt: timestamp("next_step_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("applications_user_status_updated_idx").on(
      table.userId,
      table.status,
      desc(table.updatedAt),
    ),
    index("applications_active_deadline_idx")
      .on(table.userId, table.deadlineAt)
      .where(sql`${table.archivedAt} is null and ${table.deletedAt} is null`),
  ],
);

export const applicationNotes = pgTable("application_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const applicationContacts = pgTable("application_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }),
  email: varchar("email", { length: 320 }),
  profileUrl: varchar("profile_url", { length: 2048 }),
});

export const applicationActivities = pgTable("application_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull(),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    kind: reminderKindEnum("kind").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    deliveryStatus: reminderDeliveryStatusEnum("delivery_status")
      .notNull()
      .default("PENDING"),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    deliveryPayload: jsonb("delivery_payload").$type<ReminderDeliveryPayload>(),
    lastAttemptStartedAt: timestamp("last_attempt_started_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reminders_delivery_due_idx").on(table.deliveryStatus, table.dueAt),
    index("reminders_processing_started_idx").on(
      table.deliveryStatus,
      table.lastAttemptStartedAt,
    ),
  ],
);
