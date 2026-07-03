"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  Info,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Timer,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/api-client";
import type { DocumentDetail } from "@/types/api";

type BadgeTone = "low" | "medium" | "warning" | "high" | "ai" | "info";

type ClauseCard = {
  title: string;
  status: string;
  summary: string;
  icon: typeof Scale;
  tone: Extract<BadgeTone, "low" | "medium" | "warning" | "high">;
};

type RiskCard = {
  title: string;
  severity: string;
  explanation: string;
  action: string;
};

type RecommendationCard = {
  title: string;
  change: string;
  why: string;
};

type HeatmapCell = {
  label: string;
  value: number;
  tone: "low" | "medium" | "high";
};

const riskCategories = ["Liability", "Privacy", "Termination", "Payment"];

const fallbackHeatmapCells: HeatmapCell[] = [
  { label: "Liability", value: 88, tone: "high" },
  { label: "Privacy", value: 76, tone: "medium" },
  { label: "Termination", value: 72, tone: "medium" },
  { label: "Payment", value: 34, tone: "low" },
  { label: "Indemnity", value: 68, tone: "medium" },
  { label: "Security", value: 79, tone: "medium" },
  { label: "Audit", value: 28, tone: "low" },
  { label: "Notices", value: 61, tone: "medium" }
];

const fallbackKeyClauses: ClauseCard[] = [
  {
    title: "Liability",
    status: "Needs Review",
    summary: "Liability appears uncapped and may expose the business to excessive risk.",
    icon: Scale,
    tone: "warning"
  },
  {
    title: "Data Processing",
    status: "Medium Risk",
    summary: "Processing obligations are present but security responsibilities are not fully defined.",
    icon: LockKeyhole,
    tone: "medium"
  },
  {
    title: "Termination",
    status: "Needs Review",
    summary: "Termination rights are unclear and notice periods should be clarified.",
    icon: Gavel,
    tone: "warning"
  },
  {
    title: "Payment",
    status: "Low Risk",
    summary: "Payment obligations are mostly clear with standard billing language.",
    icon: WalletCards,
    tone: "low"
  }
];

const fallbackDetectedRisks: RiskCard[] = [
  {
    title: "Uncapped liability",
    severity: "High",
    explanation: "The agreement does not clearly limit aggregate exposure for privacy or commercial claims.",
    action: "Negotiate a liability cap tied to fees or an agreed monetary ceiling."
  },
  {
    title: "Ambiguous termination rights",
    severity: "Medium",
    explanation: "Termination triggers and cure periods are not specific enough for operational planning.",
    action: "Define termination for cause, convenience, notice periods, and cure windows."
  },
  {
    title: "Missing security obligations",
    severity: "Medium",
    explanation: "Security controls are referenced generally but ownership and minimum safeguards are incomplete.",
    action: "Add baseline controls, audit evidence, and breach response obligations."
  },
  {
    title: "Limited indemnity protection",
    severity: "Medium",
    explanation: "Indemnity language does not fully cover regulatory claims or third-party privacy losses.",
    action: "Expand indemnity scope for data protection failures and vendor misconduct."
  }
];

const fallbackRecommendations: RecommendationCard[] = [
  {
    title: "Add liability cap",
    change: "Insert a clear aggregate cap and define exceptions deliberately.",
    why: "This limits unexpected financial exposure before the agreement is signed."
  },
  {
    title: "Clarify termination notice period",
    change: "Specify notice windows, cure periods, and termination triggers.",
    why: "Clear exits reduce business disruption if service quality or compliance changes."
  },
  {
    title: "Define security obligations",
    change: "Add minimum safeguards, encryption expectations, and evidence rights.",
    why: "Specific duties make vendor accountability measurable after execution."
  },
  {
    title: "Add breach notification timeline",
    change: "Require notification within a fixed timeframe after discovery.",
    why: "A defined timeline supports regulatory response and customer communication."
  }
];

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function riskLevel(score: number) {
  if (score >= 80) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

function riskToneFromLevel(level: string): Extract<BadgeTone, "low" | "medium" | "high"> {
  const normalized = level.toLowerCase();

  if (normalized.includes("high") || normalized.includes("critical")) {
    return "high";
  }

  if (normalized.includes("low")) {
    return "low";
  }

  return "medium";
}

function clauseIconFor(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("payment") || normalized.includes("fee") || normalized.includes("billing")) {
    return WalletCards;
  }

  if (normalized.includes("termination") || normalized.includes("law") || normalized.includes("dispute")) {
    return Gavel;
  }

  if (normalized.includes("privacy") || normalized.includes("data") || normalized.includes("security")) {
    return LockKeyhole;
  }

  return Scale;
}

