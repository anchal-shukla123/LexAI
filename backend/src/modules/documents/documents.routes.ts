import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { analyzeDocument } from "../analysis/analysis.controller.js";
import { uploadDocumentFile, uploadSingleFile } from "../uploads/uploads.controller.js";
import { deleteDocument, getDocument, getDocuments, patchDocument, postDocument } from "./documents.controller.js";

export const documentsRouter = Router();

documentsRouter.use(optionalAuth);

documentsRouter.post("/", asyncHandler(postDocument));
documentsRouter.get("/", asyncHandler(getDocuments));
documentsRouter.patch("/:documentId", asyncHandler(patchDocument));
documentsRouter.delete("/:documentId", asyncHandler(deleteDocument));
documentsRouter.post("/:documentId/upload", uploadSingleFile, asyncHandler(uploadDocumentFile));
documentsRouter.post("/:documentId/analyze", asyncHandler(analyzeDocument));
documentsRouter.get("/:documentId", asyncHandler(getDocument));
