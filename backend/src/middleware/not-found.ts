import type { RequestHandler } from "express";

import { AppError } from "./error-handler.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
