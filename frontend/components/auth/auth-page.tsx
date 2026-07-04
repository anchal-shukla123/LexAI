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
import { login, signup } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type FormErrors = {
  form?: string;
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
};

const defaultWorkspaceName = "Apex Workspace";

const content = {
  login: {
    badge: "Review workflow",
    headline: "Review contracts before signing.",
    subtext: "Open risky clauses, reports, and contract questions from one focused workspace.",
    title: "Welcome back",
    subtitle: "Continue your contract review workflow.",
    primaryCta: "Log in",
    footer: "Don't have an account?",
    footerLink: "Sign up",
    footerHref: "/signup",
    features: [
      {
        title: "Contract risk analysis",
        description: "Surface liability, payment, privacy, and termination risks.",
        icon: WandSparkles
      },
      {
        title: "Clause review",
        description: "Find the clauses that need business or legal attention.",
        icon: FileSearch
      },
      {
        title: "Plain-English reports",
        description: "Prepare concise summaries for counsel and stakeholders.",
        icon: CheckCircle2
      }
    ]
  },
  signup: {
    badge: "Contract review workspace",
    headline: "Create a focused place for legal review.",
    subtext:
      "Upload agreements, inspect risky clauses, ask grounded questions, and prepare plain-English reports.",
    title: "Create your review workspace",
    subtitle: "Set up LexAI for contract review.",
    primaryCta: "Create account",
    footer: "Already have an account?",
    footerLink: "Log in",
    footerHref: "/login",
    features: [
      {
        title: "Upload contracts",
        description: "Bring PDFs, DOCX files, and scans into the review queue.",
        icon: FileSearch
      },
      {
        title: "Ask about clauses",
        description: "Get answers grounded in the current review file.",
        icon: Sparkles
      },
      {
        title: "Review reports",
        description: "Package findings into clear summaries before signing.",
        icon: CheckCircle2
      }
    ]
  }
};

const premiumInputClass =
  "lexai-auth-input h-12 rounded-xl pl-10";
