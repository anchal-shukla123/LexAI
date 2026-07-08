import { DocumentStatus } from "@prisma/client";
import { z } from "zod";

import { idParamSchema, paginationQuerySchema } from "../shared/validation.js";

export const documentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(DocumentStatus).optional()
});

export const documentParamsSchema = z.object({
  documentId: idParamSchema
});

export const documentDetailQuerySchema = z.object({
  view: z.enum(["detail", "summary"]).optional()
});

export const createDocumentSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(160, "Title must be 160 characters or less."),
    description: z.string().trim().max(1000, "Description must be 1000 characters or less.").optional()
  })
  .strict();

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(160, "Title must be 160 characters or less.").optional(),
    description: z.string().trim().max(1000, "Description must be 1000 characters or less.").nullable().optional()
  })
  .strict()
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: "At least one editable field is required."
  });
