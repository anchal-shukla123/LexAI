import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import {
  googleOAuthCallbackHandler,
  googleOAuthStartHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  signupHandler
} from "./auth.controller.js";

export const authRouter = Router();

authRouter.get("/google", asyncHandler(googleOAuthStartHandler));
authRouter.get("/google/callback", asyncHandler(googleOAuthCallbackHandler));
authRouter.post("/signup", asyncHandler(signupHandler));
authRouter.post("/login", asyncHandler(loginHandler));
authRouter.get("/me", asyncHandler(meHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
