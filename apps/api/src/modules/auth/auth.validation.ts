import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128).regex(/\d/),
  phone: z.string().max(32).optional(),
  title: z.string().max(120).optional(),
  department: z.string().max(120).optional()
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false)
});
