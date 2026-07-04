import Link from "next/link";
import Image from "next/image";

import { SiteAuthActions } from "@/components/layout/auth-account";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <Image
            src="/brand/lexai-logo-horizontal.png"
            alt="LexAI"
            width={148}
            height={48}
            className="h-auto w-[132px] object-contain sm:w-[148px]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <SiteAuthActions />
      </div>
    </header>
  );
}
