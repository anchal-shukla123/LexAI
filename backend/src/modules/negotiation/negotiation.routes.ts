import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getDocumentNegotiationPack, postDocumentNegotiationEmail } from "./negotiation.controller.js";

export const negotiationRouter = Router({ mergeParams: true });

negotiationRouter.get("/negotiation-pack", asyncHandler(getDocumentNegotiationPack));
negotiationRouter.post("/negotiation-email", asyncHandler(postDocumentNegotiationEmail));
