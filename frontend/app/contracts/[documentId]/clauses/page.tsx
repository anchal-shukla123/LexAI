"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Copy,
  FileText,
  Gavel,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
  Wand2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJson, safeFetch } from "@/lib/api-client";
import type { ClauseReviewItem, ClauseReviewResponse, ClauseRewriteGoal, ClauseRewriteHistoryResponse, ClauseRewriteResponse, ClauseRewriteStatus, DocumentDetail } from "@/types/api";

type BadgeTone = "low" | "medium" | "high" | "info" | "success" | "warning";

const categoryFilters = ["LIABILITY", "TERMINATION", "PAYMENT", "CONFIDENTIALITY", "DATA_PROTECTION", "SECURITY"];
const riskFilters = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const rewriteGoals: Array<{ value: ClauseRewriteGoal; label: string }> = [
  { value: "balanced", label: "Balanced" },
  { value: "buyer_friendly", label: "Buyer friendly" },
  { value: "seller_friendly", label: "Seller friendly" },
  { value: "shorter", label: "Shorter" },
  { value: "stronger_protection", label: "Stronger protection" }
];

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function confidencePercent(value: number) {
  return Math.round(value <= 1 ? value * 100 : value);
}

function riskTone(level?: string | null): BadgeTone {
  if (!level) return "success";
  if (level === "CRITICAL" || level === "HIGH") return "high";
  if (level === "LOW") return "low";
  return "medium";
}

function statusLabel(status: string) {
  if (status === "NO_MAJOR_RISK_DETECTED") return "No major risk detected";
  if (status === "NEEDS_NEGOTIATION") return "Needs negotiation";
  if (status === "FALLBACK_REVIEW") return "Fallback review";
  return "Review recommended";
}

function rewriteStatusTone(status?: ClauseRewriteStatus): BadgeTone {
  if (status === "ACCEPTED") return "success";
  if (status === "REJECTED") return "high";
  if (status === "SAVED") return "info";
  return "warning";
}

