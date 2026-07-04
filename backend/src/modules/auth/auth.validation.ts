import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name must be 80 characters or less."),
    email: z.string().trim().email("Email must be valid.").toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Za-z]/, "Password must include at least one letter.")
      .regex(/\d/, "Password must include at least one number."),
    workspaceName: z
      .string()
      .trim()
      .min(2, "Workspace name must be at least 2 characters.")
      .max(80, "Workspace name must be 80 characters or less.")
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email("Email must be valid.").toLowerCase(),
    password: z.string().min(1, "Password is required.")
  })
  .strict();
