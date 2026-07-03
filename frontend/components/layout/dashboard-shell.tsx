"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  FileText,
  Home,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "AI Chat", href: "/dashboard/chat", icon: MessageSquareText, ai: true },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

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
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "group flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
                Quick Upload
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

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <Button asChild aria-label="Upload contract" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full px-0 shadow-[0_16px_48px_rgba(59,130,246,0.34)] sm:hidden">
        <Link href="/upload">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
