import { postJson, safeFetch } from "@/lib/api-client";
import { AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY, canUseStorage, emitAuthStorageChange } from "@/lib/auth-storage";
import type { AuthSession, LoginPayload, SignupPayload } from "@/types/api";

export function getToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthSession(data: AuthSession) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: data.user,
      workspace: data.workspace,
      currentWorkspaceId: data.currentWorkspaceId ?? data.workspace.id
    })
  );
  emitAuthStorageChange();
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthStorageChange();
}

export function getStoredAuth(): Omit<AuthSession, "token"> | null {
  if (!canUseStorage()) {
    return null;
  }

  const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedAuth) {
    return null;
  }

  try {
    return JSON.parse(storedAuth) as Omit<AuthSession, "token">;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function signup(payload: SignupPayload) {
  const session = await postJson<AuthSession>("/auth/signup", payload);
  setAuthSession(session);
  return session;
}

export async function login(payload: LoginPayload) {
  const session = await postJson<AuthSession>("/auth/login", payload);
  setAuthSession(session);
  return session;
}

export async function getMe() {
  const token = getToken();

  if (!token) {
    return null;
  }

  return safeFetch<Omit<AuthSession, "token" | "currentWorkspaceId">>("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function logout() {
  const token = getToken();

  try {
    if (token) {
      await postJson<{ loggedOut: boolean }>(
        "/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    }
  } finally {
    clearAuthSession();
  }
}