const fieldIconClass = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E8A86]";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getBackendErrorMessage(error: unknown, mode: AuthMode) {
  if (!(error instanceof ApiClientError)) {
    return mode === "signup" ? "Signup failed. Please try again." : "Something went wrong. Please try again.";
  }

  if (error.status === 0 || error.code === "NETWORK_ERROR" || error.code === "CONFIG_MISSING") {
    return "Backend unavailable. Please start the backend server and try again.";
  }

  if (mode === "signup" && error.status === 409) {
    return "An account with this email already exists. Please log in.";
  }

  if (mode === "login" && error.status === 401) {
    return "Invalid email or password.";
  }

  const detailsMessage = error.details
    ?.map((detail) => {
      if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
        return detail.message;
      }

      return null;
    })
    .find(Boolean);

  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return detailsMessage ?? error.message;
  }

  if (mode === "signup") {
    return "Signup failed. Please try again.";
  }

  return detailsMessage ?? error.message;
}

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

    if (score >= 4) return { label: "Strong", value: 100, color: "bg-[#A7C957]" };
    if (score >= 2) return { label: "Good", value: 66, color: "bg-[#D9B76E]" };
    if (score === 1) return { label: "Weak", value: 34, color: "bg-[#C47A4A]" };
    return { label: "Minimum 8 characters", value: 0, color: "bg-[#2C3632]" };
  }, [password]);

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (mode === "signup" && !name.trim()) {
      nextErrors.name = "Enter your full name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "signup") {
        await signup({
          name: name.trim(),
          email: email.trim(),
          password,
          workspaceName: defaultWorkspaceName
        });
      } else {
        await login({
          email: email.trim(),
          password
        });
      }

      router.push("/dashboard");
    } catch (error) {
      setErrors({ form: getBackendErrorMessage(error, mode) });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogle() {
    setErrors({});
    setGoogleLoading(true);
    window.setTimeout(() => {
      setGoogleLoading(false);
      setForgotMessage(mode === "signup" ? "Google sign up will be available soon." : "Google login will be available soon.");
    }, 250);
  }

  const entrance = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 };

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden bg-[#0B0F0E]">
        <div aria-hidden="true" className="auth-chaos-background">
          <Image
            src="/brand/from-chaos-to-clarity.png"
            alt=""
            fill
            sizes="100vw"
            className="scale-105 object-cover opacity-[0.26] blur-[8px] saturate-[0.86]"
          />
          <div className="absolute inset-0 bg-[#0B0F0E]/76" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_28%,rgba(217,183,110,0.14),transparent_30rem),radial-gradient(ellipse_at_18%_78%,rgba(167,201,87,0.12),transparent_28rem)]" />
        </div>
        <div aria-hidden="true" className="cinematic-bg z-[1] opacity-[0.6]">
          <div className="cinematic-bg-grid" />
          <span className="ambient-glow ambient-sage" />
          <span className="ambient-glow ambient-gold" />
          <span className="cinematic-bg-document cinematic-bg-document-one" />
          <span className="cinematic-bg-document cinematic-bg-document-two" />
          <span className="cinematic-bg-document cinematic-bg-document-three" />
          <span className="cinematic-bg-scan cinematic-bg-scan-one" />
          <span className="cinematic-bg-scan cinematic-bg-scan-two" />
          <span className="cinematic-bg-marker cinematic-bg-marker-one" />
          <span className="cinematic-bg-marker cinematic-bg-marker-two" />
          <span className="cinematic-bg-marker cinematic-bg-marker-three" />
        </div>

        <div className={cn("container relative z-10 grid min-h-[calc(100vh-4rem)] items-center gap-10 py-8 lg:grid-cols-[1.03fr_0.97fr]", isSignup ? "lg:py-4" : "lg:py-14")}>
          <motion.aside
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="order-2 hidden max-w-3xl lg:order-1 lg:block"
          >
            <BrandLockup size="large" />
            <div className="mt-10 inline-flex h-8 items-center gap-2 rounded-full border border-[#D9B76E]/40 bg-[#D9B76E]/10 px-3 text-xs font-medium text-[#F0D89B] shadow-[0_0_34px_rgba(217,183,110,0.09)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {copy.badge}
            </div>
            <h1 className="mt-5 max-w-2xl text-5xl font-bold leading-tight text-[#F5F5EF]">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#A2AAA5]">{copy.subtext}</p>

            <div className={cn("mt-9 grid max-w-2xl", isSignup ? "gap-3" : "gap-4")}>
              {copy.features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className={cn(
                      "group flex items-start rounded-lg border border-[#2C3632] bg-[#121817]/82 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur transition hover:border-[#D9B76E]/35 hover:bg-[#1B2421]/70",
                      isSignup ? "gap-3 p-3.5" : "gap-4 p-4",
                      isSignup && index === 2 && "lexai-short-screen-hidden"
                    )}
                  >
                    <span className={cn("flex shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(245,245,239,0.06)] transition", index === 0 ? "border-[#A7C957]/25 bg-[#A7C957]/10 text-[#A7C957]" : index === 1 ? "border-[#6BAA9C]/25 bg-[#6BAA9C]/10 text-[#9BCBC2]" : "border-[#D9B76E]/25 bg-[#D9B76E]/10 text-[#F0D89B]", isSignup ? "h-10 w-10" : "h-11 w-11")}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold leading-6 text-[#F5F5EF]">{feature.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#A2AAA5]">{feature.description}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={cn("flex max-w-xl items-start gap-4 rounded-lg border border-[#6BAA9C]/30 bg-[#6BAA9C]/10", isSignup ? "mt-6 p-3.5" : "mt-8 p-4")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6BAA9C]/15 text-[#9BCBC2]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-6 text-[#F5F5EF]">Secure review workspace</p>
                <p className="mt-1 text-sm leading-6 text-[#A2AAA5]">
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
            <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_50%_12%,rgba(217,183,110,0.2),transparent_22rem),radial-gradient(circle_at_14%_88%,rgba(167,201,87,0.16),transparent_18rem)] blur-xl" />
            <Card className="overflow-hidden rounded-xl border-[#2C3632] bg-[#121817]/90 shadow-[0_30px_110px_rgba(0,0,0,0.48),0_0_0_1px_rgba(245,245,239,0.035),0_0_80px_rgba(217,183,110,0.08)] backdrop-blur-2xl">
              <CardContent className={cn(isSignup ? "p-4 sm:p-5" : "p-7 sm:p-9")}>
                <div className={cn("flex flex-col items-center text-center", isSignup ? "mb-4" : "mb-9")}>
                  <BrandLockup />
                  <h2 className={cn("text-3xl font-semibold leading-9 text-[#F5F5EF]", isSignup ? "mt-3" : "mt-8")}>{copy.title}</h2>
                  <p className={cn("max-w-sm text-sm text-[#A2AAA5]", isSignup ? "mt-1.5 leading-5" : "mt-2 leading-6")}>{copy.subtitle}</p>
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
                        suppressHydrationWarning
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#A2AAA5] transition hover:bg-[#1B2421] hover:text-[#F5F5EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </Field>

                  {mode === "signup" ? (
                    <div id="password-strength" className="space-y-1.5" aria-live="polite">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#2C3632]">
                        <div
                          className={cn("h-full rounded-full transition-all duration-200", passwordStrength.color)}
                          style={{ width: `${passwordStrength.value}%` }}
                        />
                      </div>
                      <p className="text-xs leading-4 text-[#A2AAA5]">Password strength: {passwordStrength.label}</p>
                    </div>
                  ) : null}

                  {mode === "login" ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <label className="flex items-center gap-2 text-[#A2AAA5]">
                        <input
                          suppressHydrationWarning
                          type="checkbox"
                          checked={remember}
                          onChange={(event) => setRemember(event.target.checked)}
                          className="h-4 w-4 rounded border-[#2C3632] bg-[#0B0F0E] accent-[#A7C957]"
                        />
                        Remember me
                      </label>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => setForgotMessage("Password reset flow will be available in the production build.")}
                        className="text-[#D9B76E] transition hover:text-[#F0D89B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957]"
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : (
                    <Field error={errors.terms} errorId="terms-error" compact>
                      <label className="flex items-start gap-3 text-sm leading-5 text-[#A2AAA5]">
                        <input
                          suppressHydrationWarning
                          type="checkbox"
                          checked={terms}
                          onChange={(event) => setTerms(event.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-[#2C3632] bg-[#0B0F0E] accent-[#A7C957]"
                          aria-invalid={Boolean(errors.terms)}
                          aria-describedby={errors.terms ? "terms-error" : undefined}
                        />
                        <span>
                          I agree to the{" "}
                          <Link href="/signup" className="text-[#D9B76E] hover:text-[#F0D89B]">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/signup" className="text-[#D9B76E] hover:text-[#F0D89B]">
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    </Field>
                  )}

                  {forgotMessage ? <p className="rounded-lg border border-[#D9B76E]/30 bg-[#D9B76E]/10 px-3 py-2 text-sm leading-6 text-[#F0D89B]">{forgotMessage}</p> : null}
                  {errors.form ? <p className="rounded-lg border border-[#D66A5E]/30 bg-[#D66A5E]/10 px-3 py-2 text-sm leading-6 text-[#E89A92]">{errors.form}</p> : null}

                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 rounded-xl bg-[#A7C957] text-[#0B0F0E] shadow-[0_16px_34px_rgba(167,201,87,0.2)] hover:bg-[#B8D86C] hover:shadow-[0_18px_42px_rgba(167,201,87,0.24)]"
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
                  className="h-12 w-full gap-3 rounded-xl border-[#D9B76E]/45 bg-white font-medium text-[#18140F] shadow-[0_12px_28px_rgba(0,0,0,0.2)] hover:border-[#D9B76E] hover:bg-[#F5F5EF] hover:text-[#0B0F0E]"
                  onClick={handleGoogle}
                  disabled={isSubmitting || googleLoading}
                >
                  {googleLoading ? <Spinner /> : <GoogleMark />}
                  {googleLoading ? "Connecting" : "Continue with Google"}
                </Button>

                <p className={cn("text-center text-sm leading-6 text-[#A2AAA5]", isSignup ? "mt-3" : "mt-7")}>
                  {copy.footer}{" "}
                  <Link href={copy.footerHref} className="font-medium text-[#D9B76E] transition hover:text-[#F0D89B]">
                    {copy.footerLink}
                  </Link>
                </p>
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center justify-center gap-3 text-center text-xs leading-5 text-[#A2AAA5] lg:hidden">
              <ShieldCheck className="h-4 w-4 text-[#A7C957]" aria-hidden="true" />
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
        src="/brand/lexai-logo-horizontal.png"
        alt="LexAI"
        width={size === "large" ? 230 : 190}
        height={size === "large" ? 75 : 62}
        className={cn("h-auto object-contain drop-shadow-[0_16px_34px_rgba(217,183,110,0.14)]", size === "large" ? "w-[230px]" : "w-[190px]")}
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
        <p id={errorId} className={cn("text-sm text-[#D66A5E]", compact ? "leading-5" : "leading-6")}>
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
