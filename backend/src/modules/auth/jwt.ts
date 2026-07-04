import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";

type AccessTokenPayload = {
  sub: string;
  email: string;
};

function jwtSecret() {
  if (!env.JWT_SECRET) {
    throw new AppError("INTERNAL_ERROR", "JWT_SECRET is not configured.");
  }

  return env.JWT_SECRET;
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, jwtSecret(), options);
}

export function verifyAccessToken(token: string) {
  try {
    const payload = jwt.verify(token, jwtSecret()) as JwtPayload;

    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new AppError("UNAUTHORIZED", "Invalid access token.");
    }

    return {
      userId: payload.sub,
      email: payload.email
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("UNAUTHORIZED", "Invalid or expired access token.");
  }
}
