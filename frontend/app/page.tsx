import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck, Users } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Understand documents",
    description: "A focused workspace for turning dense legal language into clear review steps.",
    icon: FileSearch
  },
  {
    title: "Spot risk early",
    description: "Designed around clauses, obligations, and business exposure instead of generic summaries.",
    icon: ShieldCheck
  },
  {
    title: "Review together",
    description: "Built for founders, HR teams, legal consultants, and firms working in shared spaces.",
    icon: Users
  }
];

export default function HomePage() {
  return (
    <PageShell>
      <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-primary">
            Legal document intelligence
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Make every legal document understandable within 30 seconds.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            LexAI helps teams analyze, compare, and improve contracts with a premium workspace built for focused legal review.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start workspace <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <Card key={pillar.title} className="bg-card/82">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-lg">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
