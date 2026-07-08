import type { ApiResponse, PaginatedResponse } from "@/types/api";
import { AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY, canUseStorage, emitAuthStorageChange } from "@/lib/auth-storage";

const DEFAULT_DEV_API_URL = "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT_MS = 20_000;
const ANALYZE_TIMEOUT_MS = 90_000;

type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
  timeoutMessage?: string;
};

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
  emitAuthStorageChange();
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function createRequestSignal(init?: ApiRequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return { signal: controller.signal, timeout };
}

export async function safeFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not configured.", 0, "CONFIG_MISSING");
  }

  const { signal, timeout } = createRequestSignal(init);
  const {
    timeoutMs: _timeoutMs,
    timeoutMessage = "Backend request timed out.",
    signal: _signal,
    ...requestInit
  } = init ?? {};
  void _timeoutMs;
  void _signal;

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...requestInit,
      headers: buildHeaders(init?.headers),
      cache: "no-store",
      signal
    });
  } catch (error) {
    throw new ApiClientError(
      isAbortError(error) ? timeoutMessage : "Backend unavailable.",
      0,
      isAbortError(error) ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"
    );
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

export async function postJson<T>(path: string, body: unknown, init?: ApiRequestInit): Promise<T> {
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

export async function postAnalyze<T>(path: string, body: unknown, init?: ApiRequestInit): Promise<T> {
  return postJson<T>(path, body, {
    ...init,
    timeoutMs: init?.timeoutMs ?? ANALYZE_TIMEOUT_MS,
    timeoutMessage: init?.timeoutMessage ?? "Analysis is still taking longer than expected. Please try again or check backend logs."
  });
}

export async function uploadFile<T>(path: string, file: File, fieldName = "file", init?: ApiRequestInit): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  return safeFetch<T>(path, {
    ...init,
    method: init?.method ?? "POST",
    body: formData
  });
}

export async function downloadBlob(path: string, init?: ApiRequestInit): Promise<Blob> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not configured.", 0, "CONFIG_MISSING");
  }

  const { signal, timeout } = createRequestSignal(init);
  const {
    timeoutMs: _timeoutMs,
    timeoutMessage = "Backend request timed out.",
    signal: _signal,
    ...requestInit
  } = init ?? {};
  void _timeoutMs;
  void _signal;

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...requestInit,
      headers: buildHeaders(init?.headers),
      cache: "no-store",
      signal
    });
  } catch (error) {
    throw new ApiClientError(
      isAbortError(error) ? timeoutMessage : "Backend unavailable.",
      0,
      isAbortError(error) ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"
    );
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const payload = await parseJson<ApiResponse<unknown>>(response);
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiClientError(error?.message ?? "Download failed.", response.status, error?.code, error?.details);
  }

  return response.blob();
}

export async function safeFetchPaginated<T>(path: string, init?: ApiRequestInit): Promise<PaginatedResponse<T>> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not configured.", 0, "CONFIG_MISSING");
  }

  const { signal, timeout } = createRequestSignal(init);
  const {
    timeoutMs: _timeoutMs,
    timeoutMessage = "Backend request timed out.",
    signal: _signal,
    ...requestInit
  } = init ?? {};
  void _timeoutMs;
  void _signal;

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...requestInit,
      headers: buildHeaders(init?.headers),
      cache: "no-store",
      signal
    });
  } catch (error) {
    throw new ApiClientError(
      isAbortError(error) ? timeoutMessage : "Backend unavailable.",
      0,
      isAbortError(error) ? "REQUEST_TIMEOUT" : "NETWORK_ERROR"
    );
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
