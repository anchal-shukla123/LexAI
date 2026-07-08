import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { downloadExport, getExport } from "./exports.controller.js";

export const exportsRouter = Router();

exportsRouter.use(optionalAuth);

exportsRouter.get("/:exportJobId", asyncHandler(getExport));
exportsRouter.get("/:exportJobId/download", asyncHandler(downloadExport));
