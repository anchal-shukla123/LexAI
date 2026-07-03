import { z } from "zod";

import { validationError } from "../../utils/app-error.js";

export const idParamSchema = z.string().trim().min(1, "Route id is required.");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw validationError("Invalid request.", parsed.error.issues);
  }

  return parsed.data;
}

