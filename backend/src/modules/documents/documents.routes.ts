import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getDocument, getDocuments } from "./documents.controller.js";

export const documentsRouter = Router();

documentsRouter.get("/", asyncHandler(getDocuments));
documentsRouter.get("/:documentId", asyncHandler(getDocument));

