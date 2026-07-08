import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { postReportExport } from "../exports/exports.controller.js";
import { getReport, getReports } from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(optionalAuth);

reportsRouter.get("/", asyncHandler(getReports));
reportsRouter.post("/:reportId/export", asyncHandler(postReportExport));
reportsRouter.get("/:reportId", asyncHandler(getReport));
