import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getDashboard } from "./demo.controller.js";

export const demoRouter = Router();

demoRouter.get("/dashboard", asyncHandler(getDashboard));

