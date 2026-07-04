import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { loginHandler, logoutHandler, meHandler, signupHandler } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/signup", asyncHandler(signupHandler));
authRouter.post("/login", asyncHandler(loginHandler));
authRouter.get("/me", asyncHandler(meHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
