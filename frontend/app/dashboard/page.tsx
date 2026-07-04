"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  LogIn,
  FileSearch,
  FolderOpen,
  MessageSquareText,
  Radio,
  ShieldAlert,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuthDisplay } from "@/components/layout/auth-account";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiClientError, safeFetch } from "@/lib/api-client";
import type { DashboardData, DocumentListItem } from "@/types/api";

type UiDocument = {
  id: string;
  title: string;
  type: string;
  risk: string;
  riskScore: number | null;
  status: string;
  summary: string;
  updated: string;
  createdAt: string;
  href: string;
};

type UiActivity = {
  id?: string;
  title: string;
  detail: string;
  time: string;
  tone: "sage" | "gold" | "teal" | "copper" | "red" | "steel";
  createdAt?: string;
};

const quickActions = [
  { label: "Upload contract", href: "/upload", icon: Upload, iconClass: "text-[#A7C957]" },
  { label: "View documents", href: "/documents", icon: FolderOpen, iconClass: "text-[#6BAA9C]" },
  { label: "Open reports", href: "/reports", icon: BarChart3, iconClass: "text-[#D9B76E]" },
  { label: "Ask about a contract", href: "/ai-chat", icon: MessageSquareText, iconClass: "text-[#C47A4A]" }
];

function formatDate(value: string, includeYear = false) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined
  }).format(date);
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function riskLabel(score: number | null) {
  if (score === null) {
    return "Pending";
  }

  if (score >= 80) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

function riskTone(risk: string) {
  if (risk === "High") {
    return "border-[#D66A5E]/45 bg-[#D66A5E]/10 text-[#E89A92]";
  }

  if (risk === "Low") {
    return "border-[#A7C957]/45 bg-[#A7C957]/10 text-[#D7E8A5]";
  }

  return "border-[#C47A4A]/45 bg-[#C47A4A]/10 text-[#E4AD89]";
}

function riskTextTone(risk: string) {
  if (risk === "High") {
    return "text-[#E89A92]";
  }

  if (risk === "Low") {
    return "text-[#A7C957]";
  }

  return "text-[#D9B76E]";
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("reviewed") || normalized.includes("complete")) {
    return "text-[#A7C957]";
  }

  if (normalized.includes("report") || normalized.includes("ready")) {
    return "text-[#D9B76E]";
  }

  if (normalized.includes("action") || normalized.includes("failed")) {
    return "text-[#D66A5E]";
  }

  if (normalized.includes("pending") || normalized.includes("uploaded")) {
    return "text-[#6BAA9C]";
  }

  return "text-[#A2AAA5]";
}

function activityTone(tone: UiActivity["tone"]) {
  const tones = {
    sage: "border-[#A7C957] shadow-[0_0_18px_rgba(167,201,87,0.18)]",
    gold: "border-[#D9B76E] shadow-[0_0_18px_rgba(217,183,110,0.16)]",
    teal: "border-[#6BAA9C] shadow-[0_0_18px_rgba(107,170,156,0.15)]",
    copper: "border-[#C47A4A] shadow-[0_0_18px_rgba(196,122,74,0.15)]",
    red: "border-[#D66A5E] shadow-[0_0_18px_rgba(214,106,94,0.15)]",
    steel: "border-[#7E8A86] shadow-[0_0_18px_rgba(126,138,134,0.12)]"
  };

  return tones[tone];
}

function activityToneForAction(action: string, index: number): UiActivity["tone"] {
  const normalized = action.toLowerCase();

  if (normalized.includes("upload")) return "teal";
  if (normalized.includes("analysis") || normalized.includes("complete")) return "sage";
  if (normalized.includes("report")) return "gold";
  if (normalized.includes("risk") || normalized.includes("warning")) return "copper";
  if (normalized.includes("delete") || normalized.includes("fail")) return "red";
  return index % 2 === 0 ? "steel" : "gold";
}

function fileMeta(document: DocumentListItem) {
  const firstFile = document.files?.[0];
  const extension = firstFile?.extension?.toUpperCase();
  const size = firstFile ? `${Math.max(1, Math.round(firstFile.sizeBytes / 1024))} KB` : null;

  return [extension, size].filter(Boolean).join(" / ") || document.description || "Legal document";
}

