import type { RequestHandler } from "express";

import { prisma } from "../config/prisma.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";
import { AppError } from "../utils/app-error.js";

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const authorization = req.header("authorization");

    if (!authorization) {
      next();
      return;
    }

    if (!authorization.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", "Invalid authorization header.");
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Invalid authorization header.");
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
