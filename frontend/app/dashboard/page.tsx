"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Home,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home, active: true },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "AI Chat", href: "/ai-chat", icon: MessageSquareText, ai: true },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings }
];

const pipelineSteps = [
  { label: "Document uploaded", value: "NDA-042.pdf", state: "Complete" },
  { label: "AI scanning", value: "216 clauses", state: "Live" },
  { label: "Risk score", value: "74/100", state: "Medium" },
  { label: "Clause detection", value: "12 flagged", state: "Review" },
  { label: "Compliance check", value: "SOC2 ready", state: "Pass" },
  { label: "Summary ready", value: "4 min read", state: "Ready" }
];

const stats = [
  {
    label: "Documents reviewed",
    value: "24",
    detail: "+8 this week",
    icon: FileText,
    tone: "text-primary",
    visual: "sparkline"
  },
  {
    label: "AI usage",
    value: "68%",
    detail: "1,240 credits left",
    icon: Sparkles,
    tone: "text-[#8B5CF6]",
    visual: "ring"
  },
  {
    label: "Risk overview",
    value: "7",
    detail: "3 require attention",
    icon: ShieldAlert,
    tone: "text-[#F59E0B]",
    visual: "heatmap"
  }
];

const documents = [
  {
    title: "Series A Subscription Agreement",
    type: "Financing",
    risk: "Medium",
    status: "Ready",
    time: "12 min ago",
    badge: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]"
  },
  {
    title: "Master Services Agreement",
    type: "Commercial",
    risk: "Low",
    status: "Reviewed",
    time: "1 hr ago",
    badge: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]"
  },
  {
    title: "Vendor Data Processing Addendum",
    type: "Privacy",
    risk: "High",
    status: "Action needed",
    time: "Yesterday",
    badge: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]"
  }
];

const activities = [
  { title: "AI summary generated", detail: "Series A Subscription Agreement", time: "12m", icon: Sparkles },
  { title: "Risk card updated", detail: "Indemnity clause marked medium risk", time: "28m", icon: ShieldAlert },
  { title: "Report exported", detail: "MSA review PDF downloaded", time: "2h", icon: CheckCircle2 }
];

