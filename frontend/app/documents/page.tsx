import { ArrowRight, Clock3, FileText, ShieldAlert, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";

const documents = [
  {
    title: "Vendor Data Processing Agreement",
    type: "Commercial / Privacy",
    risk: "Medium risk",
    status: "Analysis ready",
    updated: "Just now"
  },
  {
    title: "Series A Subscription Agreement",
    type: "Financing",
    risk: "Medium risk",
    status: "Report ready",
    updated: "12 min ago"
  },
  {
    title: "Master Services Agreement",
    type: "Commercial",
    risk: "Low risk",
    status: "Reviewed",
    updated: "1 hr ago"
  }
];

function riskTone(risk: string) {
  if (risk.startsWith("Low")) {
    return "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]";
  }

  return "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]";
}

export default function DocumentsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Contract library
            </div>
            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Documents</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Manage uploaded contracts and analysis history.
            </p>
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link href="/upload">
              <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
              Upload Contract
            </Link>
          </Button>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">Analysis history</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground">Recent documents</h2>
              </div>
              <span className="inline-flex min-h-7 w-fit items-center rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-1 text-xs font-medium text-[#86EFAC]">
                Frontend-only demo
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              {documents.map((document) => (
                <Link
                  key={document.title}
                  href="/contracts/demo-analysis"
                  className="group grid gap-4 rounded-2xl border border-border bg-[#0D1117]/70 p-4 transition duration-150 ease-out hover:-translate-y-1 hover:border-primary/45 hover:bg-[#1F2937]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="flex min-w-0 gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 text-[#BFDBFE]">
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
                    <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-[#1F2937] px-3 py-1 text-xs font-medium text-muted-foreground">
                      {document.status}
                    </span>
                    <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-border bg-[#1F2937] px-3 py-1 text-xs font-medium text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {document.updated}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Document actions">
            <section className="rounded-2xl border border-[#8B5CF6]/35 bg-[#161B22]/95 p-6 shadow-[0_0_36px_rgba(139,92,246,0.12),0_16px_48px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD]">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight text-foreground">Demo analysis</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Open the sample contract risk analysis.</p>
                </div>
              </div>
              <Button asChild className="mt-5 w-full">
                <Link href="/contracts/demo-analysis">
                  View Analysis
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-[#161B22]/70 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                AI-generated document intelligence does not replace professional legal advice.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </DashboardShell>
  );
}
