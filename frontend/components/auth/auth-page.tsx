"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSearch,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  WandSparkles
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
};

const content = {
  login: {
    badge: "AI legal intelligence",
    headline: "Legal intelligence, ready when you are.",
    subtext: "Run contract risk analysis, ask document-aware questions, and generate export-ready reports with LexAI.",
    title: "Welcome back",
    subtitle: "Log in to continue reviewing legal documents.",
    primaryCta: "Log in",
    footer: "Don't have an account?",
    footerLink: "Sign up",
    footerHref: "/signup",
    features: [
      {
        title: "Contract risk analysis",
        description: "Understand contracts and surface key risks instantly.",
        icon: WandSparkles
      },
      {
        title: "Clause & Risk Detection",
        description: "Identify important clauses and potential red flags.",
        icon: FileSearch
      },
      {
        title: "Export-ready reports",
        description: "Generate clear summaries and export-ready reports.",
        icon: CheckCircle2
      }
    ]
  },
  signup: {
    badge: "Build your legal intelligence workspace",
    headline: "Start reviewing contracts with AI in minutes.",
    subtext:
      "Upload documents, understand legal risks, ask clause-aware questions, and export professional reports.",
    title: "Create your workspace",
    subtitle: "Start your LexAI legal review workspace.",
    primaryCta: "Create account",
    footer: "Already have an account?",
    footerLink: "Log in",
    footerHref: "/login",
    features: [
      {
        title: "Upload contracts",
        description: "Bring PDFs and agreements into a focused review workspace.",
        icon: FileSearch
      },
      {
        title: "Ask document-aware AI",
        description: "Get answers grounded in clauses, risks, and obligations.",
        icon: Sparkles
      },
      {
        title: "Export-ready reports",
        description: "Package findings into clear summaries for stakeholders.",
        icon: CheckCircle2
      }
    ]
  }
};

const premiumInputClass =
  "lexai-auth-input h-12 rounded-xl pl-10";
