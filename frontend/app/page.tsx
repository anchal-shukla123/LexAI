import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
} from "lucide-react";

import { ChaosToClaritySection } from "@/components/landing/chaos-to-clarity-section";
import { CinematicBackground } from "@/components/landing/cinematic-background";
import { CinematicFooter } from "@/components/landing/cinematic-footer";
import { FloatingContractObject } from "@/components/landing/floating-contract-object";
import { ReviewFlowTimeline } from "@/components/landing/review-flow-timeline";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/scroll-reveal";
import { WorkspacePanels } from "@/components/landing/workspace-panels";
import { SiteAuthActions } from "@/components/layout/auth-account";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Home" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/dashboard", label: "Dashboard" }
];

const proofPoints = [
  { value: "4", label: "risk categories checked" },
  { value: "12", label: "clauses reviewed" },
  { value: "30s", label: "mock analysis" }
];

const problemPoints = [
  "Liability caps are unclear.",
  "Termination duties are hard to compare.",
  "Payment and privacy terms are easy to miss.",
  "Security obligations are often vague."
];

const reviewSteps = [
  {
    title: "Upload agreement",
    body: "Add a PDF, DOCX, PNG, JPG, or JPEG.",
    icon: "upload" as const
  },
  {
    title: "Run review",
    body: "LexAI creates an analysis job and structured findings.",
    icon: "file" as const
  },
  {
    title: "Review findings",
    body: "See clauses, risks, and recommendations in one place.",
    icon: "risk" as const
  },
  {
    title: "Prepare report",
    body: "Create a plain-English summary for stakeholders.",
    icon: "report" as const
  }
];

const workspacePanels = [
  {
    eyebrow: "Clause Review",
    title: "Liability",
    body: "Uncapped exposure detected.",
    tone: "sage" as const
  },
  {
    eyebrow: "Risk Findings",
    title: "Security obligations missing",
    body: "Breach timeline not defined.",
    tone: "gold" as const
  },
  {
    eyebrow: "Report Output",
    title: "Plain-English summary",
    body: "Ready for stakeholder review.",
    tone: "sage" as const
  }
];

const worksToday = [
  "JWT signup and login",
  "Auth-aware workspace data",
  "Document upload",
  "Persisted analysis records",
  "Reports and chat views",
  "Demo Mode fallback"
];

const comesNext = [
  "OCR extraction",
  "LLM-backed legal review",
  "Source citations",
  "Object storage",
  "Team permissions",
  "Production billing"
];

