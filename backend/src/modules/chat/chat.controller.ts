import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { createChatSessionMessage, createDocumentChatSession, getChatSessionDetail, listDocumentChatSessions } from "./chat.service.js";
import { chatSessionParamsSchema, createChatMessageSchema, createChatSessionSchema, documentChatParamsSchema } from "./chat.validation.js";

export const getDocumentChatSessions: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentChatParamsSchema, req.params);
  const context = await getRequestContext(req);
  const sessions = await listDocumentChatSessions(context, params.documentId);
  sendSuccess(res, sessions);
};

export const postDocumentChatSession: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentChatParamsSchema, req.params);
  const body = parseOrThrow(createChatSessionSchema, req.body ?? {});
  const context = await getRequestContext(req);
  const session = await createDocumentChatSession(context, {
    documentId: params.documentId,
    title: body.title
  });
  sendSuccess(res, session, 201);
};

export const getChatSession: RequestHandler = async (req, res) => {
  const params = parseOrThrow(chatSessionParamsSchema, req.params);
  const context = await getRequestContext(req);
  const session = await getChatSessionDetail(context, params.sessionId);
  sendSuccess(res, session);
};

export const postChatSessionMessage: RequestHandler = async (req, res) => {
  const params = parseOrThrow(chatSessionParamsSchema, req.params);
  const body = parseOrThrow(createChatMessageSchema, req.body ?? {});
  const context = await getRequestContext(req);
  const result = await createChatSessionMessage(context, {
    sessionId: params.sessionId,
    content: body.content
  });
  sendSuccess(res, result, 201);
};
