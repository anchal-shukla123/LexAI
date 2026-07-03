import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  MessageSquareText,
  Scale,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const keyClauses = [
  { title: "Data Processing Scope", detail: "Defines permitted processing activities and requires documented customer instructions.", tone: "Low" },
  { title: "Subprocessor Notice", detail: "Requires notice before new subprocessors, but the objection window is short.", tone: "Medium" },
  { title: "Liability Allocation", detail: "Caps most damages but leaves privacy breach exposure partially uncapped.", tone: "Medium" },
  { title: "Audit Rights", detail: "Provides annual audit access with reasonable notice and confidentiality limits.", tone: "Low" }
];

const risks = [
  "Subprocessor objection period is limited to 5 business days.",
  "Security incident notice window is commercially reasonable but not fixed.",
  "Cross-border transfer language references current SCCs but lacks fallback wording.",
  "Indemnity language does not clearly cover regulatory fines."
];

const recommendations = [
  "Extend subprocessor objection review to 15 days for material vendors.",
  "Add a 72-hour security incident notification commitment.",
  "Include fallback language for updated transfer mechanisms.",
  "Clarify whether privacy regulatory fines are included in the liability cap."
];

function RiskBadge({ level }: { level: string }) {
  const className =
    level === "Low"
      ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]"
      : "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]";

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${className}`}>{level}</span>;
}

export default function DemoAnalysisPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-4 px-0 text-muted-foreground hover:bg-transparent">
              <Link href="/upload">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to upload
              </Link>
            </Button>
            <p className="mb-3 inline-flex h-7 items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 text-xs font-medium text-[#C4B5FD]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Mock AI analysis
            </p>
            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Vendor Data Processing Agreement</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              LexAI identified operational privacy risk, clause obligations, and negotiation recommendations from the uploaded agreement.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto">
              <MessageSquareText className="mr-2 h-5 w-5" aria-hidden="true" />
              Open AI Chat
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-5 w-5" aria-hidden="true" />
              Export Report
            </Button>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-[#F59E0B]/35 bg-card/95 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#FCD34D]">
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                </span>
                <RiskBadge level="Medium" />
              </div>
              <p className="mt-8 text-sm font-medium leading-6 text-muted-foreground">Risk score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-6xl font-bold leading-none text-foreground">74</span>
                <span className="pb-2 text-xl font-semibold text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[74%] rounded-full bg-[#F59E0B] shadow-[0_0_24px_rgba(245,158,11,0.45)]" />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Medium risk. Review privacy operations, notification commitments, and transfer fallback language before signature.
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#8B5CF6]/35 bg-card/95 shadow-[0_16px_48px_rgba(139,92,246,0.12)]">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-[#C4B5FD]" aria-hidden="true" />
                Executive summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-base leading-8 text-muted-foreground">
                This agreement is generally workable for a vendor relationship, but several operational privacy terms need tighter drafting.
                The strongest provisions are purpose limitation, audit rights, and confidentiality. The main negotiation focus should be
                incident notice timing, subprocessor objections, and liability coverage for privacy-related claims.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Clauses detected", value: "18", icon: FileText },
                  { label: "Risks detected", value: "4", icon: AlertTriangle },
                  { label: "Recommendations", value: "4", icon: Scale }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="mt-4 text-2xl font-bold leading-8 text-foreground">{item.value}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="p-6">
              <CardTitle className="text-xl">Key clauses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
              {keyClauses.map((clause) => (
                <div key={clause.title} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-sm font-semibold leading-6 text-foreground">{clause.title}</h2>
                    <RiskBadge level={clause.tone} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{clause.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[#EF4444]/25">
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-[#FCA5A5]" aria-hidden="true" />
                Risks detected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0">
              {risks.map((risk) => (
                <div key={risk} className="flex gap-3 rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/5 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#FCA5A5]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-muted-foreground">{risk}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="mt-6 border-[#22C55E]/25">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-[#86EFAC]" aria-hidden="true" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 pt-0 md:grid-cols-2">
            {recommendations.map((recommendation) => (
              <div key={recommendation} className="flex gap-3 rounded-2xl border border-border bg-background p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">{recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
