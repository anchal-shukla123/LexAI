"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  Download,
  FileText,
  Link2,
  LockKeyhole,
  Share2,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { safeFetchPaginated } from "@/lib/api-client";
import type { ReportListItem } from "@/types/api";

type OverviewCard = {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
  tone: string;
};

type UiReport = {
  id?: string;
  name: string;
  description: string;
  risk: string;
  status: string;
  created: string;
  href: string;
};

const fallbackOverviewCards: OverviewCard[] = [
  { label: "Reports generated", value: "12", detail: "Across active matters", icon: FileText, tone: "text-[#6BAA9C]" },
  { label: "Report-ready", value: "4", detail: "Prepared for sharing", icon: BadgeCheck, tone: "text-[#D9B76E]" },
  { label: "High-risk reports", value: "3", detail: "Need legal review", icon: ShieldAlert, tone: "text-[#D66A5E]" },
  { label: "Time saved", value: "18h", detail: "Estimated review time", icon: Clock3, tone: "text-[#7E8A86]" }
];

const fallbackReports: UiReport[] = [
  {
    name: "Vendor Data Processing Agreement",
    description: "Plain-English legal review report",
    risk: "Medium",
    status: "Export ready",
    created: "Just now",
    href: "/reports/demo-report"
  },
  {
    name: "Series A Subscription Agreement",
    description: "Investor agreement review",
    risk: "Medium",
    status: "Reviewed",
    created: "12 min ago",
    href: "/reports/demo-report"
  },
  {
    name: "Master Services Agreement",
    description: "Commercial contract summary",
    risk: "Low",
    status: "Exported",
    created: "1 hr ago",
    href: "/reports/demo-report"
  },
  {
    name: "NDA Snapshot",
    description: "Confidentiality risk report",
    risk: "High",
    status: "Needs review",
    created: "Yesterday",
    href: "/reports/demo-report"
  }
];

const templates = ["Executive legal review", "Clause risk summary", "Board-ready snapshot"];
const formats = ["PDF", "DOCX", "Secure link"];