const quickActions = [
  { label: "Upload Contract", icon: Upload, href: "/upload" },
  { label: "Open AI Chat", icon: MessageSquareText, href: "/ai-chat" },
  { label: "Export Report", icon: BarChart3, href: "/reports/demo-report" }
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-border bg-card/95 px-6 py-6 shadow-[16px_0_48px_rgba(0,0,0,0.18)]">
      <Link href="/" className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary/10 shadow-[0_12px_36px_rgba(59,130,246,0.3),0_0_32px_rgba(139,92,246,0.14)] transition duration-150 ease-out group-hover:shadow-[0_14px_40px_rgba(59,130,246,0.38),0_0_34px_rgba(139,92,246,0.18)]">
          <Image src="/LexAI-logo.png" alt="" width={44} height={44} className="h-11 w-11 object-cover" aria-hidden="true" priority />
        </span>
        <span>
          <span className="block text-xl font-semibold leading-6 tracking-[-0.01em] text-foreground">LexAI</span>
          <span className="block text-xs font-medium leading-5 text-muted-foreground">Apex Workspace</span>
        </span>
      </Link>

      <nav aria-label="Dashboard navigation" className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={item.active ? "page" : undefined}
              className={[
                "group flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item.active
                  ? "border border-primary/50 bg-primary/10 text-foreground shadow-[0_8px_24px_rgba(59,130,246,0.12)]"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5 transition duration-150 ease-out group-hover:-translate-y-0.5",
                  item.ai ? "text-[#8B5CF6]" : ""
                ].join(" ")}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {item.ai ? <Sparkles className="ml-auto h-4 w-4 text-[#8B5CF6]" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>

      <Card className="border-[#8B5CF6]/40 bg-[#8B5CF6]/10 shadow-[0_16px_48px_rgba(139,92,246,0.14)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_16px_rgba(139,92,246,0.9)]" />
              AI Ready
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">LexAI Intelligence</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Document-aware answers with clause references and risk context.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function StatVisual({ type }: { type: string }) {
  if (type === "ring") {
    return (
      <div className="relative h-16 w-16 rounded-full bg-[conic-gradient(#8B5CF6_0_68%,#2D3748_68%_100%)]">
        <div className="absolute inset-2 rounded-full bg-card" />
        <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-[#C4B5FD]">68%</span>
      </div>
    );
  }

  if (type === "heatmap") {
    return (
      <div className="grid w-20 grid-cols-4 gap-1">
        {["bg-[#22C55E]/60", "bg-[#F59E0B]/70", "bg-[#2D3748]", "bg-[#EF4444]/70", "bg-[#F59E0B]/60", "bg-[#22C55E]/50", "bg-[#EF4444]/60", "bg-[#2D3748]"].map((tone, index) => (
          <span key={`${tone}-${index}`} className={`h-3 rounded-sm ${tone}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-16 w-24 items-end gap-1">
      {[24, 36, 28, 44, 40, 56, 64].map((height, index) => (
        <span
          key={height + index}
          className="w-2 rounded-full bg-primary/70"
          style={{ height }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const entrance = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_8%,rgba(59,130,246,0.16),transparent_28rem),radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.12),transparent_26rem),linear-gradient(rgba(248,250,252,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.025)_1px,transparent_1px)] bg-[size:auto,auto,64px_64px,64px_64px]" />
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {isSidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="h-full"
              initial={shouldReduceMotion ? { x: 0 } : { x: -280 }}
              animate={{ x: 0 }}
              exit={shouldReduceMotion ? { x: 0 } : { x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="absolute left-[232px] top-6 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Close navigation"
                  onClick={() => setIsSidebarOpen(false)}
                  className="h-10 w-10 px-0"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
              <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Open navigation"
            onClick={() => setIsSidebarOpen(true)}
            className="h-10 w-10 px-0 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="group relative hidden flex-1 md:block">
            <label htmlFor="dashboard-search" className="sr-only">
              Search contracts, clauses, companies
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition duration-150 ease-out group-focus-within:text-primary" aria-hidden="true" />
            <Input
              id="dashboard-search"
              type="search"
              placeholder="Search contracts, clauses, companies..."
              className="max-w-[560px] pl-12 pr-16 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
            />
            <span className="pointer-events-none absolute left-[500px] top-1/2 hidden h-7 -translate-y-1/2 items-center rounded-md border border-border px-2 text-xs font-medium text-muted-foreground lg:flex">
              Ctrl K
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="hidden shadow-[0_8px_24px_rgba(59,130,246,0.28)] sm:inline-flex">
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Upload Contract
              </Link>
            </Button>
            <Button size="sm" variant="ghost" aria-label="View notifications" className="h-10 w-10 px-0">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button size="sm" variant="ghost" aria-label="Dark theme enabled" className="h-10 w-10 px-0">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </Button>
            <button
              type="button"
              aria-label="Open profile"
              className="h-10 w-10 rounded-full border border-border bg-muted text-sm font-semibold text-foreground transition duration-150 ease-out hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              AL
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px]">
            <motion.section
              initial={entrance}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,0.85fr)]"
            >
              <Card className="overflow-hidden border-primary/35 bg-card/95 shadow-[0_16px_48px_rgba(0,0,0,0.25)]">
                <CardContent className="p-6 sm:p-8 lg:p-10">
                  <div className="inline-flex h-7 items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 text-xs font-medium text-[#C4B5FD]">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    AI legal intelligence workspace
                  </div>
                  <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                    Understand contracts in seconds.
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                    Upload contracts, detect legal risks, summarize obligations, compare revisions, and generate AI-powered reports.
                  </p>
                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <motion.div
                      animate={shouldReduceMotion ? undefined : { boxShadow: ["0 0 0 rgba(59,130,246,0)", "0 0 36px rgba(59,130,246,0.24)", "0 0 0 rgba(59,130,246,0)"] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                    >
                      <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href="/upload">
                          <Upload className="mr-2 h-5 w-5" aria-hidden="true" />
                          Upload Contract
                        </Link>
                      </Button>
                    </motion.div>
                    <span className="text-sm leading-6 text-muted-foreground">Powered by LexAI Intelligence</span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-sm leading-6 text-muted-foreground">
                    <span>30s average analysis</span>
                    <span aria-hidden="true">/</span>
                    <span>12 risk categories</span>
                    <span aria-hidden="true">/</span>
                    <span>Export-ready reports</span>
                  </div>
                  <div className="mt-6 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-5 shadow-[0_12px_36px_rgba(139,92,246,0.12)]">
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD]">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold leading-6 text-foreground">Sample AI Insight</p>
                          <span className="w-fit rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#FCD34D]">
                            Medium Risk
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          Clause 7 contains uncapped liability. Consider adding a liability cap before signing.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                          <span className="rounded-full border border-border px-3 py-1">12 clauses checked</span>
                          <span className="rounded-full border border-border px-3 py-1">Export ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#8B5CF6]/35 bg-card/95 shadow-[0_16px_48px_rgba(139,92,246,0.12)]">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#C4B5FD]" aria-hidden="true" />
                      Live AI preview
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                      Live
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-6 pt-0">
                  {pipelineSteps.map((step, index) => (
                    <div key={step.label} className="relative flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                      {index < pipelineSteps.length - 1 ? <span className="absolute left-[31px] top-12 h-5 w-px bg-border" aria-hidden="true" /> : null}
                      <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-6 text-foreground">{step.label}</span>
                        <span className="block text-sm leading-6 text-muted-foreground">{step.value}</span>
                      </span>
                      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">{step.state}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.section>

            <section aria-labelledby="dashboard-stats" className="mt-8">
              <h2 id="dashboard-stats" className="sr-only">
                Dashboard statistics
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;

                  return (
                    <motion.div
                      key={stat.label}
                      initial={entrance}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : index * 0.05, ease: "easeOut" }}
                    >
                      <Card className="h-full hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)]">
                        <CardHeader className="flex-row items-start justify-between space-y-0 p-6">
                          <span>
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                            <span className="mt-3 block text-[32px] font-bold leading-10 text-foreground">{stat.value}</span>
                          </span>
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Icon className={["h-5 w-5", stat.tone].join(" ")} aria-hidden="true" />
                          </span>
                        </CardHeader>
                        <CardContent className="flex items-end justify-between gap-4 p-6 pt-0">
                          <p className="text-sm leading-6 text-muted-foreground">{stat.detail}</p>
                          <StatVisual type={stat.visual} />
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            <section className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 p-6">
                  <div>
                    <CardTitle className="text-xl">Recent Documents</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">View recent documents and resume analysis.</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/documents">View all</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="overflow-hidden rounded-2xl border border-border">
                    {documents.map((document) => (
                      <Link
                        key={document.title}
                        href="/contracts/demo-analysis"
                        className="grid gap-4 border-b border-border bg-background p-4 transition duration-150 ease-out last:border-b-0 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_112px_120px_96px]"
                      >
                        <span>
                          <span className="block text-sm font-medium leading-6 text-foreground">{document.title}</span>
                          <span className="block text-sm leading-6 text-muted-foreground">{document.type}</span>
                        </span>
                        <span className={`h-7 w-fit rounded-full border px-3 py-1 text-xs font-medium ${document.badge}`}>
                          {document.risk}
                        </span>
                        <span className="text-sm leading-6 text-muted-foreground">{document.status}</span>
                        <span className="text-sm leading-6 text-muted-foreground md:text-right">{document.time}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-6">
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-6 pt-0">
                  {activities.map((activity, index) => {
                    const Icon = activity.icon;

                    return (
                      <div key={activity.title} className="relative flex gap-4 pb-5 last:pb-0">
                        {index < activities.length - 1 ? <span className="absolute left-5 top-10 h-[calc(100%-40px)] w-px bg-border" aria-hidden="true" /> : null}
                        <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 rounded-2xl border border-border bg-background p-4">
                          <span className="flex items-center justify-between gap-3">
                            <span className="block text-sm font-medium leading-6 text-foreground">{activity.title}</span>
                            <span className="text-xs font-medium leading-6 text-muted-foreground">{activity.time}</span>
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{activity.detail}</span>
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>

            <section aria-label="Quick actions" className="mt-8 grid gap-4 md:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex min-h-20 items-center justify-between rounded-2xl border border-border bg-card/80 p-4 transition duration-150 ease-out hover:-translate-y-1 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {action.label}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
                  </Link>
                );
              })}
            </section>
          </div>
        </main>
      </div>

      <Button asChild aria-label="Upload contract" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full px-0 shadow-[0_16px_48px_rgba(59,130,246,0.34)] sm:hidden">
        <Link href="/upload">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