function progressFromCount(count: number, max = 10) {
  return Math.min(100, Math.max(8, Math.round((count / max) * 100)));
}

function confidencePercent(value: number) {
  return Math.round(value <= 1 ? value * 100 : value);
}

function averageConfidence(document: DocumentDetail | null) {
  const values = [
    ...(document?.clauseFindings ?? []).map((finding) => finding.confidence),
    ...(document?.riskFindings ?? []).map((finding) => finding.confidence)
  ].filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return 91;
  }

  return confidencePercent(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function processingTime(document: DocumentDetail | null) {
  const startedAt = document?.currentAnalysisJob?.startedAt;
  const completedAt = document?.currentAnalysisJob?.completedAt;

  if (!startedAt || !completedAt) {
    return "30s";
  }

  const seconds = Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  return seconds >= 60 ? `${Math.round(seconds / 60)}m` : `${seconds}s`;
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: BadgeTone }) {
  const tones = {
    low: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]",
    medium: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    warning: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    high: "border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]",
    ai: "border-[#8B5CF6]/45 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    info: "border-[#3B82F6]/45 bg-[#3B82F6]/10 text-[#BFDBFE]"
  };

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return <StatusBadge tone={riskToneFromLevel(severity)}>{severity} severity</StatusBadge>;
}

