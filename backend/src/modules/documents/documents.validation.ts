import { DocumentStatus } from "@prisma/client";
import { z } from "zod";

import { idParamSchema, paginationQuerySchema } from "../shared/validation.js";

export const documentsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(DocumentStatus).optional()
});

export const documentParamsSchema = z.object({
  documentId: idParamSchema
});

