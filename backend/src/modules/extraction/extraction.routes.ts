import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import {
  getDocumentChunks,
  getDocumentExtraction,
  postExtractDocumentText
} from "./extraction.controller.js";

export const extractionRouter = Router({ mergeParams: true });

extractionRouter.post("/extract-text", asyncHandler(postExtractDocumentText));
extractionRouter.get("/extraction", asyncHandler(getDocumentExtraction));
extractionRouter.get("/chunks", asyncHandler(getDocumentChunks));
