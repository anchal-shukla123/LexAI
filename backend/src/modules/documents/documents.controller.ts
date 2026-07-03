import type { RequestHandler } from "express";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { parseOrThrow } from "../shared/validation.js";
import { getDocumentDetail, listDocuments } from "./documents.service.js";
import { documentParamsSchema, documentsQuerySchema } from "./documents.validation.js";

export const getDocuments: RequestHandler = async (req, res) => {
  const query = parseOrThrow(documentsQuerySchema, req.query);
  const result = await listDocuments({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    status: query.status
  });
  sendPaginated(res, result.documents, result.pagination);
};

export const getDocument: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const document = await getDocumentDetail(params.documentId);
  sendSuccess(res, document);
};