function SectionHeading({ eyebrow, title, description, id }: { eyebrow: string; title: string; description?: string; id?: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-bold leading-tight text-foreground">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function RiskScoreRing({ score }: { score: number }) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const degrees = Math.round((boundedScore / 100) * 360);

  return (
    <div
      className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full shadow-[0_0_40px_rgba(245,158,11,0.24)] motion-safe:animate-[lexai-risk-fill_900ms_ease-out]"
      style={{ background: `conic-gradient(#F59E0B 0deg ${degrees}deg, rgba(45,55,72,0.8) ${degrees}deg 360deg)` }}
      role="img"
      aria-label={`Risk score ${boundedScore} out of 100`}
    >
      <div className="grid h-[124px] w-[124px] place-items-center rounded-full border border-[#F59E0B]/25 bg-[#161B22]">
        <div className="text-center">
          <p className="text-4xl font-bold leading-none text-foreground">{boundedScore}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">/ 100</p>
        </div>
      </div>
    </div>
  );
}

export default function DemoAnalysisPage() {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const documentId = new URLSearchParams(window.location.search).get("documentId");

    if (!documentId) {
      return () => {
        isMounted = false;
      };
    }

    async function loadDocument() {
      setIsLoading(true);

      try {
        const documentDetail = await safeFetch<DocumentDetail>(`/documents/${documentId}`);

        if (isMounted) {
          setDocument(documentDetail);
          setIsFallback(false);
        }
      } catch {
        if (isMounted) {
          setDocument(null);
          setIsFallback(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, []);

  const riskScore = document?.riskScore ?? 74;
  const riskLabel = riskLevel(riskScore);
  const documentTitle = document?.title ?? "Vendor Data Processing Agreement";
  const documentStatus = document?.status ? titleCase(document.status) : "Analysis complete";
  const summary = document?.summary ?? "Medium risk. Several clauses require review before signing.";
  const executiveSummary =
    document?.summary ??
    "LexAI found moderate contractual risk in this agreement. The main concerns relate to uncapped liability, unclear termination rights, and limited data processing safeguards. The agreement is usable, but should be reviewed before execution.";
  const chatHref = document?.chatSessions[0]?.id ? `/ai-chat?sessionId=${document.chatSessions[0].id}` : "/ai-chat";
  const reportHref = document?.reports[0]?.id ? `/reports/demo-report?reportId=${document.reports[0].id}` : "/reports/demo-report";
  const lastAnalyzed = document?.currentAnalysisJob?.completedAt ?? document?.updatedAt ?? document?.createdAt;
  const activeRiskCategories = useMemo(() => {
    if (!document) {
      return riskCategories;
    }

    const categories = [
      ...document.clauseFindings.map((clause) => clause.category),
      ...document.riskFindings.map((risk) => risk.riskLevel ? `${titleCase(risk.riskLevel)} risk` : risk.title)
    ].filter(Boolean);

    return Array.from(new Set(categories)).slice(0, 4);
  }, [document]);

  const clauseCards = useMemo<ClauseCard[]>(() => {
    if (!document) {
      return fallbackKeyClauses;
    }

    if (document.clauseFindings.length === 0) {
      return [];
    }

    return document.clauseFindings.map((clause) => {
      const confidence = clause.confidence !== null ? confidencePercent(clause.confidence) : null;
      const tone = confidence !== null && confidence < 50 ? "low" : confidence !== null && confidence >= 80 ? "warning" : "medium";

      return {
        title: clause.title || titleCase(clause.category),
        status: confidence !== null ? `${confidence}% confidence` : titleCase(clause.category),
        summary: clause.plainLanguageSummary ?? clause.sourceText ?? "Clause finding returned by the backend for review.",
        icon: clauseIconFor(`${clause.category} ${clause.title}`),
        tone
      };
    });
  }, [document]);

  const riskCards = useMemo<RiskCard[]>(() => {
    if (!document) {
      return fallbackDetectedRisks;
    }

    if (document.riskFindings.length === 0) {
      return [];
    }

    return document.riskFindings.map((risk) => ({
      title: risk.title,
      severity: titleCase(risk.riskLevel),
      explanation: risk.description,
      action: risk.impact ?? risk.evidence ?? "Review this finding with the legal team before execution."
    }));
  }, [document]);

  const recommendationCards = useMemo<RecommendationCard[]>(() => {
    if (!document) {
      return fallbackRecommendations;
    }

    if (document.recommendations.length === 0) {
      return [];
    }

    return document.recommendations.map((recommendation) => ({
      title: recommendation.title,
      change: recommendation.description,
      why: `Priority ${recommendation.priority}. Review and apply this recommendation before signature.`
    }));
  }, [document]);

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    if (!document) {
      return fallbackHeatmapCells;
    }

    const riskCells = document.riskFindings.map((risk) => {
      const tone = riskToneFromLevel(risk.riskLevel);
      const fallbackValue = tone === "high" ? 88 : tone === "low" ? 34 : 68;

      return {
        label: risk.title,
        value: risk.confidence !== null ? confidencePercent(risk.confidence) : fallbackValue,
        tone
      };
    });

    const clauseCells = document.clauseFindings.map((clause) => {
      const value = clause.confidence !== null ? confidencePercent(clause.confidence) : 61;

      return {
        label: clause.category || clause.title,
        value,
        tone: value >= 80 ? "high" : value >= 50 ? "medium" : "low"
      } satisfies HeatmapCell;
    });

    return [...riskCells, ...clauseCells].slice(0, 8);
  }, [document]);

  const processingMetadata = [
    { label: "Clauses scanned", value: String(document ? document.clauseFindings.length : 216), icon: FileText, progress: document ? progressFromCount(document.clauseFindings.length, 8) : 100 },
    { label: "Risks detected", value: String(document ? document.riskFindings.length : 7), icon: AlertTriangle, progress: document ? progressFromCount(document.riskFindings.length, 8) : 70 },
    { label: "Summary generated", value: document ? (document.summary ? "Yes" : "No") : "Yes", icon: Sparkles, progress: document?.summary === null ? 20 : 100 },
    { label: "Confidence", value: `${averageConfidence(document)}%`, icon: ShieldCheck, progress: averageConfidence(document) },
    { label: "Processing time", value: processingTime(document), icon: Timer, progress: 62 },
    { label: "Analysis job", value: document?.currentAnalysisJob?.status ? titleCase(document.currentAnalysisJob.status) : "Complete", icon: Bot, progress: 100 },
    { label: "Report status", value: document?.reports[0]?.status ? titleCase(document.reports[0].status) : "Export ready", icon: BadgeCheck, progress: 100 },
    { label: "Chat sessions", value: String(document ? document.chatSessions.length : 1), icon: MessageSquareText, progress: document ? progressFromCount(document.chatSessions.length, 4) : 100 }
  ];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4 px-0 text-muted-foreground hover:bg-transparent">
            <Link href="/documents" aria-label="Back to documents">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to documents
            </Link>
          </Button>

          <section
            aria-labelledby="document-header-title"
            className="rounded-2xl border border-border bg-[#161B22]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.25)] sm:p-8"
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <StatusBadge tone="ai">
                    {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
                    {isLoading ? "Loading analysis" : documentStatus}
                  </StatusBadge>
                  {isFallback ? <StatusBadge tone="warning">Backend unavailable — showing demo analysis</StatusBadge> : null}
                  <StatusBadge tone="info">{document?.description ?? "Commercial / Privacy"}</StatusBadge>
                  <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-border bg-[#1F2937] px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Last analyzed: {lastAnalyzed ? formatDate(lastAnalyzed) : "Just now"}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">Document</p>
                <h1 id="document-header-title" className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {documentTitle}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                  {summary}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row xl:pt-2">
                <Button asChild className="w-full sm:w-auto">
                  <Link href={chatHref} aria-label={`Open AI Chat for ${documentTitle}`}>
                    <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
                    Open AI Chat
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={reportHref} aria-label="Export analysis report">
                    <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                    Export Report
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section aria-labelledby="risk-overview-title">
              <SectionHeading
                id="risk-overview-title"
                eyebrow="Risk overview"
                title={`${riskLabel} contractual risk`}
                description="LexAI grouped the strongest signals by negotiation priority so legal and business teams can focus on the highest-impact changes first."
              />
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="rounded-2xl border border-[#F59E0B]/35 bg-[#161B22]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.24)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#F59E0B]/60">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <RiskScoreRing score={riskScore} />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge tone={riskToneFromLevel(riskLabel)}>{riskLabel} risk</StatusBadge>
                        <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
                      </div>
                      <p className="mt-4 text-2xl font-bold leading-tight text-foreground">{riskScore} / 100</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {summary}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2" aria-label="Risk categories">
                        {activeRiskCategories.map((category) => (
                          <span key={category} className="rounded-full border border-border bg-[#1F2937] px-3 py-1 text-xs font-medium text-muted-foreground">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-[#161B22]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold leading-tight text-foreground">
                      Risk heatmap
                    </h3>
                    <StatusBadge tone="info">{heatmapCells.length || fallbackHeatmapCells.length} categories</StatusBadge>
                  </div>
                  {heatmapCells.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {heatmapCells.map((cell) => {
                      const toneClass =
                        cell.tone === "high"
                          ? "border-[#EF4444]/45 bg-[#EF4444]/15 text-[#FCA5A5]"
                          : cell.tone === "low"
                            ? "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]"
                            : "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]";

                      return (
                        <div key={cell.label} className={`min-h-24 rounded-xl border p-3 ${toneClass}`}>
                          <p className="text-xs font-medium text-current">{cell.label}</p>
                          <p className="mt-4 text-2xl font-bold leading-none text-foreground">{cell.value}</p>
                          <p className="mt-1 text-xs font-medium text-current">{cell.tone} signal</p>
                        </div>
                      );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-[#1F2937] p-4 text-sm leading-6 text-muted-foreground">
                      Backend document loaded, but no clause or risk signals have been recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="summary-title">
              <SectionHeading eyebrow="Executive summary" title="Generated legal intelligence" />
              <div className="rounded-2xl border border-[#8B5CF6]/40 bg-[#161B22]/95 p-6 shadow-[0_0_44px_rgba(139,92,246,0.14),0_16px_48px_rgba(0,0,0,0.22)] sm:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD] shadow-[0_0_28px_rgba(139,92,246,0.2)]">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="summary-title" className="text-xl font-semibold leading-tight text-foreground">
                      Executive Summary
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Generated by LexAI Intelligence</p>
                  </div>
                </div>
                <p className="max-w-5xl text-base leading-8 text-muted-foreground">
                  {executiveSummary}
                </p>
              </div>
            </section>

            <section aria-labelledby="key-clauses-title">
              <SectionHeading
                id="key-clauses-title"
                eyebrow="Key clauses"
                title="Clauses requiring business review"
                description="Each clause card highlights the issue, risk state, and the next review action."
              />
              {clauseCards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {clauseCards.map((clause) => {
                  const Icon = clause.icon;

                  return (
                    <article
                      key={clause.title}
                      className="group rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.24)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2937] text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <StatusBadge tone={clause.tone}>{clause.status}</StatusBadge>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold leading-tight text-foreground">{clause.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{clause.summary}</p>
                      <button
                        type="button"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition duration-150 ease-out hover:text-[#93C5FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label={`Review ${clause.title} clause`}
                      >
                        Review clause
                        <ArrowRight className="h-4 w-4 transition duration-150 ease-out group-hover:translate-x-1" aria-hidden="true" />
                      </button>
                    </article>
                  );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-[#161B22]/95 p-5 text-sm leading-6 text-muted-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  Backend document loaded, but no clause findings have been recorded yet.
                </div>
              )}
            </section>

            <section aria-labelledby="risks-title">
              <SectionHeading
                id="risks-title"
                eyebrow="Risks detected"
                title="Prioritized negotiation risks"
                description="High and medium severity risks are ordered by likely contract impact."
              />
              {riskCards.length > 0 ? (
                <div className="space-y-4">
                  {riskCards.map((risk) => (
                  <article
                    key={risk.title}
                    className="rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#EF4444]/45"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold leading-tight text-foreground">{risk.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.explanation}</p>
                      </div>
                      <SeverityBadge severity={risk.severity} />
                    </div>
                    <div className="mt-4 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#BFDBFE]">Recommended action</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{risk.action}</p>
                    </div>
                  </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-[#161B22]/95 p-5 text-sm leading-6 text-muted-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  Backend document loaded, but no risk findings have been recorded yet.
                </div>
              )}
            </section>

            <section aria-labelledby="recommendations-title">
              <SectionHeading
                id="recommendations-title"
                eyebrow="Recommendations"
                title="Recommended redlines"
                description="Action-oriented changes LexAI would raise before execution."
              />
              {recommendationCards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendationCards.map((recommendation) => (
                  <article
                    key={recommendation.title}
                    className="rounded-2xl border border-[#22C55E]/25 bg-[#161B22]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#22C55E]/45"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22C55E]/10 text-[#86EFAC]">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold leading-tight text-foreground">{recommendation.title}</h3>
                        <p className="mt-3 text-sm font-semibold text-[#CBD5E1]">What to change</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{recommendation.change}</p>
                        <p className="mt-3 text-sm font-semibold text-[#CBD5E1]">Why it matters</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{recommendation.why}</p>
                      </div>
                    </div>
                  </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-[#161B22]/95 p-5 text-sm leading-6 text-muted-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  Backend document loaded, but no recommendations have been recorded yet.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Analysis actions and processing metadata">
            <section className="rounded-2xl border border-[#8B5CF6]/35 bg-[#161B22]/95 p-6 shadow-[0_0_36px_rgba(139,92,246,0.12),0_16px_48px_rgba(0,0,0,0.24)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD]">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight text-foreground">Action panel</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Next best move</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-4">
                <p className="text-sm font-semibold text-[#C4B5FD]">Ask LexAI</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">What should I negotiate first?</p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Button asChild className="w-full">
                  <Link href={chatHref} aria-label="Open AI Chat from action panel">
                    <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
                    Open AI Chat
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={reportHref} aria-label="Export report from action panel">
                    <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                    Export Report
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/upload" aria-label="Upload another document">
                    <RefreshCw className="mr-2 h-5 w-5" aria-hidden="true" />
                    Upload another document
                  </Link>
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-[#161B22]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">AI confidence</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">Processing metadata</h2>
                </div>
                <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="space-y-4">
                {processingMetadata.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <p className="truncate text-sm text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#1F2937]" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#22C55E]/25 bg-[#22C55E]/10 p-5">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[#86EFAC]" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold leading-tight text-foreground">Report status</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {document?.reports[0]?.title
                      ? `${document.reports[0].title} is linked with summary, clause findings, risks, and recommended negotiation actions.`
                      : "Export ready with summary, clause findings, risks, and recommended negotiation actions."}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <p className="mt-8 rounded-2xl border border-border bg-[#161B22]/70 px-5 py-4 text-sm leading-6 text-muted-foreground">
          LexAI provides AI-generated document intelligence and does not replace professional legal advice.
        </p>
      </div>
    </DashboardShell>
  );
}
