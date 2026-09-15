import { z } from "zod";

export const clientPlatform = ["web", "mobile"] as const;
export const clientPlatformSchema = z.enum(clientPlatform);
export type ClientPlatform = z.infer<typeof clientPlatformSchema>;

export const authEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
export const authPasswordSchema = z.string().min(12).max(128);

export const authRegisterSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
  displayName: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
});

export const authLoginSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(32).max(512),
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
}

export interface AuthWebSession {
  accessToken: string;
  user: AuthUser;
}

export interface AuthMobileSession extends AuthWebSession {
  refreshToken: string;
}
