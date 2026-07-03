import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getReport, getReports } from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get("/", asyncHandler(getReports));
reportsRouter.get("/:reportId", asyncHandler(getReport));

