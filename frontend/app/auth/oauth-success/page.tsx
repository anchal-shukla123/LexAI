"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMe, setAuthSession } from "@/lib/auth-client";
import { TOKEN_STORAGE_KEY, canUseStorage } from "@/lib/auth-storage";

function OAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function completeSession() {
      const token = searchParams.get("token");

      if (!token || !canUseStorage()) {
        setError("Google sign-in did not return a valid session.");
        return;
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);

      try {
        const session = await getMe();

        if (!active) {
          return;
        }

        if (!session?.user?.id || !session.workspace?.id) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setError("Google sign-in could not load your LexAI workspace.");
          return;
        }

        setAuthSession({
          token,
          user: session.user,
          workspace: session.workspace,
          currentWorkspaceId: session.workspace.id
        });
        router.replace("/dashboard");
      } catch {
        if (!active) {
          return;
        }

        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setError("Google sign-in could not be verified. Please try again.");
      }
    }

    void completeSession();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F0E] px-4 text-[#F5F5EF]">
      <section className="w-full max-w-md rounded-xl border border-[#2C3632] bg-[#121817] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        {error ? (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#D66A5E]/30 bg-[#D66A5E]/10 text-[#E89A92]">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Google sign-in failed</h1>
            <p className="mt-2 text-sm leading-6 text-[#A2AAA5]">{error}</p>
            <Button asChild className="mt-6 w-full rounded-xl bg-[#A7C957] text-[#0B0F0E] hover:bg-[#B8D86C]">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[#A7C957]/30 bg-[#A7C957]/10 text-[#A7C957]">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Finishing sign-in</h1>
            <p className="mt-2 text-sm leading-6 text-[#A2AAA5]">Securing your LexAI workspace.</p>
          </>
        )}
      </section>
    </main>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0B0F0E] px-4 text-[#F5F5EF]">
          <Loader2 className="h-6 w-6 animate-spin text-[#A7C957]" aria-hidden="true" />
        </main>
      }
    >
      <OAuthSuccessContent />
    </Suspense>
  );
}
