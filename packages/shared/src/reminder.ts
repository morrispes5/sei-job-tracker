import { z } from "zod";

import {
  reminderDeliveryStatusSchema,
  reminderKindSchema,
  resourceIdSchema,
  type ReminderDeliveryStatus,
  type ReminderKind,
} from "./application";

const isoDateTimeSchema = z.string().datetime({ offset: true });

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === undefined ? undefined : value;
}

const reminderFieldsSchema = z
  .object({
    applicationId: resourceIdSchema.nullable().optional(),
    kind: reminderKindSchema,
    dueAt: isoDateTimeSchema,
  })
  .strict();

export const reminderCreateSchema = reminderFieldsSchema;
export const reminderUpdateSchema = reminderFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const reminderListQuerySchema = z.object({
  status: z.preprocess(
    emptyToUndefined,
    reminderDeliveryStatusSchema.optional(),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
});

export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
export type ReminderListQuery = z.infer<typeof reminderListQuerySchema>;

export interface ReminderDto {
  id: string;
  userId: string;
  applicationId: string | null;
  kind: ReminderKind;
  dueAt: string;
  sentAt: string | null;
  attemptCount: number;
  deliveryStatus: ReminderDeliveryStatus;
  lastErrorCode: string | null;
  providerMessageId: string | null;
  createdAt: string;
}

export interface ReminderListResponse {
  data: ReminderDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
}
