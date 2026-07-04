"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { getStoredAuth, getToken, logout } from "@/lib/auth-client";
import { AUTH_STORAGE_EVENT } from "@/lib/auth-storage";
import type { AuthSession } from "@/types/api";

type StoredAuth = Omit<AuthSession, "token">;

const fallbackAuth = {
  userName: "Apex Legal",
  userEmail: "apex@lexai.local",
  workspaceName: "Apex Workspace"
};

function initialsFrom(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "AL";
}

function subscribeToAuthStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_STORAGE_EVENT, onStoreChange);
  };
}

function getAuthSnapshot() {
  const storedAuth = getStoredAuth();
  const token = getToken();

  return JSON.stringify({
    hasToken: Boolean(token),
    auth: storedAuth
  });
}

export function useAuthDisplay() {
  const authSnapshot = useSyncExternalStore(subscribeToAuthStorage, getAuthSnapshot, () => "");

  return useMemo(() => {
    const snapshot = authSnapshot ? (JSON.parse(authSnapshot) as { hasToken: boolean; auth: StoredAuth | null }) : { hasToken: false, auth: null };
    const storedAuth = snapshot.auth;
    const userName = storedAuth?.user.name?.trim() || fallbackAuth.userName;
    const userEmail = storedAuth?.user.email || fallbackAuth.userEmail;
    const workspaceName = storedAuth?.workspace.name || fallbackAuth.workspaceName;

    return {
      hasStoredAuth: Boolean(storedAuth),
      hasToken: snapshot.hasToken,
      userName,
      userEmail,
      workspaceName,
      initials: initialsFrom(userName)
    };
  }, [authSnapshot]);
}

export function AuthModeBadge({ contextMode }: { contextMode?: "auth" | "demo" }) {
  const authDisplay = useAuthDisplay();
  const isDemoMode = contextMode ? contextMode === "demo" : !authDisplay.hasToken;

  if (isDemoMode) {
    return (
      <span className="hidden h-8 items-center gap-2 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 text-xs font-medium text-[#FCD34D] shadow-[0_8px_24px_rgba(245,158,11,0.08)] sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]/80 shadow-[0_0_12px_rgba(245,158,11,0.55)]" />
        Demo Mode
      </span>
    );
  }

  return (
    <span className="hidden h-8 items-center gap-2 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 text-xs font-medium text-[#86EFAC] shadow-[0_8px_24px_rgba(34,197,94,0.08)] sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]/80 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
      Signed in
    </span>
  );
}

export function AccountArea() {
  const router = useRouter();
  const authDisplay = useAuthDisplay();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // Local logout should still complete if the backend is unavailable.
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 text-right md:block">
        <p className="truncate text-sm font-medium leading-5 text-foreground">{authDisplay.userName}</p>
        <p className="truncate text-xs leading-5 text-muted-foreground">{authDisplay.userEmail}</p>
      </div>
      <span
        aria-label={`${authDisplay.userName} account`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground transition duration-150 ease-out hover:border-primary/50"
      >
        {authDisplay.initials}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="Log out"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="h-10 w-10 px-0 text-muted-foreground hover:text-foreground"
      >
        {isLoggingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/35 border-t-muted-foreground" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
