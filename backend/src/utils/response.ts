import type { Response } from "express";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
};

export function success<T>(data: T) {
  return {
    success: true,
    data
  };
}

export function paginated<T>(data: T[], pagination: Pagination) {
  return {
    success: true,
    data,
    pagination
  };
}

export function fail(code: string, message: string, details: unknown[] = []) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json(success(data));
}

export function sendPaginated<T>(res: Response, data: T[], pagination: Pagination) {
  return res.status(200).json(paginated(data, pagination));
}

