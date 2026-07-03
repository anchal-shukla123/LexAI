"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSearch,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Upload,
  Users
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Understand documents",
    description: "Convert dense legal language into executive summaries, obligations, and next steps.",
    icon: FileSearch
  },
  {
    title: "Spot risk early",
    description: "Surface exposure, missing clauses, and negotiation points before review slows down.",
    icon: ShieldCheck
  },
  {
    title: "Review together",
    description: "Give founders, operators, consultants, and legal teams one focused contract workspace.",
    icon: Users
  }
];

const demoRows = [
  { label: "Contract uploaded", value: "Vendor-DPA.pdf", icon: Upload },
  { label: "Risk detected", value: "Uncapped liability", icon: ShieldCheck },
  { label: "AI summary", value: "9 key obligations", icon: Sparkles },
  { label: "Report ready", value: "PDF export", icon: BarChart3 }
];

const metrics = [
  { value: "30s", label: "to first summary" },
  { value: "12", label: "risk categories" },
  { value: "4x", label: "faster review prep" }
];

export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();
  const entrance = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };

  return (
    <PageShell>
      <main className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_28%_8%,rgba(59,130,246,0.16),transparent_30rem),radial-gradient(circle_at_78%_18%,rgba(139,92,246,0.13),transparent_28rem),linear-gradient(rgba(248,250,252,0.024)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.024)_1px,transparent_1px)] bg-[size:auto,auto,72px_72px,72px_72px]" />

        <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={entrance} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="max-w-3xl">
            <div className="inline-flex h-7 items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 text-xs font-medium text-[#C4B5FD]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI legal intelligence
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Analyze contracts with the calm precision of a legal analyst.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              LexAI turns contracts into risk summaries, clause insights, obligation checklists, and exportable reports in one premium workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Sign up <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border bg-card/80 p-4">
                  <p className="text-2xl font-bold leading-8 text-foreground">{metric.value}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
            className="relative"
          >
            <Card className="overflow-hidden border-primary/35 bg-card/95 shadow-[0_16px_48px_rgba(0,0,0,0.25)]">
              <CardHeader className="border-b border-border p-6">
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#C4B5FD]" aria-hidden="true" />
                    Live workspace preview
                  </span>
                  <span className="rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-1 text-xs font-medium text-[#86EFAC]">
                    AI Ready
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium leading-6 text-foreground">Acme Vendor Agreement</p>
                      <p className="text-sm leading-6 text-muted-foreground">Commercial contract review</p>
                    </div>
                    <div className="h-14 w-14 rounded-full bg-[conic-gradient(#F59E0B_0_74%,#2D3748_74%_100%)] p-2">
                      <div className="grid h-full w-full place-items-center rounded-full bg-background text-xs font-semibold text-[#FCD34D]">74</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {demoRows.map((row, index) => {
                    const Icon = row.icon;

                    return (
                      <div key={row.label} className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-6 text-foreground">{row.label}</span>
                          <span className="block text-sm leading-6 text-muted-foreground">{row.value}</span>
                        </span>
                        {index === 2 ? (
                          <span className="rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
                            Live
                          </span>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section className="container pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <Card key={pillar.title} className="hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)]">
                  <CardHeader className="flex-row items-center gap-4 space-y-0 p-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-xl">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 border-[#8B5CF6]/35 bg-[#8B5CF6]/10">
            <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD]">
                  <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-semibold leading-7 text-foreground">Trusted by legal-forward teams</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Frontend-only demo workspace for firms, operators, and founders reviewing high-value agreements.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/signup">Sign up</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </PageShell>
  );
}
