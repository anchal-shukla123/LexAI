import type { ApiResponse, PaginatedResponse } from "@/types/api";

const DEFAULT_DEV_API_URL = "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT_MS = 3500;
const TOKEN_STORAGE_KEY = "lexai_token";
const AUTH_STORAGE_KEY = "lexai_auth";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown[];

  constructor(message: string, status: number, code?: string, details?: unknown[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStoredToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function clearStoredAuth() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function hasAuthorizationHeader(headers: Headers) {
  return headers.has("Authorization") || headers.has("authorization");
}

function buildHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const token = getStoredToken();
  if (token && !hasAuthorizationHeader(headers)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
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
      headers: buildHeaders(init?.headers),
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
    if (response.status === 401) {
      clearStoredAuth();
    }
    throw new ApiClientError(error?.message ?? "Backend request failed.", response.status, error?.code, error?.details);
  }

  return payload.data as T;
}

export async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  return safeFetch<T>(path, {
    ...init,
    method: init?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    body: JSON.stringify(body)
  });
}

export async function uploadFile<T>(path: string, file: File, fieldName = "file", init?: RequestInit): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  return safeFetch<T>(path, {
    ...init,
    method: init?.method ?? "POST",
    body: formData
  });
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
      headers: buildHeaders(init?.headers),
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
    if (response.status === 401) {
      clearStoredAuth();
    }
    throw new ApiClientError(error?.message ?? "Backend request failed.", response.status, error?.code, error?.details);
  }

  return payload as PaginatedResponse<T>;
}
