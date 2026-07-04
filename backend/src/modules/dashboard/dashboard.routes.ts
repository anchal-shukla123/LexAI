import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getDashboard } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", asyncHandler(getDashboard));
