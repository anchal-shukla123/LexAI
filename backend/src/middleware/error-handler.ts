import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../utils/app-error.js";
import { fail } from "../utils/response.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    res.status(400).json(fail("BAD_REQUEST", "Invalid JSON request body."));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json(fail(error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json(fail("VALIDATION_ERROR", "Invalid request.", error.issues));
    return;
  }

  console.error(error);

  res.status(500).json(fail("INTERNAL_ERROR", "Internal server error."));
};
