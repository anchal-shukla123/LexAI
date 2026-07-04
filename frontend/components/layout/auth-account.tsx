"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { getStoredAuth, logout } from "@/lib/auth-client";
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

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function getAuthSnapshot() {
  const storedAuth = getStoredAuth();
  return storedAuth ? JSON.stringify(storedAuth) : "";
}

export function useAuthDisplay() {
  const authSnapshot = useSyncExternalStore(subscribeToAuthStorage, getAuthSnapshot, () => "");

  return useMemo(() => {
    const storedAuth = authSnapshot ? (JSON.parse(authSnapshot) as StoredAuth) : null;
    const userName = storedAuth?.user.name?.trim() || fallbackAuth.userName;
    const userEmail = storedAuth?.user.email || fallbackAuth.userEmail;
    const workspaceName = storedAuth?.workspace.name || fallbackAuth.workspaceName;

    return {
      hasStoredAuth: Boolean(storedAuth),
      userName,
      userEmail,
      workspaceName,
      initials: initialsFrom(userName)
    };
  }, [authSnapshot]);
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
