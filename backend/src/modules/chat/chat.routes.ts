import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getChatSession } from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.get("/sessions/:sessionId", asyncHandler(getChatSession));

