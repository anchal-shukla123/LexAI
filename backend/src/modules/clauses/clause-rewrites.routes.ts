import { Router } from "express";

import { optionalAuth } from "../../middleware/optional-auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { deleteClauseRewrite, patchClauseRewrite } from "./clauses.controller.js";

export const clauseRewritesRouter = Router();

clauseRewritesRouter.use(optionalAuth);

clauseRewritesRouter.patch("/:rewriteId", asyncHandler(patchClauseRewrite));
clauseRewritesRouter.delete("/:rewriteId", asyncHandler(deleteClauseRewrite));
