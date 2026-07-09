"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Wand2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson, safeFetch } from "@/lib/api-client";
import type { NegotiationEmailResponse, NegotiationEmailTone, NegotiationPackResponse } from "@/types/api";

type BadgeTone = "low" | "medium" | "high" | "info" | "success" | "warning";

const tones: Array<{ value: NegotiationEmailTone; label: string }> = [
  { value: "professional", label: "Professional" },
  { value: "firm", label: "Firm" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" }
];

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskTone(level?: string | null): BadgeTone {
  if (!level) return "info";
  if (level === "CRITICAL" || level === "HIGH") return "high";
  if (level === "LOW") return "low";
  return "medium";
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) {
  const toneClasses = {
    low: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    medium: "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]",
    high: "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]",
    info: "border-[#6BAA9C]/45 bg-[#6BAA9C]/10 text-[#9BCBC2]",
    success: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    warning: "border-[#D9B76E]/45 bg-[#D9B76E]/10 text-[#F0D89B]"
  };

  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#2C3632] bg-[#151C19] p-4 text-sm leading-6 text-muted-foreground">{children}</div>;
}

function buildRewritePackage(pack: NegotiationPackResponse) {
  const sections = [
    `Negotiation Pack: ${pack.document.title}`,
    `Risk score: ${pack.document.riskScore ?? "Not scored"}`,
    "",
    "Top issues:",
    ...(pack.topRisks.length
      ? pack.topRisks.map((risk) => `- ${risk.title} (${risk.severity}): ${risk.recommendationHint ?? risk.impact ?? risk.description}`)
      : ["- No stored high-priority risk findings."]),
    "",
    "Accepted rewrites:",
    ...(pack.acceptedRewrites.length
      ? pack.acceptedRewrites.map((rewrite) => `- ${rewrite.clause.title}: ${rewrite.rewrittenClause}`)
      : ["- No accepted rewrites yet."]),
    "",
    "Negotiation checklist:",
    ...(pack.negotiationChecklist.length ? pack.negotiationChecklist.map((item) => `- ${item}`) : ["- No checklist items generated."]),
    "",
    pack.legalDisclaimer
  ];

  return sections.join("\n");
}

export default function NegotiationPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [pack, setPack] = useState<NegotiationPackResponse | null>(null);
  const [email, setEmail] = useState<NegotiationEmailResponse | null>(null);
  const [tone, setTone] = useState<NegotiationEmailTone>("professional");
  const [customInstruction, setCustomInstruction] = useState("");
  const [includeAcceptedRewrites, setIncludeAcceptedRewrites] = useState(true);
  const [includeRiskSummary, setIncludeRiskSummary] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadPack() {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await safeFetch<NegotiationPackResponse>(`/documents/${documentId}/negotiation-pack`, {
          signal: controller.signal
        });

        if (isMounted) {
          setPack(result);
          setEmail({
            subject: result.suggestedCounterpartyEmail.subject,
            emailBody: result.suggestedCounterpartyEmail.emailBody,
            includedRisks: result.topRisks.filter((risk) => risk.riskLevel !== "LOW"),
            includedRewrites: result.acceptedRewrites,
            disclaimer: result.legalDisclaimer
          });
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load negotiation pack.");
          setPack(null);
          setEmail(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadPack();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [documentId, retryCount]);

  const analysisHref = `/contracts/demo-analysis?documentId=${documentId}`;
  const clauseHref = `/contracts/${documentId}/clauses`;
  const reportHref = "/reports/demo-report";
  const rewritePackage = useMemo(() => (pack ? buildRewritePackage(pack) : ""), [pack]);

  async function generateEmail() {
    setIsGeneratingEmail(true);
    setLoadError("");

    try {
      const result = await postJson<NegotiationEmailResponse>(`/documents/${documentId}/negotiation-email`, {
        tone,
        includeAcceptedRewrites,
        includeRiskSummary,
        customInstruction: customInstruction.trim() || undefined
      });
      setEmail(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to generate negotiation email.");
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  async function copyText(value: string, message: string) {
    try {
      await window.navigator.clipboard.writeText(value);
      setCopyMessage(message);
    } catch {
      setCopyMessage("Copy failed. Select the text and copy it manually.");
    }

    window.setTimeout(() => setCopyMessage(""), 2800);
  }

  if (isLoading && !pack) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D9B76E]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Loading negotiation pack</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Collecting accepted rewrites, risks, recommendations, and checklist items.</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (loadError && !pack) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#D66A5E]/40 bg-[#121817]/95 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-[#E89A92]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Could not load negotiation pack</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError}</p>
            <Button type="button" className="mt-6" onClick={() => setRetryCount((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1480px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <Button asChild variant="ghost" size="sm" className="mb-4 px-0 text-muted-foreground hover:bg-transparent">
          <Link href={analysisHref}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to analysis
          </Link>
        </Button>

        <section className="rounded-2xl border border-[#D9B76E]/30 bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="warning">
                  <Wand2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Negotiation Pack
                </StatusBadge>
                <StatusBadge tone="info">{pack?.sourceLabel ?? "Rule-based real analysis"}</StatusBadge>
                <StatusBadge tone={pack?.acceptedRewrites.length ? "success" : "warning"}>{pack?.acceptedRewrites.length ?? 0} accepted rewrites</StatusBadge>
              </div>
              <h1 className="text-3xl font-bold leading-tight text-foreground">{pack?.document.title ?? "Negotiation Pack"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Package accepted rewrite positions, high-impact risks, and negotiation priorities into a counterparty-ready email.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href={clauseHref}>
                  <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                  Clause Review
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={reportHref}>
                  <ShieldCheck className="mr-2 h-5 w-5" aria-hidden="true" />
                  Report
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {loadError ? (
          <div className="mt-5 rounded-xl border border-[#D66A5E]/40 bg-[#D66A5E]/10 p-4 text-sm leading-6 text-[#E89A92]" role="alert">
            {loadError}
          </div>
        ) : null}

        {copyMessage ? (
          <div className="mt-5 rounded-xl border border-[#A7C957]/35 bg-[#A7C957]/10 p-4 text-sm font-medium text-[#D7E8A5]" role="status">
            {copyMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Risk score</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{pack?.document.riskScore ?? "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Top issues</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{pack?.topRisks.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Draft rewrites</p>
                <p className="mt-3 text-3xl font-bold text-foreground">{pack?.pendingDraftRewrites.length ?? 0}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
              <h2 className="text-xl font-semibold text-foreground">Top Issues</h2>
              {pack?.topRisks.length ? (
                <div className="mt-4 space-y-3">
                  {pack.topRisks.map((risk) => (
                    <article key={risk.id} className="rounded-xl border border-[#2C3632] bg-[#151C19]/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{risk.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.recommendationHint ?? risk.impact ?? risk.description}</p>
                        </div>
                        <StatusBadge tone={riskTone(risk.riskLevel)}>{risk.severity}</StatusBadge>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No stored risk findings are available for this real document.</EmptyState>
              )}
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-foreground">Accepted Rewrites</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(rewritePackage, "Rewrite package copied.")} disabled={!pack}>
                  <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy Rewrite Package
                </Button>
              </div>
              {pack?.acceptedRewrites.length ? (
                <div className="mt-4 space-y-4">
                  {pack.acceptedRewrites.map((rewrite) => (
                    <article key={rewrite.id} className="rounded-xl border border-[#A7C957]/25 bg-[#A7C957]/10 p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusBadge tone="success">Accepted</StatusBadge>
                        <StatusBadge tone="info">{titleCase(rewrite.goal)}</StatusBadge>
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{rewrite.clause.title}</h3>
                      <p className="mt-3 max-h-56 overflow-auto text-sm leading-7 text-muted-foreground">{rewrite.rewrittenClause}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No accepted rewrites yet. The email can still be generated from risks, recommendations, and checklist items.</EmptyState>
              )}
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
              <h2 className="text-xl font-semibold text-foreground">Negotiation Checklist</h2>
              {pack?.negotiationChecklist.length ? (
                <div className="mt-4 space-y-3">
                  {pack.negotiationChecklist.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D7E8A5]" aria-hidden="true" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No checklist items were generated from stored records.</EmptyState>
              )}
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl border border-[#D9B76E]/35 bg-[#121817]/95 p-5 shadow-[0_0_36px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9B76E]/15 text-[#F0D89B]">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Counterparty Email</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Rule-based draft</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tone</span>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value as NegotiationEmailTone)}
                    className="h-10 w-full rounded-md border border-[#2C3632] bg-[#0B0F0E] px-3 text-sm text-foreground outline-none transition focus:border-[#D9B76E]/60"
                  >
                    {tones.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[#2C3632] bg-[#151C19] px-3 py-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={includeAcceptedRewrites} onChange={(event) => setIncludeAcceptedRewrites(event.target.checked)} />
                  Include accepted rewrites
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[#2C3632] bg-[#151C19] px-3 py-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={includeRiskSummary} onChange={(event) => setIncludeRiskSummary(event.target.checked)} />
                  Include risk summary
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional instruction</span>
                  <Input
                    value={customInstruction}
                    onChange={(event) => setCustomInstruction(event.target.value)}
                    placeholder="Example: ask for a revised draft by Friday"
                  />
                </label>
                <Button type="button" onClick={generateEmail} disabled={isGeneratingEmail}>
                  {isGeneratingEmail ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-5 w-5" aria-hidden="true" />}
                  Generate Email
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-foreground">Email Preview</h2>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(`Subject: ${email?.subject ?? ""}\n\n${email?.emailBody ?? ""}`, "Email copied.")} disabled={!email}>
                  <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy Email
                </Button>
              </div>
              {email ? (
                <div className="mt-4 rounded-xl border border-[#2C3632] bg-[#0B0F0E]/70 p-4">
                  <p className="text-sm font-semibold text-[#F0D89B]">Subject: {email.subject}</p>
                  <pre className="mt-4 max-h-[520px] whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{email.emailBody}</pre>
                </div>
              ) : (
                <EmptyState>Generate an email to preview counterparty language.</EmptyState>
              )}
              <p className="mt-4 rounded-xl border border-[#D9B76E]/30 bg-[#D9B76E]/10 p-4 text-sm leading-6 text-[#F0D89B]">
                {email?.disclaimer ?? pack?.legalDisclaimer}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