const fieldIconClass = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8AA0C8]";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const copy = content[mode];
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const passwordStrength = useMemo(() => {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score >= 4) return { label: "Strong", value: 100, color: "bg-[#22C55E]" };
    if (score >= 2) return { label: "Good", value: 66, color: "bg-[#3B82F6]" };
    if (score === 1) return { label: "Weak", value: 34, color: "bg-[#F59E0B]" };
    return { label: "Minimum 8 characters", value: 0, color: "bg-muted" };
  }, [password]);

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (mode === "signup" && !name.trim()) {
      nextErrors.name = "Enter your full name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Enter your email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (mode === "signup" && password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (mode === "signup" && !terms) {
      nextErrors.terms = "Accept the Terms and Privacy Policy to continue.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function redirectAfterMockDelay(setLoading: (value: boolean) => void) {
    setLoading(true);
    window.setTimeout(() => {
      router.push("/dashboard");
    }, 700);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotMessage("");

    if (!validateForm()) {
      return;
    }

    redirectAfterMockDelay(setIsSubmitting);
  }

  function handleGoogle() {
    setErrors({});
    setForgotMessage("");
    redirectAfterMockDelay(setGoogleLoading);
  }

  const entrance = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden bg-[#0D1117]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,rgba(59,130,246,0.24),transparent_32rem),radial-gradient(circle_at_84%_20%,rgba(139,92,246,0.24),transparent_34rem),radial-gradient(circle_at_56%_92%,rgba(59,130,246,0.08),transparent_24rem),linear-gradient(rgba(248,250,252,0.034)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.034)_1px,transparent_1px)] bg-[size:auto,auto,auto,64px_64px,64px_64px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-gradient-to-b from-[#1F2937]/70 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:radial-gradient(circle_at_center,#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className={cn("container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-8 lg:grid-cols-[1.03fr_0.97fr]", isSignup ? "lg:py-4" : "lg:py-14")}>
          <motion.aside
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="order-2 hidden max-w-3xl lg:order-1 lg:block"
          >
            <BrandLockup size="large" />
            <div className="mt-10 inline-flex h-8 items-center gap-2 rounded-full border border-[#8B5CF6]/45 bg-[#8B5CF6]/10 px-3 text-xs font-medium text-[#C4B5FD] shadow-[0_0_34px_rgba(139,92,246,0.12)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {copy.badge}
            </div>
            <h1 className="mt-5 max-w-2xl text-5xl font-bold leading-tight text-foreground">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{copy.subtext}</p>

            <div className={cn("mt-9 grid max-w-2xl", isSignup ? "gap-3" : "gap-4")}>
              {copy.features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className={cn(
                      "group flex items-start rounded-lg border border-white/10 bg-[#161B22]/82 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur transition hover:border-[#3B82F6]/35 hover:bg-[#1F2937]/70",
                      isSignup ? "gap-3 p-3.5" : "gap-4 p-4",
                      isSignup && index === 2 && "lexai-short-screen-hidden"
                    )}
                  >
                    <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/15 text-[#93C5FD] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition group-hover:bg-[#8B5CF6]/18 group-hover:text-[#C4B5FD]", isSignup ? "h-10 w-10" : "h-11 w-11")}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-6 text-foreground">{feature.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">{feature.description}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={cn("flex max-w-xl items-start gap-4 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10", isSignup ? "mt-6 p-3.5" : "mt-8 p-4")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22C55E]/15 text-[#86EFAC]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-6 text-foreground">Enterprise-grade security</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your data is encrypted and never used to train models.
                </p>
              </div>
            </div>
          </motion.aside>

          <motion.div
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" }}
            className="relative order-1 mx-auto w-full max-w-[33rem] lg:order-2"
          >
            <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_50%_12%,rgba(139,92,246,0.28),transparent_22rem),radial-gradient(circle_at_14%_88%,rgba(59,130,246,0.22),transparent_18rem)] blur-xl" />
            <Card className="overflow-hidden rounded-xl border-[#8B5CF6]/22 bg-[#161B22]/88 shadow-[0_30px_110px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.035),0_0_80px_rgba(59,130,246,0.16)] backdrop-blur-2xl">
              <CardContent className={cn(isSignup ? "p-4 sm:p-5" : "p-7 sm:p-9")}>
                <div className={cn("flex flex-col items-center text-center", isSignup ? "mb-4" : "mb-9")}>
                  <BrandLockup />
                  <h2 className={cn("text-3xl font-semibold leading-9 text-foreground", isSignup ? "mt-3" : "mt-8")}>{copy.title}</h2>
                  <p className={cn("max-w-sm text-sm text-muted-foreground", isSignup ? "mt-1.5 leading-5" : "mt-2 leading-6")}>{copy.subtitle}</p>
                </div>

                <form className={cn(isSignup ? "space-y-3" : "space-y-5")} noValidate onSubmit={handleSubmit}>
                  {mode === "signup" ? (
                    <Field error={errors.name} errorId="name-error" compact>
                      <Label htmlFor="name">Full name</Label>
                      <div className="relative">
                        <User className={fieldIconClass} aria-hidden="true" />
                        <Input
                          id="name"
                          name="name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          autoComplete="name"
                          placeholder="Jane Smith"
                          className={cn(premiumInputClass, "pl-10")}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? "name-error" : undefined}
                        />
                      </div>
                    </Field>
                  ) : null}

                  <Field error={errors.email} errorId="email-error" compact={isSignup}>
                    <Label htmlFor="email">{mode === "signup" ? "Work email" : "Email"}</Label>
                    <div className="relative">
                      <Mail className={fieldIconClass} aria-hidden="true" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="you@company.com"
                        className={cn(premiumInputClass, "pl-10")}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                    </div>
                  </Field>

                  <Field error={errors.password} errorId="password-error" compact={isSignup}>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <LockKeyhole className={fieldIconClass} aria-hidden="true" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        placeholder="Password"
                        className={cn(premiumInputClass, "pl-10 pr-12")}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? "password-error" : mode === "signup" ? "password-strength" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[#1F2937] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </Field>

                  {mode === "signup" ? (
                    <div id="password-strength" className="space-y-1.5" aria-live="polite">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1F2937]">
                        <div
                          className={cn("h-full rounded-full transition-all duration-200", passwordStrength.color)}
                          style={{ width: `${passwordStrength.value}%` }}
                        />
                      </div>
                      <p className="text-xs leading-4 text-muted-foreground">Password strength: {passwordStrength.label}</p>
                    </div>
                  ) : null}

                  {mode === "login" ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <label className="flex items-center gap-2 text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-[#0D1117] accent-[#3B82F6]"
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotMessage("Password reset flow will be available in the production build.")}
                        className="text-[#93C5FD] transition hover:text-[#BFDBFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : (
                    <Field error={errors.terms} errorId="terms-error" compact>
                      <label className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={terms}
                          onChange={(event) => setTerms(event.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0D1117] accent-[#3B82F6]"
                          aria-invalid={Boolean(errors.terms)}
                          aria-describedby={errors.terms ? "terms-error" : undefined}
                        />
                        <span>
                          I agree to the{" "}
                          <Link href="/signup" className="text-[#93C5FD] hover:text-[#BFDBFE]">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/signup" className="text-[#93C5FD] hover:text-[#BFDBFE]">
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </Field>
                  )}

                  {forgotMessage ? <p className="rounded-lg border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-3 py-2 text-sm leading-6 text-[#BFDBFE]">{forgotMessage}</p> : null}

                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 rounded-xl bg-[#3B82F6] shadow-[0_16px_34px_rgba(59,130,246,0.28)] hover:bg-[#2563EB] hover:shadow-[0_18px_42px_rgba(59,130,246,0.34)]"
                    disabled={isSubmitting || googleLoading}
                  >
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Please wait" : copy.primaryCta}
                    {!isSubmitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                  </Button>
                </form>

                <div className={cn("flex items-center gap-3", isSignup ? "my-3" : "my-7")}>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-white/8" />
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/12 to-white/8" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full gap-3 rounded-xl border-[#E5E7EB] bg-white font-medium text-[#1F2937] shadow-[0_12px_28px_rgba(0,0,0,0.2)] hover:border-white hover:bg-[#F9FAFB] hover:text-[#111827]"
                  onClick={handleGoogle}
                  disabled={isSubmitting || googleLoading}
                >
                  {googleLoading ? <Spinner /> : <GoogleMark />}
                  {googleLoading ? "Connecting" : "Continue with Google"}
                </Button>

                <p className={cn("text-center text-sm leading-6 text-muted-foreground", isSignup ? "mt-3" : "mt-7")}>
                  {copy.footer}{" "}
                  <Link href={copy.footerHref} className="font-medium text-[#93C5FD] transition hover:text-[#BFDBFE]">
                    {copy.footerLink}
                  </Link>
                </p>
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center justify-center gap-3 text-center text-xs leading-5 text-muted-foreground lg:hidden">
              <ShieldCheck className="h-4 w-4 text-[#86EFAC]" aria-hidden="true" />
              Enterprise-grade security. Your data is encrypted and never used to train models.
            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}

function BrandLockup({ size = "compact" }: { size?: "compact" | "large" }) {
  return (
    <div className={cn("flex", size === "compact" && "justify-center")}>
      <Image
        src="/LexAI-horizon.png"
        alt="LexAI"
        width={size === "large" ? 270 : 178}
        height={size === "large" ? 90 : 59}
        className={cn("h-auto object-contain drop-shadow-[0_16px_34px_rgba(59,130,246,0.18)]", size === "large" ? "w-[270px]" : "w-[178px]")}
        priority
      />
    </div>
  );
}

function Field({
  children,
  error,
  errorId,
  compact = false
}: {
  children: ReactNode;
  error?: string;
  errorId?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
      {children}
      {error ? (
        <p id={errorId} className={cn("text-sm text-[#FCA5A5]", compact ? "leading-5" : "leading-6")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />;
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
