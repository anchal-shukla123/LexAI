import type { RequestHandler } from "express";
import { z } from "zod";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { extractAndStoreClauses, listClauseFindings } from "./clause-extraction.service.js";

const clausesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(25)
  })
  .strict();

export const postExtractClauses: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await extractAndStoreClauses(context, params.documentId);
  sendSuccess(res, result);
};

export const getDocumentClauses: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const query = parseOrThrow(clausesQuerySchema, req.query);
  const context = await getRequestContext(req);
  const result = await listClauseFindings(context, params.documentId, {
    page: query.page ?? 1,
    limit: query.limit ?? 25
  });
  sendPaginated(res, result.clauses, result.pagination);
};
