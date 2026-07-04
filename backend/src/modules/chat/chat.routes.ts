import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getChatSession } from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.use(optionalAuth);

chatRouter.get("/sessions/:sessionId", asyncHandler(getChatSession));
