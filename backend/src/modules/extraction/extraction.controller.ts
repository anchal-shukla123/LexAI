import type { RequestHandler } from "express";
import { z } from "zod";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { extractDocumentText, getDocumentTextChunks, getExtractionMetadata } from "./extraction.service.js";

const chunksQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(25).default(10)
  })
  .strict();

export const postExtractDocumentText: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await extractDocumentText(context, params.documentId);
  sendSuccess(res, result);
};

export const getDocumentExtraction: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const extraction = await getExtractionMetadata(context, params.documentId);
  sendSuccess(res, extraction);
};

export const getDocumentChunks: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const query = parseOrThrow(chunksQuerySchema, req.query);
  const context = await getRequestContext(req);
  const result = await getDocumentTextChunks(context, params.documentId, {
    page: query.page ?? 1,
    limit: query.limit ?? 10
  });
  sendPaginated(res, result.chunks, result.pagination);
};
