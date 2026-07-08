"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  Info,
  Link2,
  LockKeyhole,
  MessageSquareText,
  Scale,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Timer,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { downloadBlob, postJson, safeFetch, safeFetchPaginated } from "@/lib/api-client";
import type { ExportJobDetail, ReportDetail, ReportListItem } from "@/types/api";

type ReportContent = {
  executiveSummary?: string;
  riskScore?: number;
  riskLevel?: string;
  riskScoreExplanation?: string;
  sourceType?: string;
  fallbackUsed?: boolean;
  metrics?: {
    clausesScanned?: number;
    risksDetected?: number;
    confidence?: number;
    processingTime?: string;
  };
  heatmap?: Array<{ label: string; value: number; signal: string }>;
  findings?: Array<{ title: string; severity: string; finding: string; action: string }>;
  topRisks?: Array<{ title: string; severity: string; finding: string; action: string; detectionMethod?: string; ruleId?: string | null; linkedClauseTitle?: string | null }>;
  affectedClauses?: Array<{ title: string; category: string; summary?: string; excerpt?: string; confidence?: number; extractionMethod?: string; linkedRiskTitles?: string[] }>;
  recommendedActions?: Array<{ title: string; description: string; priority: number; linkedRiskTitle?: string | null; linkedClauseTitle?: string | null }>;
  recommendedRedlines?: Array<{ title: string; change: string; why: string; priority: string; linkedRiskTitle?: string | null; linkedClauseTitle?: string | null }>;
  negotiationChecklist?: string[];
  legalDisclaimer?: string;
};

const fallbackHeatmapCells = [
  { label: "Liability", value: 88, signal: "high" },
  { label: "Privacy", value: 76, signal: "medium" },
  { label: "Termination", value: 72, signal: "medium" },
  { label: "Payment", value: 34, signal: "low" },
  { label: "Security", value: 79, signal: "medium" },
  { label: "Audit", value: 28, signal: "low" }
];

const fallbackFindings = [
  {
    title: "Uncapped liability",
    severity: "High",
    finding: "The agreement does not clearly limit aggregate exposure for privacy or commercial claims.",
    action: "Negotiate a liability cap tied to fees or an agreed monetary ceiling."
  },
  {
    title: "Ambiguous termination rights",
    severity: "Medium",
    finding: "Termination triggers and cure periods are not specific enough for operational planning.",
    action: "Define termination for cause, convenience, notice periods, and cure windows."
  },
  {
    title: "Missing security obligations",
    severity: "Medium",
    finding: "Security controls are referenced generally but ownership and minimum safeguards are incomplete.",
    action: "Add baseline controls, audit evidence, and breach response obligations."
  },
  {
    title: "Limited indemnity protection",
    severity: "Medium",
    finding: "Indemnity language does not fully cover regulatory claims or third-party privacy losses.",
    action: "Expand indemnity scope for data protection failures and vendor misconduct."
  }
];

const clauses = [
  {
    title: "Liability",
    status: "Needs Review",
    risk: "High",
    summary: "Liability appears uncapped and may expose the business to excessive risk.",
    icon: Scale
  },
  {
    title: "Data Processing",
    status: "Medium Risk",
    risk: "Medium",
    summary: "Processing obligations are present but security responsibilities are not fully defined.",
    icon: LockKeyhole
  },
  {
    title: "Termination",
    status: "Needs Review",
    risk: "Medium",
    summary: "Termination rights are unclear and notice periods should be clarified.",
    icon: Gavel
  },
  {
    title: "Payment",
    status: "Low Risk",
    risk: "Low",
    summary: "Payment obligations are mostly clear with standard billing language.",
    icon: WalletCards
  }
];

const fallbackRedlines = [
  {
    title: "Add liability cap",
    change: "Insert a clear aggregate cap tied to fees or a negotiated monetary ceiling.",
    why: "It limits unexpected financial exposure before the agreement is signed.",
    priority: "High"
  },
  {
    title: "Clarify termination notice period",
    change: "Specify notice windows, cure periods, and termination triggers.",
    why: "Clear exits reduce operational ambiguity if service quality or compliance changes.",
    priority: "Medium"
  },
  {
    title: "Define security obligations",
    change: "Add minimum safeguards, encryption expectations, audit evidence, and ownership.",
    why: "Specific duties make vendor accountability measurable after execution.",
    priority: "Medium"
  },
  {
    title: "Add breach notification timeline",
    change: "Require notification within a fixed timeframe after discovery.",
    why: "A defined timeline supports regulatory response and customer communication.",
    priority: "Medium"
  }
];

