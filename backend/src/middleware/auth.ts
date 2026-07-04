import type { RequestHandler } from "express";

import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";

export type AuthenticatedRequestContext = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthenticatedRequestContext;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authorization = req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

    if (!token) {
      throw new AppError("UNAUTHORIZED", "Authorization bearer token is required.");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        email: payload.email,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Invalid or expired access token.");
    }

    req.auth = {
      user
    };

    next();
  } catch (error) {
    next(error);
  }
};
