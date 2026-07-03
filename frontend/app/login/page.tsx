import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <PageShell>
      <section className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md bg-card/88">
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>Authentication is intentionally not wired in this initial setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Password" disabled />
              </div>
              <Button type="button" className="w-full" disabled>
                Continue
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to LexAI?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
