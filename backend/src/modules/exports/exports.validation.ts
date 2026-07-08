import { ExportFormat } from "@prisma/client";
import { z } from "zod";

import { idParamSchema } from "../shared/validation.js";

export const exportJobParamsSchema = z.object({
  exportJobId: idParamSchema
});

export const createReportExportSchema = z
  .object({
    format: z.nativeEnum(ExportFormat).default("PDF")
  })
  .strict();
