export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details: unknown[] = []
  ) {
    super(message);
    this.statusCode = statusByCode[code];
  }
}

export function validationError(message: string, details: unknown[] = []) {
  return new AppError("VALIDATION_ERROR", message, details);
}

export function notFound(message: string, details: unknown[] = []) {
  return new AppError("NOT_FOUND", message, details);
}

