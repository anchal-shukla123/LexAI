import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getDashboard } from "./demo.controller.js";

export const demoRouter = Router();

demoRouter.use(optionalAuth);

demoRouter.get("/dashboard", asyncHandler(getDashboard));
