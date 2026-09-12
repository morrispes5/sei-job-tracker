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

export const applicationActivityType = [
  "CREATED",
  "STATUS_CHANGED",
  "UPDATED",
  "ARCHIVED",
  "RESTORED",
  "DELETED",
] as const;
export const applicationActivityTypeSchema = z.enum(applicationActivityType);
export type ApplicationActivityType = z.infer<
  typeof applicationActivityTypeSchema
>;

export const applicationSort = [
  "updatedAt_desc",
  "updatedAt_asc",
  "deadlineAt_asc",
  "deadlineAt_desc",
  "createdAt_desc",
  "createdAt_asc",
] as const;
export const applicationSortSchema = z.enum(applicationSort);
export type ApplicationSort = z.infer<typeof applicationSortSchema>;

export const resourceIdSchema = z.string().uuid();

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "URL must start with http:// or https://",
  });

const optionalHttpUrlSchema = z
  .union([httpUrlSchema, z.literal("").transform(() => null), z.null()])
  .optional();

const optionalTextSchema = (max: number) =>
  z
    .union([
      z.string().trim().max(max),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional();

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");

const isoDateTimeSchema = z.string().datetime({ offset: true });

const moneySchema = z.number().finite().nonnegative().max(9_999_999_999.99);

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code")
  .transform((value) => value.toUpperCase());

function refineSalaryRange(
  value: {
    salaryMin?: number | null | undefined;
    salaryMax?: number | null | undefined;
  },
  ctx: z.RefinementCtx,
): void {
  if (
    value.salaryMin != null &&
    value.salaryMax != null &&
    value.salaryMin > value.salaryMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "salaryMin must be less than or equal to salaryMax",
      path: ["salaryMax"],
    });
  }
}

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === undefined ? undefined : value;
}

const applicationFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    organizationName: z.string().trim().min(1).max(255),
    type: applicationTypeSchema,
    status: applicationStatusSchema,
    sourceUrl: optionalHttpUrlSchema,
    sourceName: optionalTextSchema(255),
    location: optionalTextSchema(255),
    workMode: workModeSchema.nullable().optional(),
    salaryMin: moneySchema.nullable().optional(),
    salaryMax: moneySchema.nullable().optional(),
    currency: z
      .union([currencySchema, z.literal("").transform(() => null), z.null()])
      .optional(),
    description: optionalTextSchema(10_000),
    appliedAt: z
      .union([isoDateSchema, z.literal("").transform(() => null), z.null()])
      .optional(),
    deadlineAt: z
      .union([isoDateTimeSchema, z.literal("").transform(() => null), z.null()])
      .optional(),
    nextStepAt: z
      .union([isoDateTimeSchema, z.literal("").transform(() => null), z.null()])
      .optional(),
  })
  .strict();

export const applicationCreateSchema =
  applicationFieldsSchema.superRefine(refineSalaryRange);
export const applicationUpdateSchema = applicationFieldsSchema
  .partial()
  .superRefine(refineSalaryRange)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const applicationListQuerySchema = z.object({
  status: z.preprocess(emptyToUndefined, applicationStatusSchema.optional()),
  type: z.preprocess(emptyToUndefined, applicationTypeSchema.optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  archived: z.preprocess(
    (value) => {
      const next = emptyToUndefined(value);
      return next === undefined ? "false" : next;
    },
    z.enum(["true", "false"]).transform((value) => value === "true"),
  ),
  deadlineFrom: z.preprocess(emptyToUndefined, isoDateTimeSchema.optional()),
  deadlineTo: z.preprocess(emptyToUndefined, isoDateTimeSchema.optional()),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    applicationSortSchema.default("updatedAt_desc"),
  ),
});

export const applicationNoteBodySchema = z
  .object({
    body: z.string().trim().min(1).max(10_000),
  })
  .strict();

export const applicationContactFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    role: optionalTextSchema(255),
    email: z
      .union([
        z
          .string()
          .trim()
          .email()
          .max(320)
          .transform((value) => value.toLowerCase()),
        z.literal("").transform(() => null),
        z.null(),
      ])
      .optional(),
    profileUrl: optionalHttpUrlSchema,
  })
  .strict();

export const applicationContactCreateSchema = applicationContactFieldsSchema;
export const applicationContactUpdateSchema = applicationContactFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;
export type ApplicationNoteBodyInput = z.infer<
  typeof applicationNoteBodySchema
>;
export type ApplicationContactCreateInput = z.infer<
  typeof applicationContactCreateSchema
>;
export type ApplicationContactUpdateInput = z.infer<
  typeof applicationContactUpdateSchema
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
