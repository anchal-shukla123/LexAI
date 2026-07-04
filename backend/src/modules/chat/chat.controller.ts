import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { getChatSessionDetail } from "./chat.service.js";
import { chatSessionParamsSchema } from "./chat.validation.js";

export const getChatSession: RequestHandler = async (req, res) => {
  const params = parseOrThrow(chatSessionParamsSchema, req.params);
  const context = await getRequestContext(req);
  const session = await getChatSessionDetail(context, params.sessionId);
  sendSuccess(res, session);
};
