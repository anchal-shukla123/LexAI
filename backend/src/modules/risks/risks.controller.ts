import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { detectAndStoreRuleBasedRisks, getStoredRisks } from "./risk-detection.service.js";

export const detectDocumentRisks: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await detectAndStoreRuleBasedRisks(context, params.documentId);
  sendSuccess(res, result);
};

export const getDocumentRisks: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await getStoredRisks(context, params.documentId);
  sendSuccess(res, result);
};
