"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { forwardRef, useMemo, useState, useSyncExternalStore } from "react";

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
      <span className="hidden h-8 items-center gap-2 rounded-full border border-[#D9B76E]/30 bg-[#D9B76E]/10 px-3 text-xs font-medium text-[#F0D89B] shadow-[0_8px_24px_rgba(217,183,110,0.08)] sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9B76E]/85 shadow-[0_0_12px_rgba(217,183,110,0.5)]" />
        Demo Mode
      </span>
    );
  }

  return (
    <span className="hidden h-8 items-center gap-2 rounded-full border border-[#A7C957]/30 bg-[#A7C957]/10 px-3 text-xs font-medium text-[#D7E8A5] shadow-[0_8px_24px_rgba(167,201,87,0.08)] sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[#A7C957]/85 shadow-[0_0_12px_rgba(167,201,87,0.5)]" />
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
        <p className="truncate text-sm font-medium leading-5 text-[#F5F5EF]">{authDisplay.userName}</p>
        <p className="truncate text-xs leading-5 text-[#A2AAA5]">{authDisplay.userEmail}</p>
      </div>
      <span
        aria-label={`${authDisplay.userName} account`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2C3632] bg-[#121817] text-sm font-semibold text-[#F5F5EF] transition duration-150 ease-out hover:border-[#A7C957]/50"
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
        className="h-10 w-10 px-0 text-[#A2AAA5] hover:bg-[#121817] hover:text-[#F5F5EF]"
      >
        {isLoggingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#A2AAA5]/35 border-t-[#A2AAA5]" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}

export function SiteAuthActions({ variant = "default" }: { variant?: "default" | "landing" }) {
  const router = useRouter();
  const authDisplay = useAuthDisplay();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLanding = variant === "landing";

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

  if (!authDisplay.hasToken) {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={isLanding ? "h-9 rounded-md px-3 text-[#A2AAA5] hover:bg-[#1B2421] hover:text-[#F5F5EF]" : undefined}
        >
          <Link href="/login">Login</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className={isLanding ? "h-9 rounded-md bg-[#A7C957] px-3 text-[#0B0F0E] shadow-none hover:bg-[#B6D86A]" : undefined}
        >
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={
          isLanding
            ? "hidden h-8 items-center rounded-md border border-[#A7C957]/30 bg-[#A7C957]/10 px-3 text-xs font-medium text-[#D7E8A5] sm:inline-flex"
            : "hidden h-8 items-center rounded-md border border-border bg-muted px-3 text-xs font-medium text-muted-foreground sm:inline-flex"
        }
      >
        Signed in
      </span>
      <Button
        asChild
        size="sm"
        className={isLanding ? "h-9 rounded-md bg-[#A7C957] px-3 text-[#0B0F0E] shadow-none hover:bg-[#B6D86A]" : undefined}
      >
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      <span
        aria-label={`${authDisplay.userName} account`}
        className={
          isLanding
            ? "hidden h-9 w-9 items-center justify-center rounded-full border border-[#2C3632] bg-[#121817] text-xs font-semibold text-[#F5F5EF] sm:inline-flex"
            : "hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground sm:inline-flex"
        }
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
        className={
          isLanding
            ? "h-9 w-9 rounded-md px-0 text-[#A2AAA5] hover:bg-[#1B2421] hover:text-[#F5F5EF]"
            : "h-9 w-9 px-0"
        }
      >
        {isLoggingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/35 border-t-current" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}

type StartReviewLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
};

export const StartReviewLink = forwardRef<HTMLAnchorElement, StartReviewLinkProps>(function StartReviewLink({ children, ...props }, ref) {
  const authDisplay = useAuthDisplay();

  return (
    <Link ref={ref} href={authDisplay.hasToken ? "/dashboard" : "/signup"} {...props}>
      {children}
    </Link>
  );
});
