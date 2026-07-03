"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareText,
  Scale,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { safeFetch, safeFetchPaginated } from "@/lib/api-client";
import type { ChatSessionDetail, DocumentDetail, DocumentListItem } from "@/types/api";

const suggestedQuestions = [
  "What should I negotiate first?",
  "Explain the liability clause simply.",
  "Is termination risky?",
  "What clauses are missing?",
  "Summarize this contract for a founder.",
  "What should I ask the vendor to change?"
];

const referencedClauses = [
  { name: "Liability", detail: "High severity", tone: "high" },
  { name: "Privacy", detail: "Medium signal", tone: "medium" },
  { name: "Termination", detail: "Medium signal", tone: "medium" },
  { name: "Payment", detail: "Low signal", tone: "low" }
];

const initialMessages: ChatMessage[] = [
  {
    id: "user-1",
    role: "user",
    text: "What should I negotiate first?"
  },
  {
    id: "ai-1",
    role: "assistant",
    text:
      "The first priority should be the uncapped liability clause. The agreement does not clearly limit aggregate exposure for privacy or commercial claims, which could create excessive financial risk.",
    clause: {
      title: "Liability",
      severity: "High severity",
      action: "Negotiate a liability cap tied to fees or an agreed monetary ceiling."
    },
    confidence: 91,
    nextQuestion: "Explain the liability clause simply."
  },
  {
    id: "user-2",
    role: "user",
    text: "Is the payment section risky?"
  },
  {
    id: "ai-2",
    role: "assistant",
    text:
      "The payment section appears low risk. Payment obligations are mostly clear with standard billing language. However, confirm billing cycles, late fees, and any credit terms before signing.",
    clause: {
      title: "Payment",
      severity: "Low risk"
    },
    confidence: 88,
    nextQuestion: "What should I ask the vendor to change?"
  }
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  clause?: {
    title: string;
    severity: string;
    action?: string;
  };
  confidence?: number;
  nextQuestion?: string;
};

function toneClasses(tone: string) {
  if (tone === "high") {
    return "border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]";
  }

  if (tone === "low") {
    return "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]";
  }

  return "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]";
}

function mockResponseFor(prompt: string, id: string): ChatMessage {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("termination")) {
    return {
      id,
      role: "assistant",
      text:
        "Termination is a medium-risk area. The agreement should more clearly define termination triggers, notice periods, and cure windows so the business knows when it can exit and what obligations survive.",
      clause: {
        title: "Termination",
        severity: "Medium signal",
        action: "Clarify notice periods, cure rights, termination for cause, and post-termination data return."
      },
      confidence: 89,
      nextQuestion: "What clauses are missing?"
    };
  }

  if (normalized.includes("payment")) {
    return {
      id,
      role: "assistant",
      text:
        "Payment is currently low risk. The language is mostly standard, but you should still confirm billing cycles, late fees, renewal pricing, taxes, and any credit terms before signing.",
      clause: {
        title: "Payment",
        severity: "Low risk",
        action: "Confirm billing cadence, late fee mechanics, and renewal or credit terms."
      },
      confidence: 88,
      nextQuestion: "Is termination risky?"
    };
  }

  if (normalized.includes("missing")) {
    return {
      id,
      role: "assistant",
      text:
        "The main missing or underdefined terms are security obligations, a fixed breach notification timeline, stronger indemnity protection, and clearer termination mechanics.",
      clause: {
        title: "Data Processing",
        severity: "Medium signal",
        action: "Add baseline security controls, breach notice timing, and vendor accountability language."
      },
      confidence: 86,
      nextQuestion: "What should I ask the vendor to change?"
    };
  }

  if (normalized.includes("founder") || normalized.includes("summarize")) {
    return {
      id,
      role: "assistant",
      text:
        "Founder summary: this agreement is usable, but not signature-ready. The biggest business issue is uncapped liability. The next issues are unclear termination rights and incomplete data security commitments.",
      clause: {
        title: "Executive summary",
        severity: "Medium risk",
        action: "Prioritize liability cap, termination clarity, and security obligations before execution."
      },
      confidence: 90,
      nextQuestion: "Explain the liability clause simply."
    };
  }

  if (normalized.includes("liability")) {
    return {
      id,
      role: "assistant",
      text:
        "The liability clause means the vendor may not have a clear maximum financial responsibility if something goes wrong. That can be risky because privacy claims, regulatory issues, or service failures could create exposure beyond the contract value.",
      clause: {
        title: "Liability",
        severity: "High severity",
        action: "Ask for a liability cap tied to fees or another negotiated ceiling."
      },
      confidence: 92,
      nextQuestion: "What should I negotiate first?"
    };
  }

  return {
    id,
    role: "assistant",
    text:
      "Based on the uploaded agreement, I would focus first on the clauses that change business exposure: liability, termination, data security obligations, and breach notification timing.",
    clause: {
      title: "Liability",
      severity: "High severity",
      action: "Start by negotiating a liability cap and then tighten the termination and security language."
    },
    confidence: 91,
    nextQuestion: "Explain the liability clause simply."
  };
}