function Badge({ children, tone }: { children: React.ReactNode; tone: "low" | "medium" | "high" | "ready" | "neutral" }) {
  const tones = {
    low: "border-[#A7C957]/40 bg-[#A7C957]/10 text-[#D7E8A5]",
    medium: "border-[#C47A4A]/40 bg-[#C47A4A]/10 text-[#E4AD89]",
    high: "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]",
    ready: "border-[#D9B76E]/40 bg-[#D9B76E]/10 text-[#F0D89B]",
    neutral: "border-[#2C3632] bg-[#151C19] text-muted-foreground"
  };

  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function riskTone(risk: string) {
  if (risk === "High") {
    return "high";
  }

  if (risk === "Low") {
    return "low";
  }

  return "medium";
}

function statusTone(status: string) {
  return status === "Export ready" || status === "Ready" ? "ready" : status === "Exported" || status === "Completed" ? "low" : "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function riskLabel(score: number | null) {
  if (score === null) {
    return "Unscored";
  }

  if (score >= 80) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toUiReport(report: ReportListItem): UiReport {
  return {
    id: report.id,
    name: report.title,
    description: report.document?.title ?? "Plain-English legal review report",
    risk: riskLabel(report.riskScoreSnapshot ?? report.document?.riskScore ?? null),
    status: titleCase(report.status),
    created: formatDate(report.createdAt),
    href: `/reports/demo-report?reportId=${report.id}`
  };
}

export default function ReportsPage() {
  const [apiReports, setApiReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;

    safeFetchPaginated<ReportListItem>("/reports")
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setApiReports(response.data);
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
    };
  }, []);

  const reports = useMemo(() => (apiReports.length > 0 ? apiReports.map(toUiReport) : fallbackReports), [apiReports]);
  const exportReadyCount = reports.filter((report) => report.status.toLowerCase().includes("ready") || report.status.toLowerCase().includes("completed")).length;
  const highRiskCount = reports.filter((report) => report.risk === "High").length;
  const overviewCards = apiReports.length > 0
    ? [
        { label: "Reports generated", value: String(apiReports.length), detail: "From backend workspace", icon: FileText, tone: "text-[#6BAA9C]" },
        { label: "Report-ready", value: String(exportReadyCount), detail: "Prepared for sharing", icon: BadgeCheck, tone: "text-[#D9B76E]" },
        { label: "High-risk reports", value: String(highRiskCount), detail: "Need legal review", icon: ShieldAlert, tone: "text-[#D66A5E]" },
        { label: "Latest report", value: reports[0]?.created ?? "None", detail: "Most recent backend report", icon: Clock3, tone: "text-[#7E8A86]" }
      ]
    : fallbackOverviewCards;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9B76E]/35 bg-[#D9B76E]/10 px-3 py-1 text-xs font-medium text-[#F0D89B]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Report deliverables
            </div>
            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Reports</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Review, export, and share plain-English contract reports.
            </p>
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link href={reports[0]?.href ?? "/reports/demo-report"}>
              <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
              View report
            </Link>
          </Button>
        </header>

        <section aria-labelledby="report-overview-title">
          <h2 id="report-overview-title" className="sr-only">
            Report overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_12px_36px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#D9B76E]/45 motion-safe:animate-[lexai-section-in_320ms_ease-out]"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                      <p className="mt-3 text-3xl font-bold leading-none text-foreground">{card.value}</p>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2C3632] bg-[#151C19]">
                      <Icon className={`h-5 w-5 ${card.tone}`} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{card.detail}</p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="recent-reports-title" className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="border-b border-[#2C3632] pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7E8A86]">Report management</p>
                  <h2 id="recent-reports-title" className="mt-2 text-2xl font-bold leading-tight text-foreground">
                    Recent reports
                  </h2>
                </div>
                <Badge tone={isFallback ? "neutral" : "ready"}>{isFallback ? "Backend unavailable - showing demo data" : isLoading ? "Loading reports" : `${exportReadyCount} report-ready`}</Badge>
              </div>
            </div>
            <div className="mt-5 grid gap-4 2xl:grid-cols-2">
              {isLoading ? (
                <>
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-[220px] animate-pulse rounded-2xl border border-[#2C3632] bg-[#0B0F0E]/70" />
                  ))}
                </>
              ) : null}
              {reports.map((report) => (
                <article
                  key={report.id ?? report.name}
                  className="group flex min-w-0 flex-col rounded-2xl border border-[#2C3632] bg-[#0B0F0E]/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-150 ease-out hover:-translate-y-1 hover:border-[#D9B76E]/45 hover:bg-[#151C19] hover:shadow-[0_16px_44px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-1 flex-col gap-5">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D9B76E]/25 bg-[#D9B76E]/10 text-[#F0D89B]">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="max-w-[34rem] overflow-hidden text-lg font-semibold leading-7 text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {report.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={riskTone(report.risk)}>{report.risk} risk</Badge>
                      <Badge tone={statusTone(report.status)}>{report.status}</Badge>
                      <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[#2C3632] bg-[#151C19] px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {report.created}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2 border-t border-[#2C3632] pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <Button asChild size="sm" className="w-full sm:w-auto">
                      <Link href={report.href} aria-label={`View report for ${report.name}`}>
                        View report
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                      <Link href={report.href} aria-label={`Export report for ${report.name}`}>
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        Export report
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
                      <Link href={report.href} aria-label={`Share report for ${report.name}`}>
                        <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Share report
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" aria-label="Report settings and privacy">
            <section className="rounded-2xl border border-[#D9B76E]/35 bg-[#121817]/95 p-6 shadow-[0_0_36px_rgba(217,183,110,0.08),0_16px_48px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D9B76E]/15 text-[#F0D89B]">
                  <BarChart3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold leading-tight text-foreground">Report templates</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Reusable export structures</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {templates.map((template) => (
                  <div key={template} className="flex items-center justify-between gap-3 rounded-xl border border-[#2C3632] bg-[#0B0F0E]/70 px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{template}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#2C3632] bg-[#121817]/95 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
              <h2 className="text-xl font-semibold leading-tight text-foreground">Export formats</h2>
              <div className="mt-5 grid gap-3">
                {formats.map((format) => (
                  <div key={format} className="flex items-center gap-3 rounded-xl border border-[#2C3632] bg-[#151C19] px-4 py-3">
                    {format === "Secure link" ? <Link2 className="h-5 w-5 text-[#D9B76E]" aria-hidden="true" /> : <Download className="h-5 w-5 text-[#6BAA9C]" aria-hidden="true" />}
                    <span className="text-sm font-medium text-foreground">{format}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#6BAA9C]/25 bg-[#6BAA9C]/10 p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#9BCBC2]" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold leading-tight text-foreground">Privacy note</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Demo reports use local mock data only. No backend export, AI processing, or document sharing is performed.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
