import type { RequestHandler } from "express";
import { z } from "zod";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { extractAndStoreClauses, getClauseReview, listClauseFindings } from "./clause-extraction.service.js";

const clausesQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(25)
  })
  .strict();

const clauseReviewQuerySchema = z
  .object({
    category: z
      .enum([
        "LIABILITY",
        "PRIVACY",
        "TERMINATION",
        "PAYMENT",
        "SECURITY",
        "AUDIT",
        "INDEMNITY",
        "NOTICES",
        "OTHER",
        "CONFIDENTIALITY",
        "AUDIT_RIGHTS",
        "NOTICE",
        "GOVERNING_LAW",
        "DISPUTE_RESOLUTION",
        "RENEWAL",
        "INTELLECTUAL_PROPERTY",
        "DATA_PROTECTION",
        "WARRANTY",
        "ASSIGNMENT",
        "FORCE_MAJEURE",
        "SERVICE_LEVEL",
        "INSURANCE",
        "NON_COMPETE",
        "MISCELLANEOUS"
      ])
      .optional(),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    extractionMethod: z.enum(["RULE_BASED", "MOCK"]).optional(),
    hasRisks: z.preprocess((value) => (value === "true" ? true : value === "false" ? false : value), z.boolean().optional()),
    search: z.string().trim().min(1).max(120).optional()
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

export const getDocumentClauseReview: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const query = parseOrThrow(clauseReviewQuerySchema, req.query);
  const context = await getRequestContext(req);
  const result = await getClauseReview(context, params.documentId, {
    category: query.category,
    riskLevel: query.riskLevel,
    extractionMethod: query.extractionMethod,
    hasRisks: typeof query.hasRisks === "boolean" ? query.hasRisks : undefined,
    search: query.search
  });
  sendSuccess(res, result);
};
