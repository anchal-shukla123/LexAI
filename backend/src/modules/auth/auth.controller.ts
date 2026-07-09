import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { sendSuccess } from "../../utils/response.js";
import { parseOrThrow } from "../shared/validation.js";
import { getCurrentUser, login, logout, signup } from "./auth.service.js";
import { verifyAccessToken } from "./jwt.js";
import { loginSchema, signupSchema } from "./auth.validation.js";
import {
  buildGoogleOAuthStart,
  clearGoogleOAuthStateCookie,
  completeGoogleOAuth,
  googleOAuthFailureRedirect,
  googleOAuthSuccessRedirect
} from "./google-oauth.service.js";

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

function safeOAuthErrorCode(error: unknown) {
  if (!(error instanceof AppError)) {
    return "oauth_failed";
  }

  switch (error.message) {
    case "Google OAuth is not configured.":
      return "oauth_not_configured";
    case "OAuth state is required.":
    case "OAuth state is invalid.":
      return "invalid_state";
    case "GOOGLE_AUTH_CODE_REQUIRED":
      return "missing_code";
    case "GOOGLE_TOKEN_EXCHANGE_FAILED":
      return "token_exchange_failed";
    case "GOOGLE_ID_TOKEN_INVALID":
    case "GOOGLE_PROFILE_INVALID":
    case "GOOGLE_PROFILE_FETCH_FAILED":
      return "google_profile_invalid";
    default:
      return "oauth_failed";
  }
}

export const googleOAuthStartHandler: RequestHandler = async (_req, res) => {
  try {
    const { authorizationUrl, stateCookie } = buildGoogleOAuthStart();
    res.setHeader("Set-Cookie", stateCookie);
    res.redirect(302, authorizationUrl);
  } catch (error) {
    res.redirect(302, googleOAuthFailureRedirect(safeOAuthErrorCode(error)));
  }
};

export const googleOAuthCallbackHandler: RequestHandler = async (req, res) => {
  try {
    if (typeof req.query.error === "string" && req.query.error) {
      res.setHeader("Set-Cookie", clearGoogleOAuthStateCookie());
      res.redirect(302, googleOAuthFailureRedirect("google_denied"));
      return;
    }

    const result = await completeGoogleOAuth({
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      state: typeof req.query.state === "string" ? req.query.state : undefined,
      cookieHeader: req.header("cookie")
    });

    res.setHeader("Set-Cookie", clearGoogleOAuthStateCookie());
    res.redirect(302, googleOAuthSuccessRedirect(result.token));
  } catch (error) {
    res.setHeader("Set-Cookie", clearGoogleOAuthStateCookie());
    res.redirect(302, googleOAuthFailureRedirect(safeOAuthErrorCode(error)));
  }
};