const projectMeta = [
  { label: "Type", value: "Full-stack SaaS MVP" },
  { label: "Stack", value: "Next.js, Express, Prisma, PostgreSQL" },
  { label: "Status", value: "Live portfolio demo" }
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0F0E] text-[#F5F5EF]">
      <header className="sticky top-0 z-40 border-b border-[#2C3632]/80 bg-[#0B0F0E]/88 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="LexAI home">
            <Image
              src="/brand/lexai-logo-horizontal.png"
              alt="LexAI"
              width={148}
              height={48}
              className="h-auto w-[132px] object-contain sm:w-[148px]"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[#A2AAA5] lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[#F5F5EF]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center">
            <SiteAuthActions variant="landing" />
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <CinematicBackground />

        <section className="container relative z-10 grid min-h-[calc(100vh-4rem)] items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <Stagger className="max-w-3xl">
            <StaggerItem>
              <p className="inline-flex h-8 items-center rounded-md border border-[#2C3632] bg-[#121817]/78 px-3 text-sm font-medium text-[#A7C957]">
                Contract review system
              </p>
            </StaggerItem>

            <StaggerItem>
              <h1 className="mt-7 max-w-4xl text-balance font-serif text-5xl font-semibold leading-[0.98] tracking-normal text-[#F5F5EF] sm:text-6xl lg:text-7xl">
                Review contracts before they become risks.
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#A2AAA5] sm:text-xl">
                Upload an agreement, identify the clauses that matter, and create a plain-English review report.
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-md bg-[#A7C957] px-6 text-[#0B0F0E] shadow-[0_14px_36px_rgba(167,201,87,0.14)] hover:bg-[#B6D86A] sm:w-auto"
                >
                  <Link href="/signup">
                    Start review <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full rounded-md border-[#2C3632] bg-[#121817]/70 px-6 text-[#F5F5EF] hover:border-[#A7C957]/60 hover:bg-[#1B2421] sm:w-auto"
                >
                  <Link href="/dashboard">View dashboard</Link>
                </Button>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-12 grid gap-3 border-y border-[#2C3632]/70 py-5 sm:grid-cols-3">
                {proofPoints.map((point) => (
                  <div key={point.label} className="flex items-baseline gap-3 sm:block">
                    <p className="text-2xl font-semibold leading-8 text-[#F5F5EF]">{point.value}</p>
                    <p className="text-sm leading-6 text-[#A2AAA5]">{point.label}</p>
                  </div>
                ))}
              </div>
            </StaggerItem>
          </Stagger>

          <Reveal className="relative" delay={0.12} scale>
            <FloatingContractObject />
          </Reveal>
        </section>

        <ChaosToClaritySection />

        <section className="landing-section mission-section container relative z-10">
          <div className="grid min-h-[78vh] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <Reveal>
              <p className="landing-label">The mission</p>
              <div className="mission-statement mt-7">
                <span>Make contracts</span>
                <span>understandable before</span>
                <span>they become expensive.</span>
              </div>
              <div className="mission-underline" aria-hidden="true" />
            </Reveal>

            <Reveal className="mission-stack-visual" delay={0.12} scale>
              <div className="mission-page mission-page-one" />
              <div className="mission-page mission-page-two" />
              <div className="mission-page mission-page-three" />
              <div className="mission-stack-line mission-stack-line-one" />
              <div className="mission-stack-line mission-stack-line-two" />
              <div className="mission-stack-line mission-stack-line-three" />
            </Reveal>
          </div>
        </section>

        <section className="landing-section problem-section container relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <Reveal>
              <p className="landing-label">The problem</p>
              <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
                Legal risk hides in ordinary language.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#A2AAA5]">
                Important terms are often buried across pages of contracts. By the time a risk is noticed, the team has already lost time, leverage, or clarity.
              </p>
              <Stagger className="mt-8 space-y-3">
                {problemPoints.map((point) => (
                  <StaggerItem key={point}>
                    <div className="problem-row">
                      <span className="problem-row-marker" />
                      <span>{point}</span>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </Reveal>

            <Reveal scale>
              <div className="contract-page-visual" aria-hidden="true">
                <div className="contract-page contract-page-back" />
                <div className="contract-page contract-page-front">
                  <div className="contract-line line-wide" />
                  <div className="contract-line line-medium" />
                  <div className="contract-line line-short" />
                  <div className="contract-highlight highlight-one" />
                  <div className="contract-line line-wide" />
                  <div className="contract-highlight highlight-two" />
                  <div className="contract-line line-medium" />
                  <div className="contract-line line-short" />
                  <div className="contract-highlight highlight-three" />
                  <div className="contract-page-scan" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="landing-section review-flow-section container relative z-10 scroll-mt-24">
          <Reveal className="max-w-3xl">
            <p className="landing-label">The review flow</p>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
              From uploaded document to structured review.
            </h2>
          </Reveal>

          <ReviewFlowTimeline steps={reviewSteps} />

          <Reveal className="mvp-note mt-8 max-w-3xl text-sm leading-6 text-[#A2AAA5]">
            In this MVP, analysis is powered by a deterministic mock provider. The workflow is built so OCR and LLM review can be added next.
          </Reveal>
        </section>

        <section className="landing-section workspace-section relative z-10">
          <div className="container">
            <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
              <Reveal>
                <p className="landing-label">The workspace</p>
                <h2 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
                  A review workspace, not another document dump.
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-[#A2AAA5]">
                  LexAI keeps the review connected: clauses, risks, recommendations, chat, and reports all stay tied to the document.
                </p>
              </Reveal>

              <WorkspacePanels panels={workspacePanels} />
            </div>
          </div>
        </section>

        <section className="landing-section transparency-section container relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="landing-label">MVP transparency</p>
              <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
                Built to prove the workflow first.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#A2AAA5]">
                LexAI currently uses a deterministic mock analysis provider. The product flow is real: authentication, workspace context, uploads, analysis jobs, persisted findings, reports, and chat views.
              </p>
            </Reveal>

            <Reveal className="system-layer-visual" delay={0.12} scale>
              {["Auth", "Upload", "Analysis Job", "Findings", "Report"].map((item, index) => (
                <div key={item} className={`system-layer system-layer-${index + 1}`}>
                  <span>{item}</span>
                </div>
              ))}
            </Reveal>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <Reveal className="transparency-column" delay={0.05}>
              <h3>What works today</h3>
              <ul>
                {worksToday.map((item) => (
                  <li key={item}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="transparency-column" delay={0.16}>
              <h3>What comes next</h3>
              <ul>
                {comesNext.map((item) => (
                  <li key={item}>
                    <span className="future-dot" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section className="landing-section about-section container relative z-10">
          <div className="about-signature-grid">
            <Reveal>
              <p className="landing-label">About the project</p>
              <h2 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
                LexAI is part of the ApexGroup product ecosystem.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#A2AAA5]">
                Built by Anchal Shukla, LexAI explores how legal-tech products can make contract review clearer, faster, and more structured for small teams.
              </p>
            </Reveal>

            <Reveal className="project-meta-block" delay={0.12}>
              <div className="signature-line" aria-hidden="true" />
              {projectMeta.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="landing-section final-cta-section relative z-10">
          <div className="final-cta-image-bg" aria-hidden="true">
            <Image
              src="/brand/from-chaos-to-clarity.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <div className="final-cta-image-overlay" aria-hidden="true" />
          <div className="final-cta-document" aria-hidden="true">
            <span className="final-report-seal" />
          </div>
          <Reveal className="container relative z-10 mx-auto max-w-4xl text-center">
            <p className="landing-label justify-center">Start review</p>
            <h2 className="mt-5 font-serif text-5xl font-semibold leading-tight text-[#F5F5EF] sm:text-6xl">
              Start with one contract.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#A2AAA5]">
              Upload a test agreement and see how LexAI turns dense terms into a structured review.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full rounded-md bg-[#A7C957] px-6 text-[#0B0F0E] shadow-[0_14px_36px_rgba(167,201,87,0.14)] hover:bg-[#B6D86A] sm:w-auto"
              >
                <Link href="/signup">
                  Start review <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-md border-[#2C3632] bg-[#121817]/70 px-6 text-[#F5F5EF] hover:border-[#A7C957]/60 hover:bg-[#1B2421] sm:w-auto"
              >
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <CinematicFooter />
    </div>
  );
}
