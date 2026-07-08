import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getDocumentClauseReview, getDocumentClauses, postExtractClauses } from "./clauses.controller.js";

export const clausesRouter = Router({ mergeParams: true });

clausesRouter.post("/extract-clauses", asyncHandler(postExtractClauses));
clausesRouter.get("/clause-review", asyncHandler(getDocumentClauseReview));
clausesRouter.get("/clauses", asyncHandler(getDocumentClauses));