function clauseIconFor(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("payment") || normalized.includes("fee") || normalized.includes("billing")) return WalletCards;
  if (normalized.includes("termination") || normalized.includes("law") || normalized.includes("dispute")) return Gavel;
  if (normalized.includes("privacy") || normalized.includes("data") || normalized.includes("security") || normalized.includes("confidential")) return LockKeyhole;
  return Scale;
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) {
  const tones = {
    low: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    medium: "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]",
    high: "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]",
    info: "border-[#6BAA9C]/45 bg-[#6BAA9C]/10 text-[#9BCBC2]",
    success: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    warning: "border-[#D9B76E]/45 bg-[#D9B76E]/10 text-[#F0D89B]"
  };

  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function filterQuery(filters: {
  category: string;
  riskLevel: string;
  extractionMethod: string;
  hasRisks: string;
  search: string;
}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.riskLevel) params.set("riskLevel", filters.riskLevel);
  if (filters.extractionMethod) params.set("extractionMethod", filters.extractionMethod);
  if (filters.hasRisks) params.set("hasRisks", filters.hasRisks);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  const value = params.toString();
  return value ? `?${value}` : "";
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

export default function ClauseReviewPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [review, setReview] = useState<ClauseReviewResponse | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [rewriteGoal, setRewriteGoal] = useState<ClauseRewriteGoal>("balanced");
  const [userInstruction, setUserInstruction] = useState("");
  const [rewriteResult, setRewriteResult] = useState<ClauseRewriteResponse | null>(null);
  const [rewriteHistory, setRewriteHistory] = useState<ClauseRewriteResponse[]>([]);
  const [isLoadingRewrites, setIsLoadingRewrites] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [activeRewriteId, setActiveRewriteId] = useState<string | null>(null);
  const [statusUpdateId, setStatusUpdateId] = useState<string | null>(null);
  const [rewriteError, setRewriteError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const autoRewriteStartedRef = useRef(false);
  const [filters, setFilters] = useState({
    category: "",
    riskLevel: "",
    extractionMethod: "",
    hasRisks: "",
    search: ""
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadReview() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [documentDetail, clauseReview] = await Promise.all([
          safeFetch<DocumentDetail>(`/documents/${documentId}`, { signal: controller.signal }),
          safeFetch<ClauseReviewResponse>(`/documents/${documentId}/clause-review${filterQuery(filters)}`, {
            signal: controller.signal
          })
        ]);

        if (isMounted) {
          setDocument(documentDetail);
          setReview(clauseReview);
          setSelectedClauseId((current) => {
            if (current && clauseReview.items.some((item) => item.id === current)) return current;
            const requestedClauseId = new URLSearchParams(window.location.search).get("clauseId");
            if (requestedClauseId && clauseReview.items.some((item) => item.id === requestedClauseId)) return requestedClauseId;
            return clauseReview.items[0]?.id ?? null;
          });
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load clause review workspace.");
          setDocument(null);
          setReview(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadReview();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [documentId, filters, retryCount]);

  const clauses = useMemo(() => review?.items ?? [], [review]);
  const selectedClause = useMemo<ClauseReviewItem | null>(() => clauses.find((clause) => clause.id === selectedClauseId) ?? clauses[0] ?? null, [clauses, selectedClauseId]);
  const chatHref = `/ai-chat?documentId=${documentId}`;
  const analysisHref = `/contracts/demo-analysis?documentId=${documentId}`;
  const reportHref = document?.reports[0]?.id ? `/reports/demo-report?reportId=${document.reports[0].id}` : "/reports/demo-report";
  const canRewriteSelectedClause = selectedClause ? selectedClause.extractionMethod !== "MOCK" : false;
  const visibleRewriteResult =
    (activeRewriteId ? rewriteHistory.find((rewrite) => rewrite.id === activeRewriteId) : null) ??
    (rewriteResult?.originalClause.id === selectedClause?.id ? rewriteResult : null) ??
    rewriteHistory[0] ??
    null;

  useEffect(() => {
    if (!selectedClause) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const clauseId = selectedClause.id;

    async function loadRewriteHistory() {
      setIsLoadingRewrites(true);
      setRewriteError("");

      try {
        const result = await safeFetch<ClauseRewriteHistoryResponse>(`/documents/${documentId}/clauses/${clauseId}/rewrites`, {
          signal: controller.signal
        });

        if (isMounted) {
          setRewriteHistory(result.rewrites);
          setActiveRewriteId((current) => {
            if (current && result.rewrites.some((rewrite) => rewrite.id === current)) return current;
            return result.rewrites[0]?.id ?? null;
          });
        }
      } catch (error) {
        if (isMounted) {
          setRewriteHistory([]);
          setActiveRewriteId(null);
          setRewriteError(error instanceof Error ? error.message : "Unable to load rewrite history.");
        }
      } finally {
        if (isMounted) setIsLoadingRewrites(false);
      }
    }

    void loadRewriteHistory();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [documentId, selectedClause]);

  useEffect(() => {
    if (!selectedClause || autoRewriteStartedRef.current || isLoading || isLoadingRewrites || !canRewriteSelectedClause || rewriteHistory.length > 0) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("rewrite") !== "true" || params.get("clauseId") !== selectedClause.id) {
      return;
    }

    const clauseForRoute = selectedClause;
    autoRewriteStartedRef.current = true;

    async function createRewriteFromRoute() {
      setIsRewriting(true);
      setRewriteError("");
      setCopyMessage("");
      try {
        const result = await postJson<ClauseRewriteResponse>(`/documents/${documentId}/clauses/${clauseForRoute.id}/rewrite`, {
          goal: rewriteGoal,
          userInstruction: userInstruction.trim() || undefined,
          save: true
        });
        setRewriteResult(result);
        setRewriteHistory((current) => [result, ...current.filter((rewrite) => rewrite.id !== result.id)]);
        setActiveRewriteId(result.id);
      } catch (error) {
        setRewriteError(error instanceof Error ? error.message : "Unable to rewrite this clause.");
        setRewriteResult(null);
      } finally {
        setIsRewriting(false);
      }
    }

    void createRewriteFromRoute();
  }, [canRewriteSelectedClause, documentId, isLoading, isLoadingRewrites, rewriteGoal, rewriteHistory.length, selectedClause, userInstruction]);

  function selectClause(clauseId: string) {
    setSelectedClauseId(clauseId);
    setRewriteResult(null);
    setActiveRewriteId(null);
    setRewriteError("");
    setCopyMessage("");
  }

  async function rewriteSelectedClause() {
    if (!selectedClause || !canRewriteSelectedClause) return;

    setIsRewriting(true);
    setRewriteError("");
    setCopyMessage("");

    try {
      const result = await postJson<ClauseRewriteResponse>(`/documents/${documentId}/clauses/${selectedClause.id}/rewrite`, {
        goal: rewriteGoal,
        userInstruction: userInstruction.trim() || undefined,
        save: true
      });
      setRewriteResult(result);
      setRewriteHistory((current) => [result, ...current.filter((rewrite) => rewrite.id !== result.id)]);
      setActiveRewriteId(result.id);
    } catch (error) {
      setRewriteError(error instanceof Error ? error.message : "Unable to rewrite this clause.");
      setRewriteResult(null);
    } finally {
      setIsRewriting(false);
    }
  }

  async function copyRewrittenClause() {
    await copyClauseText("rewritten");
  }

  async function copyClauseText(kind: "original" | "rewritten") {
    if (!visibleRewriteResult) return;

    try {
      await window.navigator.clipboard.writeText(kind === "original" ? visibleRewriteResult.originalClause.text : visibleRewriteResult.rewrittenClause);
      setCopyMessage(kind === "original" ? "Original clause copied." : "Rewritten clause copied.");
    } catch {
      setCopyMessage("Copy failed. Select the clause text and copy it manually.");
    }

    window.setTimeout(() => setCopyMessage(""), 2600);
  }

  async function updateRewriteStatus(status: ClauseRewriteStatus) {
    if (!visibleRewriteResult?.id) return;

    setStatusUpdateId(visibleRewriteResult.id);
    setRewriteError("");

    try {
      const result = await safeFetch<ClauseRewriteResponse>(`/clause-rewrites/${visibleRewriteResult.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      setRewriteResult(result);
      setRewriteHistory((current) => current.map((rewrite) => (rewrite.id === result.id ? result : rewrite)));
      setActiveRewriteId(result.id);
    } catch (error) {
      setRewriteError(error instanceof Error ? error.message : "Unable to update rewrite status.");
    } finally {
      setStatusUpdateId(null);
    }
  }

  async function deleteDraftRewrite() {
    if (!visibleRewriteResult?.id) return;

    setStatusUpdateId(visibleRewriteResult.id);
    setRewriteError("");

    try {
      await safeFetch<{ id: string; deleted: boolean }>(`/clause-rewrites/${visibleRewriteResult.id}`, {
        method: "DELETE"
      });
      setRewriteHistory((current) => current.filter((rewrite) => rewrite.id !== visibleRewriteResult.id));
      setRewriteResult(null);
      setActiveRewriteId(rewriteHistory.find((rewrite) => rewrite.id !== visibleRewriteResult.id)?.id ?? null);
    } catch (error) {
      setRewriteError(error instanceof Error ? error.message : "Unable to delete draft rewrite.");
    } finally {
      setStatusUpdateId(null);
    }
  }

  if (isLoading && !review) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D9B76E]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Loading clause workspace</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Fetching extracted clauses, linked risks, and recommendations.</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (loadError) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#D66A5E]/40 bg-[#121817]/95 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-[#E89A92]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Could not load clause review</h1>
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

        <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge tone="info">Clause review</StatusBadge>
                <StatusBadge tone={review?.items.some((item) => item.extractionMethod === "MOCK") ? "warning" : "success"}>
                  {review?.items.some((item) => item.extractionMethod === "MOCK") ? "MOCK fallback present" : "Rule-based real analysis"}
                </StatusBadge>
                <StatusBadge tone="info">{clauses.length} clauses</StatusBadge>
              </div>
              <h1 className="text-3xl font-bold leading-tight text-foreground">{document?.title ?? "Clause Review Workspace"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Inspect each extracted clause with linked risks, recommendations, evidence previews, and negotiation guidance.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href={chatHref}>
                  <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
                  Ask AI
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={reportHref}>
                  <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                  Open report
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#2C3632] bg-[#121817]/80 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search clauses, evidence, risks..."
                className="pl-9"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFilters({ category: "", riskLevel: "", extractionMethod: "", hasRisks: "", search: "" })}
            >
              Clear filters
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryFilters.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, category: current.category === category ? "" : category }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filters.category === category ? "border-[#D9B76E]/50 bg-[#D9B76E]/15 text-[#F0D89B]" : "border-[#2C3632] bg-[#151C19] text-muted-foreground hover:text-foreground"}`}
              >
                {titleCase(category)}
              </button>
            ))}
            {riskFilters.map((risk) => (
              <button
                key={risk}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, riskLevel: current.riskLevel === risk ? "" : risk }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filters.riskLevel === risk ? "border-[#D66A5E]/50 bg-[#D66A5E]/15 text-[#E89A92]" : "border-[#2C3632] bg-[#151C19] text-muted-foreground hover:text-foreground"}`}
              >
                {titleCase(risk)} risk
              </button>
            ))}
            {["RULE_BASED", "MOCK"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, extractionMethod: current.extractionMethod === method ? "" : method }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filters.extractionMethod === method ? "border-[#6BAA9C]/50 bg-[#6BAA9C]/15 text-[#9BCBC2]" : "border-[#2C3632] bg-[#151C19] text-muted-foreground hover:text-foreground"}`}
              >
                {method}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters((current) => ({ ...current, hasRisks: current.hasRisks === "true" ? "" : "true" }))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filters.hasRisks === "true" ? "border-[#D9B76E]/50 bg-[#D9B76E]/15 text-[#F0D89B]" : "border-[#2C3632] bg-[#151C19] text-muted-foreground hover:text-foreground"}`}
            >
              Has risks
            </button>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.2)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-auto">
            {clauses.length > 0 ? (
              <div className="space-y-2">
                {clauses.map((clause) => {
                  const Icon = clauseIconFor(`${clause.category} ${clause.title}`);
                  const selected = selectedClause?.id === clause.id;

                  return (
                    <button
                      key={clause.id}
                      type="button"
                      onClick={() => selectClause(clause.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-[#D9B76E]/50 bg-[#D9B76E]/10" : "border-[#2C3632] bg-[#151C19]/70 hover:border-[#6BAA9C]/40"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6BAA9C]/10 text-[#9BCBC2]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{clause.title}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">{titleCase(clause.category)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusBadge tone={riskTone(clause.riskLevel)}>{clause.riskLevel ? `${titleCase(clause.riskLevel)} risk` : "No major risk"}</StatusBadge>
                            <StatusBadge tone={clause.extractionMethod === "MOCK" ? "warning" : "info"}>{clause.extractionMethod}</StatusBadge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No clauses match the current filters for this real document." />
            )}
          </aside>

          <main>
            {selectedClause ? (
              <article className="space-y-6">
                <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <StatusBadge tone={riskTone(selectedClause.riskLevel)}>{selectedClause.riskLevel ? `${titleCase(selectedClause.riskLevel)} risk` : "No major risk detected"}</StatusBadge>
                        <StatusBadge tone={selectedClause.extractionMethod === "MOCK" ? "warning" : "info"}>{selectedClause.extractionMethod}</StatusBadge>
                        <StatusBadge tone="info">{confidencePercent(selectedClause.confidence)}% confidence</StatusBadge>
                      </div>
                      <h2 className="text-3xl font-bold leading-tight text-foreground">{selectedClause.title}</h2>
                      <p className="mt-2 text-sm font-medium text-muted-foreground">{titleCase(selectedClause.category)} clause</p>
                    </div>
                    <StatusBadge tone={selectedClause.negotiationStatus === "NEEDS_NEGOTIATION" ? "high" : selectedClause.negotiationStatus === "NO_MAJOR_RISK_DETECTED" ? "success" : "medium"}>
                      {statusLabel(selectedClause.negotiationStatus)}
                    </StatusBadge>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#D7E8A5]" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-foreground">What This Means</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedClause.plainLanguageSummary}</p>
                  </div>
                  <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-[#9BCBC2]" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-foreground">Why It Matters</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {selectedClause.linkedRisks[0]?.impact ??
                        (selectedClause.linkedRisks.length > 0
                          ? "This clause is connected to detected risks and should be reviewed before execution."
                          : "No linked risk finding was detected for this clause, but the source language should still be checked for business fit.")}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                  <h3 className="text-lg font-semibold text-foreground">Evidence Preview</h3>
                  <p className="mt-3 rounded-xl border border-[#2C3632] bg-[#0B0F0E]/70 p-4 text-sm leading-7 text-muted-foreground">{selectedClause.evidencePreview}</p>
                </section>

                <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                  <h3 className="text-lg font-semibold text-foreground">Linked Risks</h3>
                  {selectedClause.linkedRisks.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {selectedClause.linkedRisks.map((risk) => (
                        <div key={risk.id} className="rounded-xl border border-[#D66A5E]/25 bg-[#D66A5E]/10 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="text-base font-semibold text-foreground">{risk.title}</h4>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.description}</p>
                            </div>
                            <StatusBadge tone={riskTone(risk.riskLevel)}>{titleCase(risk.riskLevel)} risk</StatusBadge>
                          </div>
                          {risk.evidence ? <p className="mt-3 text-sm leading-6 text-muted-foreground">Evidence: {risk.evidence}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No major risk detected for this clause." />
                  )}
                </section>

                <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                  <h3 className="text-lg font-semibold text-foreground">Suggested Negotiation Action</h3>
                  {selectedClause.linkedRecommendations.length > 0 || selectedClause.linkedRisks.some((risk) => risk.recommendationHint) ? (
                    <div className="mt-4 grid gap-3">
                      {selectedClause.linkedRecommendations.map((recommendation) => (
                        <div key={recommendation.id} className="rounded-xl border border-[#A7C957]/25 bg-[#A7C957]/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D7E8A5]">Priority {recommendation.priority}</p>
                          <h4 className="mt-2 text-base font-semibold text-foreground">{recommendation.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.description}</p>
                        </div>
                      ))}
                      {selectedClause.linkedRecommendations.length === 0
                        ? selectedClause.linkedRisks
                            .filter((risk) => risk.recommendationHint)
                            .map((risk) => (
                              <div key={risk.id} className="rounded-xl border border-[#A7C957]/25 bg-[#A7C957]/10 p-4">
                                <h4 className="text-base font-semibold text-foreground">{risk.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.recommendationHint}</p>
                              </div>
                            ))
                        : null}
                    </div>
                  ) : (
                    <EmptyState message="No specific negotiation action was generated for this clause." />
                  )}
                </section>

                <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <Wand2 className="h-5 w-5 text-[#F0D89B]" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-foreground">Clause Rewrite</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Generate deterministic rewrite language from this real clause, linked risks, and recommendations.
                      </p>
                    </div>
                    <StatusBadge tone={canRewriteSelectedClause ? "info" : "warning"}>
                      {canRewriteSelectedClause ? "Rule-based rewrite" : "Real clauses only"}
                    </StatusBadge>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Rewrite goal</span>
                      <select
                        value={rewriteGoal}
                        onChange={(event) => setRewriteGoal(event.target.value as ClauseRewriteGoal)}
                        className="h-10 w-full rounded-md border border-[#2C3632] bg-[#0B0F0E] px-3 text-sm text-foreground outline-none transition focus:border-[#D9B76E]/60"
                        disabled={!canRewriteSelectedClause || isRewriting}
                      >
                        {rewriteGoals.map((goal) => (
                          <option key={goal.value} value={goal.value}>
                            {goal.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional instruction</span>
                      <Input
                        value={userInstruction}
                        onChange={(event) => setUserInstruction(event.target.value)}
                        placeholder="Example: preserve payment timing but add a dispute process"
                        disabled={!canRewriteSelectedClause || isRewriting}
                      />
                    </label>
                    <div className="flex items-end">
                      <Button type="button" onClick={rewriteSelectedClause} disabled={!canRewriteSelectedClause || isRewriting} className="w-full lg:w-auto">
                        {isRewriting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Wand2 className="mr-2 h-5 w-5" aria-hidden="true" />}
                        {isRewriting ? "Rewriting" : "Rewrite Clause"}
                      </Button>
                    </div>
                  </div>

                  {!canRewriteSelectedClause ? (
                    <div className="mt-4 rounded-xl border border-[#D9B76E]/35 bg-[#D9B76E]/10 p-4 text-sm leading-6 text-[#F0D89B]">
                      Rewrite is disabled for fallback MOCK clauses so real document workspaces never show demo rewrite content.
                    </div>
                  ) : null}

                  {rewriteError ? (
                    <div className="mt-4 rounded-xl border border-[#D66A5E]/40 bg-[#D66A5E]/10 p-4 text-sm leading-6 text-[#E89A92]" role="alert">
                      {rewriteError}
                    </div>
                  ) : null}

                  {visibleRewriteResult ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-xl border border-[#2C3632] bg-[#151C19]/70 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">Latest Rewrite</h4>
                              <StatusBadge tone={rewriteStatusTone(visibleRewriteResult.status)}>{titleCase(visibleRewriteResult.status)}</StatusBadge>
                              <StatusBadge tone="info">{titleCase(String(visibleRewriteResult.goal))}</StatusBadge>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                              Created {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(visibleRewriteResult.createdAt))}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => updateRewriteStatus("SAVED")} disabled={!visibleRewriteResult.id || statusUpdateId === visibleRewriteResult.id}>
                              Save
                            </Button>
                            <Button type="button" size="sm" onClick={() => updateRewriteStatus("ACCEPTED")} disabled={!visibleRewriteResult.id || statusUpdateId === visibleRewriteResult.id}>
                              Mark Accepted
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => updateRewriteStatus("REJECTED")} disabled={!visibleRewriteResult.id || statusUpdateId === visibleRewriteResult.id}>
                              Reject
                            </Button>
                            {visibleRewriteResult.status === "DRAFT" ? (
                              <Button type="button" size="sm" variant="ghost" onClick={deleteDraftRewrite} disabled={!visibleRewriteResult.id || statusUpdateId === visibleRewriteResult.id} aria-label="Delete draft rewrite">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-[#2C3632] bg-[#0B0F0E]/70 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <h4 className="text-sm font-semibold text-foreground">Original Clause</h4>
                            <Button type="button" size="sm" variant="outline" onClick={() => copyClauseText("original")}>
                              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                              Copy
                            </Button>
                          </div>
                          <p className="mt-3 max-h-80 overflow-auto text-sm leading-7 text-muted-foreground">{visibleRewriteResult.originalClause.text}</p>
                        </div>
                        <div className="rounded-xl border border-[#A7C957]/30 bg-[#A7C957]/10 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <h4 className="text-sm font-semibold text-foreground">Rewritten Clause</h4>
                            <Button type="button" size="sm" variant="outline" onClick={copyRewrittenClause}>
                              <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />
                              Copy
                            </Button>
                          </div>
                          <p className="mt-3 max-h-80 overflow-auto text-sm leading-7 text-muted-foreground">{visibleRewriteResult.rewrittenClause}</p>
                          {copyMessage ? <p className="mt-3 text-sm font-medium text-[#D7E8A5]" role="status">{copyMessage}</p> : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#2C3632] bg-[#151C19]/70 p-4">
                        <h4 className="text-sm font-semibold text-foreground">What Changed and Why</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{visibleRewriteResult.rewriteStrategy}</p>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-[#2C3632] bg-[#151C19]/70 p-4">
                          <h4 className="text-sm font-semibold text-foreground">Key Changes</h4>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            {visibleRewriteResult.keyChanges.map((change) => (
                              <li key={change}>- {change}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-[#2C3632] bg-[#151C19]/70 p-4">
                          <h4 className="text-sm font-semibold text-foreground">Negotiation Points</h4>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            {visibleRewriteResult.negotiationPoints.map((point) => (
                              <li key={point}>- {point}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl border border-[#2C3632] bg-[#151C19]/70 p-4">
                          <h4 className="text-sm font-semibold text-foreground">Risk Reduction</h4>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            {visibleRewriteResult.riskReductionNotes.map((note) => (
                              <li key={note}>- {note}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <p className="rounded-xl border border-[#D9B76E]/30 bg-[#D9B76E]/10 p-4 text-sm leading-6 text-[#F0D89B]">{visibleRewriteResult.disclaimer}</p>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-xl border border-[#2C3632] bg-[#0B0F0E]/55 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Rewrite History</h4>
                      {isLoadingRewrites ? <StatusBadge tone="info">Loading</StatusBadge> : <StatusBadge tone="info">{rewriteHistory.length} saved</StatusBadge>}
                    </div>
                    {rewriteHistory.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {rewriteHistory.map((rewrite) => (
                          <button
                            key={rewrite.id ?? `${rewrite.createdAt}-${rewrite.goal}`}
                            type="button"
                            onClick={() => setActiveRewriteId(rewrite.id)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition ${visibleRewriteResult?.id === rewrite.id ? "border-[#D9B76E]/45 bg-[#D9B76E]/10" : "border-[#2C3632] bg-[#151C19]/80 hover:border-[#6BAA9C]/40"}`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-sm font-medium text-foreground">{titleCase(String(rewrite.goal))}</span>
                              <span className="flex flex-wrap gap-2">
                                <StatusBadge tone={rewriteStatusTone(rewrite.status)}>{titleCase(rewrite.status)}</StatusBadge>
                                <span className="text-xs leading-7 text-muted-foreground">
                                  {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(rewrite.createdAt))}
                                </span>
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        No rewrite history yet. Generate a rewrite to save a draft for this clause.
                      </p>
                    )}
                  </div>
                </section>
              </article>
            ) : (
              <EmptyState message="Select a clause to review its risks, recommendations, and evidence." />
            )}
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
