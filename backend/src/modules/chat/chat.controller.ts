import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { parseOrThrow } from "../shared/validation.js";
import { getChatSessionDetail } from "./chat.service.js";
import { chatSessionParamsSchema } from "./chat.validation.js";

export const getChatSession: RequestHandler = async (req, res) => {
  const params = parseOrThrow(chatSessionParamsSchema, req.params);
  const session = await getChatSessionDetail(params.sessionId);
  sendSuccess(res, session);
};

