import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { detectDocumentRisks, getDocumentRisks } from "./risks.controller.js";

export const risksRouter = Router({ mergeParams: true });

risksRouter.post("/detect-risks", asyncHandler(detectDocumentRisks));
risksRouter.get("/risks", asyncHandler(getDocumentRisks));
