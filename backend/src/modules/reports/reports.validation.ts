import { ReportStatus } from "@prisma/client";
import { z } from "zod";

import { idParamSchema, paginationQuerySchema } from "../shared/validation.js";

export const reportsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ReportStatus).optional()
});

export const reportParamsSchema = z.object({
  reportId: idParamSchema
});

