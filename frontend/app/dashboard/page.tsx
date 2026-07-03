import { Activity, FileText, ShieldAlert } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Documents", value: "0", icon: FileText },
  { label: "Open reviews", value: "0", icon: Activity },
  { label: "Risk alerts", value: "0", icon: ShieldAlert }
];

export default function DashboardPage() {
  return (
    <PageShell>
      <section className="container py-10">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Workspace</p>
          <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The operational surface is ready for future document upload, review, and analysis workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card key={stat.label} className="bg-card/82">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
