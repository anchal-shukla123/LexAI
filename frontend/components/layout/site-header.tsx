import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary/10 shadow-[0_10px_32px_rgba(59,130,246,0.28),0_0_28px_rgba(139,92,246,0.12)]">
            <Image src="/LexAI-logo.png" alt="" width={40} height={40} className="h-10 w-10 object-cover" aria-hidden="true" priority />
          </span>
          <span className="text-base font-semibold tracking-[-0.01em]">LexAI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
