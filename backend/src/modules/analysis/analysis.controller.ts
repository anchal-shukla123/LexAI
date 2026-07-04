import type { RequestHandler } from "express";
import { z } from "zod";

import { sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { runMockAnalysis } from "./analysis.service.js";

const analyzeDocumentSchema = z
  .object({
    mode: z.string().trim().max(40).default("standard")
  })
  .strict();

export const analyzeDocument: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const body = parseOrThrow(analyzeDocumentSchema, req.body ?? {});
  const context = await getRequestContext(req);
  const result = await runMockAnalysis(context, {
    documentId: params.documentId,
    mode: body.mode
  });
  sendSuccess(res, result);
};
