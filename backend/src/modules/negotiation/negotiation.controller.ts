import type { RequestHandler } from "express";
import { z } from "zod";

import { sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { generateNegotiationEmail, getNegotiationPack } from "./negotiation.service.js";

const negotiationEmailBodySchema = z
  .object({
    tone: z.enum(["professional", "firm", "friendly", "concise"]),
    includeAcceptedRewrites: z.boolean(),
    includeRiskSummary: z.boolean(),
    customInstruction: z.string().trim().max(1000).optional()
  })
  .strict();

export const getDocumentNegotiationPack: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await getNegotiationPack(context, params.documentId);
  sendSuccess(res, result);
};

export const postDocumentNegotiationEmail: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const body = parseOrThrow(negotiationEmailBodySchema, req.body);
  const context = await getRequestContext(req);
  const result = await generateNegotiationEmail(context, params.documentId, {
    tone: body.tone,
    includeAcceptedRewrites: body.includeAcceptedRewrites,
    includeRiskSummary: body.includeRiskSummary,
    customInstruction: body.customInstruction
  });
  sendSuccess(res, result);
};