function StatusBadge({ children, tone = "ai" }: { children: React.ReactNode; tone?: "ai" | "medium" | "high" | "low" | "info" }) {
  const tones = {
    ai: "border-[#8B5CF6]/45 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    medium: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    high: "border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]",
    low: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#86EFAC]",
    info: "border-[#3B82F6]/45 bg-[#3B82F6]/10 text-[#BFDBFE]"
  };

  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function ClauseReference({ message }: { message: ChatMessage }) {
  if (!message.clause) {
    return null;
  }

  const tone = message.clause.severity.toLowerCase().includes("high")
    ? "high"
    : message.clause.severity.toLowerCase().includes("low")
      ? "low"
      : "medium";

  return (
    <div className="mt-3 rounded-xl border border-border/80 bg-[#0D1117]/70 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4B5FD]">Referenced clause</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{message.clause.title}</p>
        </div>
        <StatusBadge tone={tone}>{message.clause.severity}</StatusBadge>
      </div>
      {message.clause.action ? (
        <p className="mt-2 border-t border-border/70 pt-2 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-[#BFDBFE]">Recommended action: </span>
          {message.clause.action}
        </p>
      ) : null}
    </div>
  );
}

function GroundingLabel({ message }: { message: ChatMessage }) {
  const label = message.clause ? `References: ${message.clause.title} clause` : "Grounded in uploaded contract";

  return (
    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-medium text-[#C4B5FD]">
      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ChatBubble({ message, onSuggestedQuestion }: { message: ChatMessage; onSuggestedQuestion: (prompt: string) => void }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex gap-3 motion-safe:animate-[lexai-chat-message-in_220ms_ease-out] ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="mt-7 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD] shadow-[0_0_28px_rgba(139,92,246,0.18)] sm:flex">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}

      <div className={`min-w-0 ${isUser ? "order-first max-w-[560px]" : "w-full max-w-[900px]"}`}>
        <div className={`mb-1.5 flex items-center gap-2 ${isUser ? "justify-end" : ""}`}>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isUser ? "You" : "LexAI analyst"}</span>
          {!isUser ? <StatusBadge tone="ai">AI answer</StatusBadge> : null}
        </div>
        <div
          className={[
            "rounded-2xl border p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:p-5",
            isUser
              ? "border-[#3B82F6]/30 bg-[#3B82F6]/15 text-foreground"
              : "border-[#8B5CF6]/30 bg-[#161B22]/95 shadow-[0_0_36px_rgba(139,92,246,0.09),0_8px_24px_rgba(0,0,0,0.18)]"
          ].join(" ")}
        >
          {!isUser ? <GroundingLabel message={message} /> : null}
          <p className={`${isUser ? "text-sm leading-6" : "text-[15px] leading-7"} text-foreground`}>{message.text}</p>
          {!isUser ? (
            <>
              <ClauseReference message={message} />
              <div className="mt-3 flex flex-col gap-3 rounded-xl bg-[#0D1117]/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                  Confidence: <span className="font-semibold text-foreground">{message.confidence}%</span>
                </div>
                {message.nextQuestion ? (
                  <button
                    type="button"
                    onClick={() => onSuggestedQuestion(message.nextQuestion ?? "")}
                    className="inline-flex items-center gap-2 text-left text-sm font-semibold text-primary transition duration-150 ease-out hover:text-[#93C5FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Ask suggested next question: ${message.nextQuestion}`}
                  >
                    {message.nextQuestion}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3" role="status" aria-label="LexAI is typing">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD]">
        <Bot className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="rounded-2xl border border-[#8B5CF6]/35 bg-[#161B22]/95 px-5 py-4 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#C4B5FD] motion-safe:animate-[lexai-typing-dot_1s_ease-in-out_infinite]" />
          <span className="h-2 w-2 rounded-full bg-[#C4B5FD] motion-safe:animate-[lexai-typing-dot_1s_ease-in-out_150ms_infinite]" />
          <span className="h-2 w-2 rounded-full bg-[#C4B5FD] motion-safe:animate-[lexai-typing-dot_1s_ease-in-out_300ms_infinite]" />
        </div>
      </div>
    </div>
  );
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const messageIdRef = useRef(3);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  useEffect(() => {
    let isMounted = true;

    async function resolveSessionId() {
      const params = new URLSearchParams(window.location.search);
      const directSessionId = params.get("sessionId");

      if (directSessionId) {
        return directSessionId;
      }

      const directDocumentId = params.get("documentId");
      const documentId = directDocumentId ?? (await safeFetchPaginated<DocumentListItem>("/documents")).data[0]?.id;

      if (!documentId) {
        return null;
      }

      const document = await safeFetch<DocumentDetail>(`/documents/${documentId}`);
      return document.chatSessions[0]?.id ?? null;
    }

    async function loadSession() {
      setIsLoadingSession(true);

      try {
        const sessionId = await resolveSessionId();

        if (!sessionId) {
          throw new Error("No chat sessions are available.");
        }

        const sessionDetail = await safeFetch<ChatSessionDetail>(`/chat/sessions/${sessionId}`);

        if (isMounted) {
          const apiMessages = sessionDetail.messages.map((message) => ({
            id: message.id,
            role: message.role.toLowerCase() === "user" ? "user" : "assistant",
            text: message.content
          })) satisfies ChatMessage[];

          setSession(sessionDetail);
          setMessages(apiMessages.length > 0 ? apiMessages : initialMessages);
          messageIdRef.current = apiMessages.length + 3;
          setIsFallback(false);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setMessages(initialMessages);
          setIsFallback(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  function sendPrompt(prompt: string) {
    const cleanedPrompt = prompt.trim();

    if (!cleanedPrompt || isSending) {
      return;
    }

    const userId = `user-${messageIdRef.current}`;
    messageIdRef.current += 1;
    const assistantId = `ai-${messageIdRef.current}`;
    messageIdRef.current += 1;

    const userMessage: ChatMessage = {
      id: userId,
      role: "user",
      text: cleanedPrompt
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsSending(true);

    window.setTimeout(() => {
      setMessages((currentMessages) => [...currentMessages, mockResponseFor(cleanedPrompt, assistantId)]);
      setIsSending(false);
      inputRef.current?.focus();
    }, 700);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendPrompt(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendPrompt(input);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1480px] motion-safe:animate-[lexai-section-in_320ms_ease-out]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="flex min-w-0 flex-col rounded-2xl border border-border bg-[#161B22]/70 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
            <header className="border-b border-border/80 px-4 py-3.5 sm:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusBadge tone="ai">
                      <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      {isFallback ? "Backend unavailable — showing demo data" : isLoadingSession ? "Loading session" : "AI Ready"}
                    </StatusBadge>
                    <StatusBadge tone="info">{session?.document?.title ?? "Vendor DPA.pdf"}</StatusBadge>
                  </div>
                  <h1 className="text-2xl font-bold leading-tight text-foreground">{session?.title ?? "Ask LexAI"}</h1>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    Document-aware answers for {session?.document?.title ?? "Vendor Data Processing Agreement"}, grounded in clauses and risk findings.
                  </p>
                </div>
                <div className="rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-2 text-sm leading-5 text-muted-foreground xl:max-w-[300px] 2xl:max-w-[320px]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#C4B5FD]">
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                    Legal analyst mode
                  </div>
                  <p className="mt-1">Grounded in clauses, risk findings, and negotiation actions.</p>
                </div>
              </div>

              <section className="mt-3" aria-labelledby="suggested-prompts-title">
                <h2 id="suggested-prompts-title" className="sr-only">
                  Suggested questions
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 xl:gap-1.5">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendPrompt(question)}
                      disabled={isSending}
                      className="min-h-9 rounded-full border border-border bg-[#1F2937] px-3 py-1 text-sm font-medium leading-5 text-muted-foreground transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#8B5CF6]/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-full sm:px-3 xl:min-h-8 xl:text-xs"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </section>
            </header>

            <section ref={historyRef} className="space-y-5 px-4 py-5 sm:px-5 sm:py-6" aria-label="Chat message history">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} onSuggestedQuestion={sendPrompt} />
              ))}
              {isSending ? <TypingIndicator /> : null}
              <div ref={messagesEndRef} aria-hidden="true" />
            </section>

            <form onSubmit={handleSubmit} className="sticky bottom-3 z-10 mx-3 mb-3 rounded-2xl border border-border bg-[#161B22]/95 p-2.5 shadow-[0_16px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mx-4 sm:mb-4">
              <label htmlFor="ai-chat-input" className="sr-only">
                Ask LexAI about risks, clauses, obligations, or negotiation points
              </label>
              <div className="flex min-w-0 items-end gap-2.5 rounded-xl border border-border bg-[#0D1117] p-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring">
                <Sparkles className="mb-2.5 hidden h-5 w-5 shrink-0 text-[#8B5CF6] sm:block" aria-hidden="true" />
                <textarea
                  ref={inputRef}
                  id="ai-chat-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask about risks, clauses, obligations, or negotiation points..."
                  className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSending}
                />
                <Button type="submit" disabled={!canSend} className="h-10 w-10 shrink-0 px-0" aria-label="Send message to LexAI">
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </div>
              <p className="mt-1.5 px-1 text-xs leading-5 text-muted-foreground">Press Enter to send. Use Shift Enter for a new line.</p>
            </form>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start" aria-label="Document context and AI confidence">
            <section className="rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.22)]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#BFDBFE]">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">Active document</p>
                  <h2 className="mt-1.5 text-lg font-semibold leading-tight text-foreground">{session?.document?.title ?? "Vendor Data Processing Agreement"}</h2>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3">
                  <p className="text-xs font-medium text-[#FCD34D]">Risk</p>
                  <p className="mt-1.5 text-lg font-semibold text-foreground">{(session?.document?.riskScore ?? 74) >= 80 ? "High" : (session?.document?.riskScore ?? 74) >= 50 ? "Medium" : "Low"}</p>
                </div>
                <div className="rounded-xl border border-border bg-[#1F2937] p-3">
                  <p className="text-xs font-medium text-muted-foreground">Score</p>
                  <p className="mt-1.5 text-lg font-semibold text-foreground">{session?.document?.riskScore ?? 74} / 100</p>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href="/reports/demo-report">
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  View Report
                </Link>
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-[#161B22]/95 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
              <h2 className="text-lg font-semibold leading-tight text-foreground">Referenced clauses</h2>
              <div className="mt-3 space-y-2.5">
                {referencedClauses.map((clause) => (
                  <div key={clause.name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#0D1117]/70 px-3 py-2.5">
                    <span className="text-sm font-medium text-foreground">{clause.name}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses(clause.tone)}`}>{clause.detail}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#8B5CF6]/35 bg-[#161B22]/95 p-5 shadow-[0_0_36px_rgba(139,92,246,0.12),0_16px_48px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#C4B5FD]">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B5CF6]">AI confidence</p>
                  <h2 className="mt-1 text-lg font-semibold leading-tight text-foreground">Grounded answer set</h2>
                </div>
              </div>
              <div className="mt-4 space-y-3.5">
                {[
                  { label: "Confidence", value: "91%", progress: 91, icon: ShieldCheck },
                  { label: "Clauses scanned", value: "216", progress: 100, icon: CheckCircle2 },
                  { label: "Risks detected", value: "7", progress: 70, icon: AlertTriangle }
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <p className="truncate text-sm text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#1F2937]" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-[#161B22]/70 p-4">
              <div className="flex items-start gap-3">
                <Scale className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">
                  LexAI provides AI-generated document intelligence and does not replace professional legal advice.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}
