import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getChatSession, getDocumentChatSessions, postChatSessionMessage, postDocumentChatSession } from "./chat.controller.js";

export const chatRouter = Router();
export const documentChatRouter = Router({ mergeParams: true });

chatRouter.use(optionalAuth);
documentChatRouter.use(optionalAuth);

chatRouter.get("/sessions/:sessionId", asyncHandler(getChatSession));
chatRouter.post("/sessions/:sessionId/messages", asyncHandler(postChatSessionMessage));

documentChatRouter.get("/chat/sessions", asyncHandler(getDocumentChatSessions));
documentChatRouter.post("/chat/sessions", asyncHandler(postDocumentChatSession));