function Badge({ children, tone }: { children: React.ReactNode; tone: "low" | "medium" | "high" | "ai" | "info" | "success" }) {
  const tones = {
    low: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    medium: "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]",
    high: "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]",
    ai: "border-[#D9B76E]/45 bg-[#D9B76E]/10 text-[#F0D89B]",
    info: "border-[#6BAA9C]/45 bg-[#6BAA9C]/10 text-[#9BCBC2]",
    success: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]"
  };

  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function riskTone(risk: string) {
  if (risk === "High" || risk === "Critical") {
    return "high";
  }

  if (risk === "Low") {
    return "low";
  }

  return "medium";
}

function isReportContent(value: unknown): value is ReportContent {
  return typeof value === "object" && value !== null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function SectionHeading({ eyebrow, title, description, id }: { eyebrow: string; title: string; description?: string; id: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-bold leading-tight text-foreground">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function RiskScoreRing({ score = 74 }: { score?: number }) {
  const boundedScore = Math.max(0, Math.min(100, score));
  const degrees = Math.round((boundedScore / 100) * 360);

  return (
    <div
      className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full shadow-[0_0_40px_rgba(217,183,110,0.18)] motion-safe:animate-[lexai-risk-fill_900ms_ease-out]"
      style={{ background: `conic-gradient(#D9B76E 0deg ${degrees}deg, #2C3632 ${degrees}deg 360deg)` }}
      role="img"
      aria-label={`Risk score ${boundedScore} out of 100`}
    >
      <div className="grid h-[124px] w-[124px] place-items-center rounded-full border border-[#D9B76E]/25 bg-[#121817]">
        <div className="text-center">
          <p className="text-4xl font-bold leading-none text-foreground">{boundedScore}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">/ 100</p>
        </div>
      </div>
    </div>
  );
}

export default function DemoReportPage() {
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportJobDetail | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [hasResolvedMode, setHasResolvedMode] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadReport() {
      const requestedReportId = new URLSearchParams(window.location.search).get("reportId");
      if (!isMounted) return;

      setReportId(requestedReportId);
      setHasResolvedMode(true);
      setIsLoading(true);
      setLoadError("");
      setIsFallback(false);

      try {
        const reportId =
          requestedReportId ??
          (await safeFetchPaginated<ReportListItem>("/reports", {
            signal: controller.signal
          })).data[0]?.id;

        if (!reportId) {
          throw new Error("No backend reports are available.");
        }

        const reportDetail = await safeFetch<ReportDetail>(`/reports/${reportId}`, {
          signal: controller.signal
        });

        if (isMounted) {
          setReport(reportDetail);
          setIsFallback(false);
        }
      } catch (error) {
        if (isMounted) {
          setReport(null);
          if (requestedReportId) {
            setLoadError(error instanceof Error ? error.message : "Unable to load the real report.");
            setIsFallback(false);
          } else {
            setIsFallback(true);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [retryCount]);

  const isRealReportMode = Boolean(reportId);
  const canRenderDemo = hasResolvedMode && !isRealReportMode && isFallback;
  const content = useMemo<ReportContent>(() => (isReportContent(report?.content) ? report.content : {}), [report]);
  const riskScore = content.riskScore ?? report?.riskScoreSnapshot ?? report?.document.riskScore ?? (canRenderDemo ? 74 : 0);
  const riskLevel = content.riskLevel ?? (riskScore >= 80 ? "High" : riskScore >= 50 ? "Medium" : "Low");
  const sourceLabel = content.sourceType ?? (content.fallbackUsed ? "MOCK fallback" : report ? "RULE_BASED report" : "Demo report");
  const heatmapCells = content.heatmap?.length ? content.heatmap : canRenderDemo ? fallbackHeatmapCells : [];
  const findings = content.topRisks?.length
    ? content.topRisks.map((risk) => ({
        title: risk.title,
        severity: risk.severity,
        finding: `${risk.finding}${risk.ruleId ? ` Rule: ${risk.ruleId}.` : ""}${risk.detectionMethod ? ` Source: ${risk.detectionMethod}.` : ""}${risk.linkedClauseTitle ? ` Clause: ${risk.linkedClauseTitle}.` : ""}`,
        action: risk.action
      }))
    : content.findings?.length
      ? content.findings
      : canRenderDemo
        ? fallbackFindings
        : [];
  const redlines = content.recommendedRedlines?.length
    ? content.recommendedRedlines
    : content.recommendedActions?.length
      ? content.recommendedActions.map((action) => ({
          title: action.title,
          change: action.description,
          why: [action.linkedRiskTitle ? `Risk: ${action.linkedRiskTitle}.` : "", action.linkedClauseTitle ? `Clause: ${action.linkedClauseTitle}.` : ""].filter(Boolean).join(" ") || "This action reduces contract risk before signature.",
          priority: String(action.priority)
        }))
      : canRenderDemo
        ? fallbackRedlines
        : [];
  const reportClauses = content.affectedClauses?.length
    ? content.affectedClauses.map((clause) => ({
        title: clause.title,
        status: clause.extractionMethod ?? "RULE_BASED",
        risk: clause.linkedRiskTitles?.length ? "High" : "Medium",
        summary: clause.summary ?? clause.excerpt ?? "Clause extracted from the analyzed document.",
        icon: clauseIconFor(`${clause.category} ${clause.title}`),
        linkedRiskTitles: clause.linkedRiskTitles ?? []
      }))
    : canRenderDemo
      ? clauses.map((clause) => ({ ...clause, linkedRiskTitles: [] }))
      : [];
  const negotiationChecklist = content.negotiationChecklist?.length
    ? content.negotiationChecklist
    : redlines.map((redline) => `${redline.priority} priority: ${redline.title}`);
  const clauseReviewHref = report?.documentId ? `/contracts/${report.documentId}/clauses` : "/contracts/demo-analysis";
  const processingDetails = [
    { label: "Finding source", value: isFallback ? "Frontend demo" : sourceLabel, icon: Bot, progress: 100 },
    { label: "Confidence", value: `${content.metrics?.confidence ?? (canRenderDemo ? 91 : 0)}%`, icon: ShieldCheck, progress: content.metrics?.confidence ?? (canRenderDemo ? 91 : 0) },
    { label: "Clauses scanned", value: String(content.metrics?.clausesScanned ?? (canRenderDemo ? 216 : 0)), icon: FileText, progress: 100 },
    { label: "Risks detected", value: String(content.metrics?.risksDetected ?? (canRenderDemo ? 7 : 0)), icon: AlertTriangle, progress: Math.min(100, (content.metrics?.risksDetected ?? 0) * 10) },
    { label: "Summary generated", value: "Yes", icon: Sparkles, progress: 100 },
    { label: "Export status", value: report?.exportJobs[0]?.status ? titleCase(report.exportJobs[0].status) : "Ready", icon: BadgeCheck, progress: 100 },
    { label: "Data handling", value: isFallback ? "Local frontend demo" : "Read-only API", icon: LockKeyhole, progress: 100 }
  ];
  const chatHref = report?.documentId ? `/ai-chat?documentId=${report.documentId}` : "/ai-chat";

  async function prepareExport() {
    setExportError("");
    setExportMessage("");

    if (!report?.id) {
      setExportMessage("Demo export is not connected to a backend report.");
      window.setTimeout(() => setExportMessage(""), 3200);
      return;
    }

    setIsExporting(true);
    try {
      const exportJob = await postJson<ExportJobDetail>(`/reports/${report.id}/export`, { format: "PDF" }, {
        timeoutMs: 90_000,
        timeoutMessage: "PDF export is taking longer than expected."
      });
      setLatestExport(exportJob);

      if (exportJob.status !== "COMPLETED" || !exportJob.downloadUrl) {
        throw new Error(exportJob.errorMessage ?? "PDF export did not complete.");
      }

      const blob = await downloadBlob(`/exports/${exportJob.id}/download`, {
        timeoutMs: 90_000,
        timeoutMessage: "PDF download is taking longer than expected."
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = exportJob.fileName ?? `${report.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage(`${exportJob.fileName ?? "PDF report"} downloaded.`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export this report.");
    } finally {
      setIsExporting(false);
    }
  }

  function shareReport() {
    setShareVisible(true);
  }

  if ((isRealReportMode || !hasResolvedMode) && isLoading) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
            <Clock3 className="mx-auto h-8 w-8 animate-spin text-[#D9B76E]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Loading real report</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Fetching the report generated from your uploaded document.</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (isRealReportMode && loadError) {
    return (
      <DashboardShell>
        <div className="mx-auto flex min-h-[60vh] max-w-[960px] items-center justify-center">
          <div className="w-full rounded-2xl border border-[#D66A5E]/40 bg-[#121817]/95 p-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
            <AlertTriangle className="mx-auto h-8 w-8 text-[#E89A92]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-foreground">Could not load real report</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError}</p>
            <Button type="button" className="mt-6" onClick={() => setRetryCount((value) => value + 1)}>
              Retry
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <Button asChild variant="ghost" size="sm" className="mb-4 px-0 text-muted-foreground hover:bg-transparent">
          <Link href="/reports" aria-label="Back to reports">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to reports
          </Link>
        </Button>

        <section aria-labelledby="report-title" className="relative overflow-hidden rounded-2xl border border-[#D9B76E]/30 bg-[#121817]/95 p-6 shadow-[0_0_44px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.24)] sm:p-8">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(245,245,239,0.035)_1px,transparent_1px)] bg-[length:100%_42px] opacity-60" />
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="relative max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge tone="success">
                  <BadgeCheck className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  {report?.status ? titleCase(report.status) : "Export ready"}
                </Badge>
                <Badge tone={isFallback || content.fallbackUsed ? "ai" : "info"}>{isFallback ? "Backend unavailable — showing demo data" : isLoading ? "Loading report" : sourceLabel}</Badge>
                <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[#2C3632] bg-[#151C19] px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Generated: {report?.createdAt ? formatDate(report.createdAt) : "Just now"}
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Plain-English legal review report</p>
              <h1 id="report-title" className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {report?.title ?? "Vendor Data Processing Agreement"}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {report?.document.title ? `For ${report.document.title}. ` : ""}Executive-ready review with risk scoring, clause findings, recommended redlines, and export controls.
              </p>
            </div>

            <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
              <Button onClick={prepareExport} disabled={isExporting} className="w-full" aria-label="Export PDF report">
                {isExporting ? <Clock3 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-5 w-5" aria-hidden="true" />}
                {isExporting ? "Exporting PDF" : "Export PDF"}
              </Button>
              <Button onClick={shareReport} variant="outline" className="w-full" aria-label="Share mock report">
                <Share2 className="mr-2 h-5 w-5" aria-hidden="true" />
                Share report
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href={chatHref} aria-label="Ask about this report">
                  <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
                  Ask about report
                </Link>
              </Button>
              {report?.documentId ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={clauseReviewHref} aria-label="Review clauses from this report">
                    <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                    Review Clauses
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {exportMessage ? (
            <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-[#A7C957]/35 bg-[#A7C957]/10 px-4 py-3 text-sm font-medium text-[#D7E8A5] motion-safe:animate-[lexai-section-in_220ms_ease-out]" role="status">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              {exportMessage}
            </div>
          ) : null}

          {exportError ? (
            <div className="relative mt-5 flex items-center gap-3 rounded-xl border border-[#D66A5E]/40 bg-[#D66A5E]/10 px-4 py-3 text-sm font-medium text-[#E89A92] motion-safe:animate-[lexai-section-in_220ms_ease-out]" role="alert">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              {exportError}
            </div>
          ) : null}

          {shareVisible ? (
            <div className="relative mt-5 rounded-xl border border-[#D9B76E]/35 bg-[#D9B76E]/10 p-4 motion-safe:animate-[lexai-section-in_220ms_ease-out]" role="status">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F0D89B]">Secure report link copied.</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">lexai.app/reports/{report?.id ?? "vendor-dpa-demo"}</p>
                </div>
                <Link2 className="h-5 w-5 text-[#F0D89B]" aria-hidden="true" />
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-8">
            <section aria-labelledby="executive-summary-title">
              <div className="rounded-2xl border border-[#D9B76E]/30 bg-[#121817]/95 p-6 shadow-[0_0_44px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.22)] sm:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D9B76E]/15 text-[#F0D89B] shadow-[0_0_28px_rgba(217,183,110,0.14)]">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="executive-summary-title" className="text-2xl font-bold leading-tight text-foreground">
                      Executive Summary
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#D9B76E]">Generated by LexAI review</p>
                  </div>
                </div>
                <p className="max-w-5xl text-base leading-8 text-muted-foreground">
                  {content.executiveSummary ?? report?.summarySnapshot ?? "LexAI found moderate contractual risk in this agreement. The main concerns relate to uncapped liability, ambiguous termination rights, missing security obligations, and limited indemnity protection. The agreement is usable, but several clauses should be reviewed before execution."}
                </p>
              </div>
            </section>

            <section aria-labelledby="risk-snapshot-title">
              <SectionHeading id="risk-snapshot-title" eyebrow="Risk snapshot" title={`${riskLevel} risk, export-ready`} description="The strongest signals are concentrated in liability, privacy, security, and termination." />
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="rounded-2xl border border-[#D9B76E]/35 bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <RiskScoreRing score={riskScore} />
                    <div className="min-w-0">
                      <Badge tone={riskTone(riskLevel)}>{riskLevel} risk</Badge>
                      <p className="mt-4 text-2xl font-bold leading-tight text-foreground">{riskScore} / 100</p>
                      {content.riskScoreExplanation ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{content.riskScoreExplanation}</p> : null}
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {[
                          ["Risks detected", String(content.metrics?.risksDetected ?? 7)],
                          ["Clauses scanned", String(content.metrics?.clausesScanned ?? 216)],
                          ["Processing time", content.metrics?.processingTime ?? "30s"]
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-[#2C3632] bg-[#151C19] p-3">
                            <p className="text-xs font-medium text-muted-foreground">{label}</p>
                            <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold leading-tight text-foreground">Risk heatmap</h3>
                    <Badge tone="info">6 categories</Badge>
                  </div>
                  {heatmapCells.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {heatmapCells.map((cell) => (
                      <div key={cell.label} className={`min-h-24 rounded-xl border p-3 ${cell.signal === "high" ? "border-[#D66A5E]/45 bg-[#D66A5E]/15 text-[#E89A92]" : cell.signal === "low" ? "border-[#A7C957]/35 bg-[#A7C957]/10 text-[#D7E8A5]" : "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]"}`}>
                        <p className="text-xs font-medium text-current">{cell.label}</p>
                        <p className="mt-4 text-2xl font-bold leading-none text-foreground">{cell.value}</p>
                        <p className="mt-1 text-xs font-medium text-current">{cell.signal} signal</p>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#2C3632] bg-[#151C19] p-4 text-sm leading-6 text-muted-foreground">
                      No risk heatmap data was generated for this report.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="key-findings-title">
              <SectionHeading id="key-findings-title" eyebrow="Key findings" title="Main legal issues" description="Findings are prioritized by severity and recommended negotiation impact." />
              {findings.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {findings.map((finding) => (
                  <article key={finding.title} className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#D9B76E]/45">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-semibold leading-tight text-foreground">{finding.title}</h3>
                      <Badge tone={finding.severity === "High" ? "high" : "medium"}>{finding.severity} severity</Badge>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#F5F5EF]">Finding</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.finding}</p>
                    <div className="mt-4 rounded-xl border border-[#D9B76E]/25 bg-[#D9B76E]/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D9B76E]">Recommended action</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.action}</p>
                    </div>
                  </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 text-sm leading-6 text-muted-foreground">
                  No risk findings were stored for this report.
                </div>
              )}
            </section>

            <section aria-labelledby="clause-review-title">
              <SectionHeading id="clause-review-title" eyebrow="Affected clauses" title="Clauses tied to the findings" description="For real reports, this section shows extracted clauses linked to rule-based risks." />
              {reportClauses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {reportClauses.map((clause) => {
                  const Icon = clause.icon;

                  return (
                    <article key={clause.title} className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6BAA9C]/20 bg-[#6BAA9C]/10 text-[#9BCBC2]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge tone={riskTone(clause.risk)}>{clause.risk} risk</Badge>
                          <Badge tone={clause.risk === "Low" ? "low" : "medium"}>{clause.status}</Badge>
                        </div>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold leading-tight text-foreground">{clause.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{clause.summary}</p>
                      {clause.linkedRiskTitles.length > 0 ? (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#D9B76E]">
                          Linked risks: {clause.linkedRiskTitles.join(", ")}
                        </p>
                      ) : null}
                    </article>
                  );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 text-sm leading-6 text-muted-foreground">
                  No affected clauses were stored for this report.
                </div>
              )}
            </section>

            <section aria-labelledby="redlines-title">
              <SectionHeading id="redlines-title" eyebrow="Recommended redlines" title="Action-oriented negotiation changes" description="These recommendations show how an exportable report will guide next steps." />
              {redlines.length > 0 ? (
                <div className="space-y-4">
                  {redlines.map((redline) => (
                  <article key={redline.title} className="rounded-2xl border border-[#A7C957]/25 bg-[#121817]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A7C957]/10 text-[#D7E8A5]">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold leading-tight text-foreground">{redline.title}</h3>
                          <p className="mt-3 text-sm font-semibold text-[#F5F5EF]">What to change</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{redline.change}</p>
                          <p className="mt-3 text-sm font-semibold text-[#F5F5EF]">Why it matters</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{redline.why}</p>
                        </div>
                      </div>
                      <Badge tone={redline.priority === "High" ? "high" : "medium"}>{redline.priority} priority</Badge>
                    </div>
                  </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 text-sm leading-6 text-muted-foreground">
                  No recommendations were stored for this report.
                </div>
              )}
            </section>

            <section aria-labelledby="checklist-title">
              <SectionHeading id="checklist-title" eyebrow="Negotiation checklist" title="Issues to resolve before signature" description="Use this as a practical handoff list for counsel or the business owner." />
              <div className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                {negotiationChecklist.length > 0 ? (
                  <div className="space-y-3">
                    {negotiationChecklist.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D7E8A5]" aria-hidden="true" />
                      <p>{item}</p>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">No negotiation checklist was generated for this report.</p>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Report actions and processing audit">
            <section className="rounded-2xl border border-[#D9B76E]/35 bg-[#121817]/95 p-6 shadow-[0_0_36px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.24)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D9B76E]/15 text-[#F0D89B]">
                  <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight text-foreground">Report status</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Ready for team review</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <Button onClick={prepareExport} disabled={isExporting} className="w-full" aria-label="Export PDF from status panel">
                  {isExporting ? <Clock3 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-5 w-5" aria-hidden="true" />}
                  {isExporting ? "Exporting PDF" : "Export PDF"}
                </Button>
                <Button onClick={shareReport} variant="outline" className="w-full" aria-label="Share mock report from status panel">
                  <Send className="mr-2 h-5 w-5" aria-hidden="true" />
                  Share report
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href={chatHref} aria-label="Ask about this report from report status panel">
                    <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
                    Ask about report
                  </Link>
                </Button>
                {report?.documentId ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link href={clauseReviewHref} aria-label="Review clauses from report status panel">
                      <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                      Review Clauses
                    </Link>
                  </Button>
                ) : null}
                {latestExport?.status === "COMPLETED" ? (
                  <div className="rounded-xl border border-[#A7C957]/30 bg-[#A7C957]/10 p-3 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-[#D7E8A5]">Last export:</span> {latestExport.fileName ?? latestExport.id}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Review confidence</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">Processing details</h2>
                </div>
                <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="space-y-4">
                {processingDetails.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-[#6BAA9C]" aria-hidden="true" />
                          <p className="truncate text-sm text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#2C3632]" aria-hidden="true">
                        <div className="h-full rounded-full bg-[#D9B76E]" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/70 p-5">
              <div className="flex items-start gap-3">
                <Scale className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">
                  {content.legalDisclaimer ?? "LexAI review output does not replace professional legal advice."}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
