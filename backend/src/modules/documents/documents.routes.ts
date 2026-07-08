import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { analyzeDocument } from "../analysis/analysis.controller.js";
import { documentChatRouter } from "../chat/chat.routes.js";
import { clausesRouter } from "../clauses/clauses.routes.js";
import { extractionRouter } from "../extraction/extraction.routes.js";
import { risksRouter } from "../risks/risks.routes.js";
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
documentsRouter.use("/:documentId", documentChatRouter);
documentsRouter.use("/:documentId", risksRouter);
documentsRouter.use("/:documentId", clausesRouter);
documentsRouter.use("/:documentId", extractionRouter);
documentsRouter.get("/:documentId", asyncHandler(getDocument));
