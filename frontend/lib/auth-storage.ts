export const TOKEN_STORAGE_KEY = "lexai_token";
export const AUTH_STORAGE_KEY = "lexai_auth";
export const AUTH_STORAGE_EVENT = "lexai-auth-storage-change";

export function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function emitAuthStorageChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
}
