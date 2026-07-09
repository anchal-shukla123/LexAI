import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getDocumentClauseReview, getDocumentClauses, postExtractClauses, postRewriteClause } from "./clauses.controller.js";

export const clausesRouter = Router({ mergeParams: true });

clausesRouter.post("/extract-clauses", asyncHandler(postExtractClauses));
clausesRouter.get("/clause-review", asyncHandler(getDocumentClauseReview));
clausesRouter.post("/clauses/:clauseId/rewrite", asyncHandler(postRewriteClause));
clausesRouter.get("/clauses", asyncHandler(getDocumentClauses));
