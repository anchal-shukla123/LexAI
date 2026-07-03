import type { ApiResponse, PaginatedResponse } from "@/types/api";

const DEFAULT_DEV_API_URL = "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT_MS = 3500;

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_API_URL;
  }

  return "";
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiClientError("Backend returned an unreadable response.", response.status);
  }
}

export async function safeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not configured.", 0, "CONFIG_MISSING");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers
      },
      cache: "no-store",
      signal: init?.signal ?? controller.signal
    });
  } catch (error) {
    throw new ApiClientError(error instanceof DOMException && error.name === "AbortError" ? "Backend request timed out." : "Backend unavailable.", 0, "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = await parseJson<ApiResponse<T> | PaginatedResponse<T>>(response);

  if (!response.ok || !payload.success) {
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiClientError(error?.message ?? "Backend request failed.", response.status, error?.code);
  }

  return payload.data as T;
}

export async function safeFetchPaginated<T>(path: string, init?: RequestInit): Promise<PaginatedResponse<T>> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not configured.", 0, "CONFIG_MISSING");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers
      },
      cache: "no-store",
      signal: init?.signal ?? controller.signal
    });
  } catch (error) {
    throw new ApiClientError(error instanceof DOMException && error.name === "AbortError" ? "Backend request timed out." : "Backend unavailable.", 0, "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timeout);
  }

  const payload = await parseJson<ApiResponse<T[]> | PaginatedResponse<T>>(response);

  if (!response.ok || !payload.success) {
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiClientError(error?.message ?? "Backend request failed.", response.status, error?.code);
  }

  return payload as PaginatedResponse<T>;
}