function toUiDocument(document: DocumentListItem): UiDocument {
  const risk = riskLabel(document.riskScore);

  return {
    id: document.id,
    title: document.title,
    type: fileMeta(document),
    risk,
    riskScore: document.riskScore,
    status: titleCase(document.status),
    summary: document.summary ?? "Review status is ready for clause and risk inspection.",
    updated: formatDate(document.updatedAt || document.createdAt),
    createdAt: document.createdAt,
    href: `/contracts/demo-analysis?documentId=${document.id}`
  };
}

function itemKey(item: { id?: string | null; title?: string | null; createdAt?: string | null }, index: number) {
  return item.id ?? `${item.title ?? "item"}-${item.createdAt ?? "fallback"}-${index}`;
}

function averageRisk(documents: UiDocument[]) {
  const scored = documents.map((document) => document.riskScore).filter((score): score is number => typeof score === "number");

  if (!scored.length) {
    return 0;
  }

  return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
}

function LoginRequiredModal() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#050706]/80 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="dashboard-login-title">
      <div className="w-full max-w-md rounded-lg border border-[#2C3632] bg-[#121817] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[#A7C957]/30 bg-[#A7C957]/10 text-[#A7C957]">
          <LogIn className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 id="dashboard-login-title" className="mt-5 text-2xl font-semibold text-[#F5F5EF]">
          Log in to open your dashboard
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#A2AAA5]">
          Your dashboard is tied to your workspace, documents, reports, and activity. Please log in first.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="bg-[#A7C957] text-[#0B0F0E] hover:bg-[#B8D86C]">
            <Link href="/login">
              Log in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[#2C3632] bg-[#0B0F0E]/50 text-[#F5F5EF] hover:border-[#D9B76E]/55 hover:bg-[#1B2421]">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const authDisplay = useAuthDisplay();
  const shouldReduceMotion = useReducedMotion();
  const hidden = shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.99 };
  const show = { opacity: 1, y: 0, scale: 1 };

  useEffect(() => {
    if (!authDisplay.hasToken) {
      return;
    }

    let isMounted = true;

    safeFetch<DashboardData>("/dashboard")
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setDashboard(data);
        setLoadError(null);
        setTokenRejected(false);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setDashboard(null);
          setTokenRejected(true);
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authDisplay.hasToken]);

  const authRequired = !authDisplay.hasToken || tokenRejected;
  const dashboardLoading = authDisplay.hasToken && isLoading && !loadError && !dashboard;

  const documents = useMemo(
    () => (dashboard?.recentDocuments.length ? dashboard.recentDocuments.map(toUiDocument) : []),
    [dashboard]
  );

  const reports = useMemo(
    () =>
      dashboard?.recentReports.length
        ? dashboard.recentReports.map((report) => ({
            id: report.id,
            title: report.title,
            document: report.document?.title ?? "Legal report",
            risk: riskLabel(report.riskScoreSnapshot ?? report.document?.riskScore ?? null),
            status: titleCase(report.status),
            updated: formatDate(report.updatedAt || report.createdAt),
            href: `/reports/demo-report?reportId=${report.id}`
          }))
        : [],
    [dashboard]
  );

  const activities: UiActivity[] = dashboard?.recentAuditLogs.length
    ? dashboard.recentAuditLogs.slice(0, 5).map((activity, index) => ({
        id: activity.id,
        title: titleCase(activity.action),
        detail: `${titleCase(activity.entityType)} ${activity.actorUser?.name ?? activity.actorUser?.email ?? "system"}`,
        time: formatDate(activity.createdAt),
        tone: activityToneForAction(activity.action, index),
        createdAt: activity.createdAt
      }))
    : [];

  const activeDocument = documents[0];
  const highRiskCount = dashboard?.counts.highRiskFindings ?? documents.filter((document) => document.risk === "High").length;
  const analyzedCount = dashboard?.counts.analyzedDocuments ?? documents.filter((document) => document.status !== "Pending").length;
  const documentCount = dashboard?.counts.documents ?? documents.length;
  const lastActivity = activities[0]?.time ?? activeDocument?.updated ?? "Pending";
  const modeLabel = "Signed in";
  const firstName = (dashboard?.currentUser.name ?? authDisplay.userName).split(" ")[0] || "there";
  const workspaceName = dashboard?.workspace.name ?? authDisplay.workspaceName;
  const reviewedPercent = documentCount > 0 ? Math.round((analyzedCount / documentCount) * 100) : 0;
  const avgRisk = averageRisk(documents);

  const stats = [
    { label: "documents reviewed", value: String(documentCount), detail: `${analyzedCount} analyzed` },
    { label: "reports ready", value: String(reports.length), detail: reports[0]?.updated ?? "Pending" },
    { label: "high-risk findings", value: String(highRiskCount), detail: highRiskCount > 0 ? "Review before signing" : "No urgent findings" },
    { label: "last activity", value: lastActivity, detail: dashboardLoading ? "Loading workspace" : loadError ? "Backend unavailable" : workspaceName }
  ];

  const riskRadar = [
    { label: "Liability", value: Math.min(100, Math.max(avgRisk + highRiskCount * 4, 42)), color: "bg-[#D66A5E]", text: "text-[#E89A92]" },
    { label: "Termination", value: Math.min(100, Math.max(avgRisk - 6, 34)), color: "bg-[#D9B76E]", text: "text-[#F0D89B]" },
    { label: "Privacy", value: Math.min(100, Math.max(avgRisk + 8, 38)), color: "bg-[#6BAA9C]", text: "text-[#9BCBC2]" },
    { label: "Payment", value: Math.min(100, Math.max(avgRisk - 14, 26)), color: "bg-[#7E8A86]", text: "text-[#A2AAA5]" },
    { label: "Security", value: Math.min(100, Math.max(avgRisk + 2, 32)), color: "bg-[#C47A4A]", text: "text-[#E4AD89]" }
  ];

  return (
    <>
      {authRequired ? <LoginRequiredModal /> : null}
      {!authRequired ? null : <div aria-hidden="true" className="fixed inset-0 bg-[#050706]" />}
      {!authRequired ? (
    <DashboardShell contextMode="auth">
      <div className="mx-auto max-w-[1440px]">
        <motion.section
          initial={hidden}
          animate={show}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative overflow-hidden rounded-lg border border-[#2C3632] bg-[#121817]/90 shadow-[0_26px_80px_rgba(0,0,0,0.34)]"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(245,245,239,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(245,245,239,0.026)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_18%,rgba(167,201,87,0.12),transparent_26rem),radial-gradient(circle_at_92%_70%,rgba(217,183,110,0.1),transparent_24rem)]" />
          <div aria-hidden="true" className="absolute -top-24 right-10 h-80 w-56 rotate-6 rounded-md border border-[#A2AAA5]/10 bg-[#1B2421]/20" />
          <div aria-hidden="true" className={cn("absolute -inset-y-24 left-[-12%] w-px rotate-12 bg-gradient-to-b from-transparent via-[#D9B76E]/35 to-transparent shadow-[0_0_32px_rgba(167,201,87,0.14)]", shouldReduceMotion ? "" : "motion-safe:animate-[lexai-bg-scan_10s_ease-in-out_infinite]")} />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-10">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex min-h-7 items-center gap-2 rounded-full border border-[#A7C957]/35 bg-[#A7C957]/10 px-3 py-1 text-xs font-medium text-[#D7E8A5]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#A7C957] shadow-[0_0_14px_rgba(167,201,87,0.55)]" />
                  {modeLabel}
                </span>
                <span className="inline-flex min-h-7 items-center rounded-full border border-[#D9B76E]/30 bg-[#D9B76E]/10 px-3 py-1 text-xs font-medium text-[#F0D89B]">
                  {loadError ? loadError : dashboardLoading ? "Loading workspace" : "Workspace live"}
                </span>
              </div>
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#A7C957]">
                {`Welcome back, ${firstName}`}
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl lg:text-6xl">
                Review command center
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#A2AAA5] sm:text-lg">
                Track uploaded contracts, review risks, and open reports from one workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[#A7C957] text-[#0B0F0E] shadow-[0_14px_34px_rgba(167,201,87,0.18)] hover:bg-[#B8D86C]">
                  <Link href={activeDocument?.href ?? "/upload"}>
                    Open analysis
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-[#2C3632] bg-[#0B0F0E]/50 text-[#F5F5EF] hover:border-[#D9B76E]/55 hover:bg-[#1B2421]">
                  <Link href="/upload">
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                    Upload contract
                  </Link>
                </Button>
              </div>
            </div>

            <div className="self-end rounded-lg border border-[#2C3632] bg-[#0B0F0E]/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A2AAA5]">workspace health</span>
                <Radio className="h-4 w-4 text-[#A7C957]" aria-hidden="true" />
              </div>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-4xl font-semibold leading-none text-[#F5F5EF]">{reviewedPercent}%</span>
                <span className="pb-1 text-sm text-[#A2AAA5]">review readiness</span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#2C3632]">
                <motion.span
                  initial={shouldReduceMotion ? { width: `${reviewedPercent}%` } : { width: 0 }}
                  animate={{ width: `${reviewedPercent}%` }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="block h-full rounded-full bg-[#A7C957]"
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#A2AAA5]">{workspaceName}</p>
            </div>
          </div>
        </motion.section>

        <section aria-label="Review status" className="mt-6 grid overflow-hidden rounded-lg border-y border-[#2C3632] bg-[#0B0F0E]/50 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={hidden}
              animate={show}
              transition={{ duration: 0.28, delay: shouldReduceMotion ? 0 : index * 0.04, ease: "easeOut" }}
              className="border-b border-[#2C3632] p-5 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <p className="text-3xl font-semibold leading-none text-[#F5F5EF]">{stat.value}</p>
              <p className="mt-2 text-sm font-medium text-[#F5F5EF]">{stat.label}</p>
              <p className="mt-1 truncate text-xs text-[#A2AAA5]">{stat.detail}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-6">
            <motion.section
              initial={hidden}
              animate={show}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
              className="relative overflow-hidden rounded-lg border border-[#2C3632] bg-[#1B2421]/85 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-7"
            >
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgba(245,245,239,0.04)_1px,transparent_1px)] bg-[length:100%_38px]" />
              <div aria-hidden="true" className={cn("absolute inset-x-[-20%] top-0 h-px bg-gradient-to-r from-transparent via-[#D9B76E]/55 to-transparent", shouldReduceMotion ? "" : "motion-safe:animate-[lexai-panel-scan_8s_ease-in-out_infinite]")} />
              <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A7C957]">Active review</p>
                    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium", riskTone(activeDocument?.risk ?? "Pending"))}>
                      {activeDocument?.risk ?? "Pending"} risk
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold leading-tight text-[#F5F5EF] sm:text-3xl">
                    {activeDocument?.title ?? "No active review yet."}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#A2AAA5]">
                    {activeDocument?.summary ?? "Upload a contract to start your first review."}
                  </p>
                  <div className="mt-5 grid gap-3 text-sm text-[#A2AAA5] sm:grid-cols-3">
                    <span className="rounded-md border border-[#2C3632] bg-[#0B0F0E]/40 px-3 py-2">{activeDocument?.status ?? "Waiting for upload"}</span>
                    <span className="rounded-md border border-[#2C3632] bg-[#0B0F0E]/40 px-3 py-2">{activeDocument?.type ?? "Contract file"}</span>
                    <span className="rounded-md border border-[#2C3632] bg-[#0B0F0E]/40 px-3 py-2">{activeDocument?.updated ?? "No activity"}</span>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="bg-[#A7C957] text-[#0B0F0E] hover:bg-[#B8D86C]">
                      <Link href={activeDocument?.href ?? "/upload"}>
                        Open analysis
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="text-[#A2AAA5] hover:bg-[#121817] hover:text-[#F5F5EF]">
                      <Link href="/upload">Upload contract</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid justify-start lg:justify-center">
                  <div
                    className="grid h-36 w-36 place-items-center rounded-full border border-[#D9B76E]/45 text-center shadow-[0_0_42px_rgba(217,183,110,0.12)]"
                    style={{
                      background: `conic-gradient(#D9B76E 0 ${activeDocument?.riskScore ?? 0}%, #2C3632 ${activeDocument?.riskScore ?? 0}% 100%)`
                    }}
                    aria-label={`Risk score ${activeDocument?.riskScore ?? 0}`}
                  >
                    <span className="grid h-28 w-28 place-items-center rounded-full bg-[#121817]">
                      <span>
                        <span className={cn("block text-3xl font-semibold", riskTextTone(activeDocument?.risk ?? "Pending"))}>
                          {activeDocument?.riskScore ?? "--"}
                        </span>
                        <span className="block text-xs uppercase tracking-[0.16em] text-[#A2AAA5]">risk score</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>

            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <motion.div initial={hidden} animate={show} transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : 0.12, ease: "easeOut" }} className="rounded-lg border border-[#2C3632] bg-[#121817]/80">
                <div className="flex flex-col gap-3 border-b border-[#2C3632] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#F5F5EF]">Recent documents</h2>
                    <p className="mt-1 text-sm text-[#A2AAA5]">Uploaded files and review status.</p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="w-fit text-[#A2AAA5] hover:bg-[#1B2421] hover:text-[#F5F5EF]">
                    <Link href="/documents">View all</Link>
                  </Button>
                </div>
                <div className="hidden grid-cols-[minmax(0,1fr)_120px_96px_92px_72px] gap-4 border-b border-[#2C3632] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#A2AAA5] md:grid">
                  <span>Document</span>
                  <span>Status</span>
                  <span>Risk</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>
                <div>
                  {documents.length ? documents.map((document, index) => (
                    <motion.div
                      key={itemKey(document, index)}
                      initial={hidden}
                      animate={show}
                      transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : index * 0.035, ease: "easeOut" }}
                    >
                      <Link
                        href={document.href}
                        className="grid gap-3 border-b border-[#2C3632] p-5 transition duration-150 ease-out last:border-b-0 hover:bg-[#1B2421]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957] md:grid-cols-[minmax(0,1fr)_120px_96px_92px_72px] md:items-center"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[#F5F5EF]">{document.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#A2AAA5]">{document.type}</span>
                        </span>
                        <span className={cn("text-sm", statusTone(document.status))}>{document.status}</span>
                        <span className={cn("w-fit rounded-full border px-2.5 py-1 text-xs font-medium", riskTone(document.risk))}>{document.risk}</span>
                        <span className="text-sm text-[#A2AAA5]">{document.updated}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#A7C957] md:justify-end">
                          Open
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </Link>
                    </motion.div>
                  )) : (
                    <div className="p-5 text-sm leading-6 text-[#A2AAA5]">
                      No documents yet. Upload a contract to start your first dashboard review.
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.aside initial={hidden} animate={show} transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }} className="rounded-lg border border-[#2C3632] bg-[#121817]/80 p-5">
                <h2 className="text-xl font-semibold text-[#F5F5EF]">Risk radar</h2>
                <p className="mt-1 text-sm text-[#A2AAA5]">Category pressure across recent reviews.</p>
                <div className="mt-6 space-y-4">
                  {riskRadar.map((category, index) => (
                    <div key={category.label}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-[#F5F5EF]">{category.label}</span>
                        <span className={category.text}>{category.value}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2C3632]">
                        <motion.span
                          initial={shouldReduceMotion ? { width: `${category.value}%` } : { width: 0 }}
                          whileInView={{ width: `${category.value}%` }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : index * 0.04, ease: "easeOut" }}
                          className={cn("block h-full rounded-full", category.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.aside>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <motion.div initial={hidden} animate={show} transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }} className="rounded-lg border border-[#2C3632] bg-[#121817]/80 p-5">
                <h2 className="text-xl font-semibold text-[#F5F5EF]">Review activity</h2>
                <div className="relative mt-6 space-y-5">
                  <motion.span
                    aria-hidden="true"
                    initial={shouldReduceMotion ? { scaleY: 1 } : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute left-3 top-3 h-[calc(100%-24px)] w-px origin-top bg-[#2C3632]"
                  />
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity.id ?? `${activity.title}-${activity.createdAt ?? activity.time}-${index}`}
                      initial={hidden}
                      animate={show}
                      transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : index * 0.04, ease: "easeOut" }}
                      className="relative flex gap-4"
                    >
                      <span className={cn("relative z-10 mt-1 h-6 w-6 rounded-full border bg-[#121817]", activityTone(activity.tone))} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-medium text-[#F5F5EF]">{activity.title}</span>
                          <span className="text-xs text-[#A2AAA5]">{activity.time}</span>
                        </span>
                        <span className="mt-1 block text-sm text-[#A2AAA5]">{activity.detail}</span>
                      </span>
                    </motion.div>
                  ))}
                  {!activities.length ? (
                    <div className="rounded-md border border-[#2C3632] bg-[#0B0F0E]/40 p-4 text-sm leading-6 text-[#A2AAA5]">
                      Workspace activity will appear here after uploads, analysis runs, and reports.
                    </div>
                  ) : null}
                </div>
              </motion.div>

              <motion.div initial={hidden} animate={show} transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }} className="rounded-lg border border-[#2C3632] bg-[#121817]/80 p-5">
                <h2 className="text-xl font-semibold text-[#F5F5EF]">Quick actions</h2>
                <div className="mt-5 grid gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex min-h-14 items-center justify-between rounded-md border border-[#2C3632] bg-[#0B0F0E]/45 px-4 py-3 text-sm font-medium text-[#F5F5EF] transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#A7C957]/50 hover:bg-[#1B2421] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957]"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", action.iconClass)} aria-hidden="true" />
                          {action.label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-[#A2AAA5] transition group-hover:text-[#A7C957]" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </section>
          </div>

          <motion.aside initial={hidden} animate={show} transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.14, ease: "easeOut" }} className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-lg border border-[#2C3632] bg-[#121817]/80 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#A7C957]/30 bg-[#A7C957]/10 text-[#A7C957]">
                  <FileSearch className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#F5F5EF]">Intelligence rail</h2>
                  <p className="text-sm text-[#A2AAA5]">{workspaceName}</p>
                </div>
              </div>

              <div className="mt-6 divide-y divide-[#2C3632] border-y border-[#2C3632]">
                {[
                  ["Workspace mode", modeLabel],
                  ["Current workspace", workspaceName],
                  ["Review readiness", `${reviewedPercent}%`],
                  ["Analysis provider", "Mock analysis provider active"]
                ].map(([label, value], index) => (
                  <div key={`${label}-${index}`} className="grid gap-1 py-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A2AAA5]">{label}</span>
                    <span className="text-sm font-medium text-[#F5F5EF]">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#2C3632] bg-[#121817]/80 p-5">
              <h2 className="text-lg font-semibold text-[#F5F5EF]">Reports ready</h2>
              <div className="mt-4 space-y-3">
                {reports.length ? reports.slice(0, 3).map((report, index) => (
                  <Link
                    key={itemKey(report, index)}
                    href={report.href}
                    className="block rounded-md border border-[#2C3632] bg-[#0B0F0E]/45 p-4 transition duration-150 hover:border-[#D9B76E]/45 hover:bg-[#1B2421] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957]"
                  >
                    <span className="block truncate text-sm font-medium text-[#F5F5EF]">{report.title}</span>
                    <span className="mt-1 block truncate text-xs text-[#A2AAA5]">{report.document}</span>
                    <span className="mt-3 flex items-center justify-between gap-3">
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", riskTone(report.risk))}>{report.risk}</span>
                      <span className="text-xs text-[#A2AAA5]">{report.updated}</span>
                    </span>
                  </Link>
                )) : (
                  <div className="rounded-md border border-[#2C3632] bg-[#0B0F0E]/45 p-4 text-sm leading-6 text-[#A2AAA5]">
                    Reports will appear after a contract has been analyzed.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#D9B76E]/30 bg-[#D9B76E]/10 p-5">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#D9B76E]" aria-hidden="true" />
                <p className="text-sm leading-6 text-[#A2AAA5]">
                  Review high-risk clauses with counsel before signing.
                </p>
              </div>
            </section>
          </motion.aside>
        </section>
      </div>
    </DashboardShell>
      ) : null}
    </>
  );
}
