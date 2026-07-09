import { randomBytes } from "node:crypto";

import jwt, { type JwtPayload } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { loginWithGoogleProfile } from "./auth.service.js";

const googleAuthorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleTokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo";
const googleUserInfoUrl = "https://openidconnect.googleapis.com/v1/userinfo";
const oauthStateCookieName = "lexai_google_oauth_state";
const oauthStateTtlSeconds = 10 * 60;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleTokenInfoResponse = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  iss?: string;
  sub?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type OAuthStatePayload = JwtPayload & {
  nonce?: string;
  purpose?: string;
};

function requireGoogleConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI || !env.JWT_SECRET) {
    throw new AppError("INTERNAL_ERROR", "Google OAuth is not configured.");
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    jwtSecret: env.JWT_SECRET
  };
}

function frontendUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, env.FRONTEND_URL.endsWith("/") ? env.FRONTEND_URL : `${env.FRONTEND_URL}/`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function isProduction() {
  return env.NODE_ENV === "production";
}

export function buildGoogleOAuthStart() {
  const config = requireGoogleConfig();
  const nonce = randomBytes(24).toString("base64url");
  const state = jwt.sign(
    {
      nonce,
      purpose: "google_oauth"
    },
    config.jwtSecret,
    {
      expiresIn: oauthStateTtlSeconds
    }
  );

  const authorizationUrl = new URL(googleAuthorizationUrl);
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "select_account");

  return {
    authorizationUrl: authorizationUrl.toString(),
    stateCookie: `${oauthStateCookieName}=${encodeURIComponent(state)}; Max-Age=${oauthStateTtlSeconds}; Path=/api/v1/auth/google/callback; HttpOnly; SameSite=Lax${isProduction() ? "; Secure" : ""}`
  };
}

export function clearGoogleOAuthStateCookie() {
  return `${oauthStateCookieName}=; Max-Age=0; Path=/api/v1/auth/google/callback; HttpOnly; SameSite=Lax${isProduction() ? "; Secure" : ""}`;
}

export function googleOAuthFailureRedirect(code: string) {
  return frontendUrl("/login", {
    oauthError: code
  });
}

export function googleOAuthSuccessRedirect(token: string) {
  return frontendUrl("/auth/oauth-success", {
    token
  });
}

function parseCookieHeader(cookieHeader: string | undefined) {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    cookies.set(rawName, decodeURIComponent(rawValueParts.join("=")));
  }

  return cookies;
}

function verifyState(state: string | undefined, cookieHeader: string | undefined) {
  if (!state) {
    throw new AppError("BAD_REQUEST", "OAuth state is required.");
  }

  const storedState = parseCookieHeader(cookieHeader).get(oauthStateCookieName);
  if (!storedState || storedState !== state) {
    throw new AppError("BAD_REQUEST", "OAuth state is invalid.");
  }

  const { jwtSecret } = requireGoogleConfig();
  const payload = jwt.verify(state, jwtSecret) as OAuthStatePayload;

  if (payload.purpose !== "google_oauth" || typeof payload.nonce !== "string") {
    throw new AppError("BAD_REQUEST", "OAuth state is invalid.");
  }
}

async function readJsonResponse<T>(response: Response, errorCode: string) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new AppError("BAD_REQUEST", errorCode);
  }

  if (!response.ok) {
    throw new AppError("BAD_REQUEST", errorCode);
  }

  return payload as T;
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse & { access_token: string; id_token: string }> {
  const config = requireGoogleConfig();
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });

  const tokens = await readJsonResponse<GoogleTokenResponse>(response, "GOOGLE_TOKEN_EXCHANGE_FAILED");
  if (!tokens.id_token || !tokens.access_token) {
    throw new AppError("BAD_REQUEST", "GOOGLE_TOKEN_EXCHANGE_FAILED");
  }

  return {
    ...tokens,
    access_token: tokens.access_token,
    id_token: tokens.id_token
  };
}

function isEmailVerified(value: string | boolean | undefined) {
  return value === true || value === "true";
}

async function verifyGoogleIdToken(idToken: string) {
  const { clientId } = requireGoogleConfig();
  const url = new URL(googleTokenInfoUrl);
  url.searchParams.set("id_token", idToken);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  const tokenInfo = await readJsonResponse<GoogleTokenInfoResponse>(response, "GOOGLE_ID_TOKEN_INVALID");
  const expiry = tokenInfo.exp ? Number(tokenInfo.exp) : 0;

  if (
    tokenInfo.aud !== clientId ||
    !["accounts.google.com", "https://accounts.google.com"].includes(tokenInfo.iss ?? "") ||
    !tokenInfo.sub ||
    !tokenInfo.email ||
    !isEmailVerified(tokenInfo.email_verified) ||
    !Number.isFinite(expiry) ||
    expiry * 1000 <= Date.now()
  ) {
    throw new AppError("UNAUTHORIZED", "GOOGLE_ID_TOKEN_INVALID");
  }

  return {
    sub: tokenInfo.sub,
    email: tokenInfo.email,
    emailVerified: true
  };
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  return readJsonResponse<GoogleUserInfoResponse>(response, "GOOGLE_PROFILE_FETCH_FAILED");
}

export async function completeGoogleOAuth(input: {
  code?: string;
  state?: string;
  cookieHeader?: string;
}) {
  verifyState(input.state, input.cookieHeader);

  if (!input.code) {
    throw new AppError("BAD_REQUEST", "GOOGLE_AUTH_CODE_REQUIRED");
  }

  const tokens = await exchangeCodeForTokens(input.code);
  const tokenProfile = await verifyGoogleIdToken(tokens.id_token);
  const userInfo = await fetchGoogleUserInfo(tokens.access_token);

  if (userInfo.sub !== tokenProfile.sub || userInfo.email !== tokenProfile.email || userInfo.email_verified !== true) {
    throw new AppError("UNAUTHORIZED", "GOOGLE_PROFILE_INVALID");
  }

  return loginWithGoogleProfile({
    email: tokenProfile.email,
    emailVerified: tokenProfile.emailVerified,
    name: userInfo.name?.trim() || null,
    providerAccountId: tokenProfile.sub,
    avatarUrl: userInfo.picture ?? null
  });
}
