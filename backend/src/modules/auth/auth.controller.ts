import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { sendSuccess } from "../../utils/response.js";
import { parseOrThrow } from "../shared/validation.js";
import { getCurrentUser, login, logout, signup } from "./auth.service.js";
import { verifyAccessToken } from "./jwt.js";
import { loginSchema, signupSchema } from "./auth.validation.js";

export const signupHandler: RequestHandler = async (req, res) => {
  const body = parseOrThrow(signupSchema, req.body);
  const result = await signup(body);
  sendSuccess(res, result, 201);
};

export const loginHandler: RequestHandler = async (req, res) => {
  const body = parseOrThrow(loginSchema, req.body);
  const result = await login(body);
  sendSuccess(res, result);
};

export const meHandler: RequestHandler = async (req, res) => {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    throw new AppError("UNAUTHORIZED", "Authorization bearer token is required.");
  }

  const payload = verifyAccessToken(token);
  const result = await getCurrentUser(payload.userId);
  sendSuccess(res, result);
};

export const logoutHandler: RequestHandler = async (_req, res) => {
  sendSuccess(res, logout());
};
