import type { RequestHandler } from "express";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { createDocument, getDocumentDetail, listDocuments, softDeleteDocument, updateDocument } from "./documents.service.js";
import {
  createDocumentSchema,
  documentParamsSchema,
  documentsQuerySchema,
  updateDocumentSchema
} from "./documents.validation.js";

export const getDocuments: RequestHandler = async (req, res) => {
  const query = parseOrThrow(documentsQuerySchema, req.query);
  const context = await getRequestContext(req);
  const result = await listDocuments(context, {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    status: query.status
  });
  sendPaginated(res, result.documents, result.pagination);
};

export const getDocument: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const document = await getDocumentDetail(context, params.documentId);
  sendSuccess(res, document);
};

export const postDocument: RequestHandler = async (req, res) => {
  const body = parseOrThrow(createDocumentSchema, req.body);
  const context = await getRequestContext(req);
  const document = await createDocument(context, body);
  sendSuccess(res, document, 201);
};

export const patchDocument: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const body = parseOrThrow(updateDocumentSchema, req.body);
  const context = await getRequestContext(req);
  const document = await updateDocument(context, {
    documentId: params.documentId,
    ...body
  });
  sendSuccess(res, document);
};

export const deleteDocument: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const context = await getRequestContext(req);
  const result = await softDeleteDocument(context, params.documentId);
  sendSuccess(res, result);
};
