"use client";

import { ArrowRight, Clock3, FileText, ShieldAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { safeFetchPaginated } from "@/lib/api-client";
import type { DocumentListItem } from "@/types/api";

type UiDocument = {
  id?: string;
  title: string;
  type: string;
  risk: string;
  status: string;
  updated: string;
  href: string;
};

const fallbackDocuments: UiDocument[] = [
  {
    title: "Vendor Data Processing Agreement",
    type: "Commercial / Privacy",
    risk: "Medium risk",
    status: "Analysis ready",
    updated: "Just now",
    href: "/contracts/demo-analysis"
  },
  {
    title: "Series A Subscription Agreement",
    type: "Financing",
    risk: "Medium risk",
    status: "Report ready",
    updated: "12 min ago",
    href: "/contracts/demo-analysis"
  },
  {
    title: "Master Services Agreement",
    type: "Commercial",
    risk: "Low risk",
    status: "Reviewed",
    updated: "1 hr ago",
    href: "/contracts/demo-analysis"
  }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function riskLabel(score: number | null) {
  if (score === null) {
    return "Not scored";
  }

  if (score >= 80) {
    return "High risk";
  }

  if (score >= 50) {
    return "Medium risk";
  }

  return "Low risk";
}

function fileType(document: DocumentListItem) {
  const firstFile = document.files?.[0];
  const extension = firstFile?.extension?.toUpperCase();
  const size = firstFile ? `${Math.round(firstFile.sizeBytes / 1024)} KB` : null;

  return [extension, size].filter(Boolean).join(" / ") || document.description || "Legal document";
}

function toUiDocument(document: DocumentListItem): UiDocument {
  return {
    id: document.id,
    title: document.title,
    type: fileType(document),
    risk: riskLabel(document.riskScore),
    status: document.status.replaceAll("_", " ").toLowerCase(),
    updated: formatDate(document.createdAt),
    href: `/contracts/demo-analysis?documentId=${document.id}`
  };
}

function riskTone(risk: string) {
  if (risk.startsWith("Low")) {
    return "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]";
  }

  if (risk.startsWith("High")) {
    return "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]";
  }

  return "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]";
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("reviewed") || normalized.includes("complete")) {
    return "border-[#A7C957]/35 bg-[#A7C957]/10 text-[#D7E8A5]";
  }

  if (normalized.includes("report") || normalized.includes("ready")) {
    return "border-[#D9B76E]/35 bg-[#D9B76E]/10 text-[#F0D89B]";
  }

  if (normalized.includes("action") || normalized.includes("needs")) {
    return "border-[#C47A4A]/35 bg-[#C47A4A]/10 text-[#E4AD89]";
  }

  return "border-[#6BAA9C]/30 bg-[#6BAA9C]/10 text-[#9BCBC2]";
}

export default function DocumentsPage() {
  const [apiDocuments, setApiDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    safeFetchPaginated<DocumentListItem>("/documents", {
      signal: controller.signal
    })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setApiDocuments(response.data);
        setIsFallback(false);
      })
      .catch(() => {
        if (isMounted) {
          setIsFallback(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const documents = useMemo(() => (isFallback ? fallbackDocuments : apiDocuments.map(toUiDocument)), [apiDocuments, isFallback]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#6BAA9C]/35 bg-[#6BAA9C]/10 px-3 py-1 text-xs font-medium text-[#9BCBC2]">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Legal review archive
            </div>
            <h1 className="text-3xl font-bold leading-tight text-[#F5F5EF] sm:text-4xl">Documents</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Browse uploaded contracts, review status, and risk history.
            </p>
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link href="/upload">
              <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
              Upload contract
            </Link>
          </Button>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[#2C3632] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Analysis history</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground">Recent documents</h2>
              </div>
              <span className="inline-flex min-h-7 w-fit items-center rounded-full border border-[#D9B76E]/35 bg-[#D9B76E]/10 px-3 py-1 text-xs font-medium text-[#F0D89B]">
                {isFallback ? "Backend unavailable - showing demo data" : isLoading ? "Loading library" : "Real document records"}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              {isLoading ? (
                <div className="grid gap-4" aria-label="Loading documents">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-[92px] animate-pulse rounded-2xl border border-[#2C3632] bg-[#0B0F0E]/70" />
                  ))}
                </div>
              ) : null}
              {documents.map((document) => (
                <Link
                  key={document.id ?? document.title}
                  href={document.href}
                  className="group grid gap-4 rounded-2xl border border-[#2C3632] bg-[#0B0F0E]/70 p-4 transition duration-150 ease-out hover:-translate-y-1 hover:border-[#D9B76E]/45 hover:bg-[#151C19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="flex min-w-0 gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#6BAA9C]/25 bg-[#6BAA9C]/10 text-[#9BCBC2]">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold leading-7 text-foreground">{document.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{document.type}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${riskTone(document.risk)}`}>
                      {document.risk}
                    </span>
                    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${statusTone(document.status)}`}>
                      {document.status}
                    </span>
                    <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[#2C3632] bg-[#151C19] px-3 py-1 text-xs font-medium text-[#A2AAA5]">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {document.updated}
                    </span>
                  </span>
                </Link>
              ))}
              {!isLoading && documents.length === 0 ? (
                <div className="rounded-2xl border border-[#2C3632] bg-[#0B0F0E]/70 p-5 text-sm leading-6 text-muted-foreground">
                  No documents yet. Upload a contract to start your first review.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Document actions">
            <section className="rounded-2xl border border-[#D9B76E]/35 bg-[#121817]/95 p-6 shadow-[0_0_36px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C47A4A]/15 text-[#E4AD89]">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight text-foreground">Open latest analysis</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Continue with the most recent document review.</p>
                </div>
              </div>
              <Button asChild className="mt-5 w-full">
                <Link href={documents[0]?.href ?? "/contracts/demo-analysis"}>
                  View analysis
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/70 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                LexAI review output does not replace professional legal advice.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
