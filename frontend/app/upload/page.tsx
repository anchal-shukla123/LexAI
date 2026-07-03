"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileImage,
  FileText,
  FileType2,
  LockKeyhole,
  SearchCheck,
  ScanText,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TimerReset,
  UploadCloud,
  X
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const allowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];
const maxFileSize = 20 * 1024 * 1024;

const processingSteps = [
  { label: "Upload complete", icon: CheckCircle2 },
  { label: "Extracting text", icon: ScanText },
  { label: "Detecting clauses", icon: FileText },
  { label: "Scoring risk", icon: ShieldCheck },
  { label: "Preparing summary", icon: Sparkles },
  { label: "Report ready", icon: CheckCircle2 }
];

const tips = [
  "Use the final executed contract for the most accurate clause map.",
  "Scanned PDFs and screenshots are accepted for this mock flow.",
  "LexAI keeps this frontend demo local and does not upload files."
];

const formatChips = ["PDF", "DOCX", "PNG", "JPG"];

const analysisItems = [
  { label: "Obligations", description: "Duties, deadlines, and owner commitments.", icon: ClipboardList },
  { label: "Risk clauses", description: "Indemnity, liability, privacy, and exposure points.", icon: ShieldQuestion },
  { label: "Payment terms", description: "Fees, billing cycles, late charges, and credits.", icon: BadgeDollarSign },
  { label: "Termination terms", description: "Exit rights, notice periods, and survival language.", icon: TimerReset },
  { label: "Missing clauses", description: "Gaps LexAI expects in a complete agreement.", icon: SearchCheck },
  { label: "Recommendations", description: "Plain-language next steps for negotiation.", icon: FileCheck2 }
];

const sampleUploads = [
  { name: "Vendor DPA.pdf", size: 860000, type: "application/pdf" },
  { name: "MSA redline.docx", size: 1240000, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { name: "NDA snapshot.jpg", size: 520000, type: "image/jpeg" }
];

type UploadPhase = "idle" | "selected" | "invalid" | "uploading" | "success" | "processing" | "ready";
type UploadFile = Pick<File, "name" | "size" | "type">;

function formatFileSize(size: number) {
  const megabytes = size / (1024 * 1024);
  return `${megabytes < 0.1 ? megabytes.toFixed(2) : megabytes.toFixed(1)} MB`;
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function validateFile(file: UploadFile) {
  if (!allowedExtensions.includes(getExtension(file.name))) {
    return "Unsupported file type. Upload PDF, DOCX, PNG, JPG, or JPEG.";
  }

  if (file.size > maxFileSize) {
    return "File too large. Maximum upload size is 20MB.";
  }

  return "";
}

function FileIcon({ fileName }: { fileName: string }) {
  const extension = getExtension(fileName);

  if ([".png", ".jpg", ".jpeg"].includes(extension)) {
    return <FileImage className="h-5 w-5" aria-hidden="true" />;
  }

  if (extension === ".docx") {
    return <FileType2 className="h-5 w-5" aria-hidden="true" />;
  }

  return <FileText className="h-5 w-5" aria-hidden="true" />;
}

function statusForStep(index: number, activeStep: number, phase: UploadPhase) {
  if (phase === "ready" || index < activeStep) {
    return "Complete";
  }

  if (index === activeStep) {
    return "Processing";
  }

  return "Pending";
}

export default function UploadPage() {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const statusText = useMemo(() => {
    if (phase === "uploading") {
      if (progress < 32) return "Encrypting file locally";
      if (progress < 72) return "Preparing secure analysis workspace";
      return "Finalizing upload package";
    }

    if (phase === "processing") {
      return processingSteps[activeStep]?.label ?? "Preparing summary";
    }

    if (phase === "ready") {
      return "Mock report ready";
    }

    return "Awaiting contract file";
  }, [activeStep, phase, progress]);

  useEffect(() => {
    if (phase !== "uploading") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 8, 100);

        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setPhase("success"), shouldReduceMotion ? 80 : 300);
        }

        return next;
      });
    }, shouldReduceMotion ? 30 : 160);

    return () => window.clearInterval(timer);
  }, [phase, shouldReduceMotion]);

  useEffect(() => {
    if (phase !== "processing") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= processingSteps.length - 1) {
          window.clearInterval(timer);
          window.setTimeout(() => setPhase("ready"), shouldReduceMotion ? 80 : 420);
          return current;
        }

        return current + 1;
      });
    }, shouldReduceMotion ? 60 : 760);

    return () => window.clearInterval(timer);
  }, [phase, shouldReduceMotion]);

  function handleFile(file: UploadFile | undefined) {
    if (!file) {
      return;
    }

    const validationError = validateFile(file);
    setSelectedFile(file);
    setError(validationError);
    setProgress(0);
    setActiveStep(0);
    setPhase(validationError ? "invalid" : "selected");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  function clearFile() {
    setSelectedFile(null);
    setError("");
    setProgress(0);
    setActiveStep(0);
    setPhase("idle");
  }

  function startUpload() {
    if (!selectedFile || error) {
      return;
    }

    setProgress(0);
    setPhase("uploading");
  }

  function startProcessing() {
    setActiveStep(0);
    setPhase("processing");
  }

  const uploadZoneState = phase === "invalid" ? "invalid" : phase === "success" || phase === "ready" ? "success" : phase;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
        >
          <section className="min-w-0">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 inline-flex h-7 items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 text-xs font-medium text-[#C4B5FD]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  AI contract intake
                </p>
                <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">Upload Contract</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                  Upload a legal document and LexAI will extract obligations, risks, clauses, and recommendations.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-2 text-sm font-medium text-[#86EFAC]">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Frontend-only secure demo
              </div>
            </div>

            <Card className="overflow-hidden border-primary/40 bg-card/95 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_48px_rgba(59,130,246,0.08)]">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-dashed p-6 transition duration-150 ease-out sm:p-8 lg:p-10",
                    "bg-[radial-gradient(circle_at_50%_8%,rgba(59,130,246,0.22),transparent_22rem),radial-gradient(circle_at_78%_36%,rgba(139,92,246,0.18),transparent_20rem),linear-gradient(180deg,rgba(31,41,55,0.68),rgba(13,17,23,0.72))]",
                    uploadZoneState === "invalid"
                      ? "border-[#EF4444] bg-[#EF4444]/5 shadow-[0_0_44px_rgba(239,68,68,0.16)]"
                      : isDragging
                        ? "border-primary bg-primary/10 shadow-[0_0_56px_rgba(59,130,246,0.34)]"
                        : uploadZoneState === "success"
                          ? "border-[#22C55E] bg-[#22C55E]/5 shadow-[0_0_48px_rgba(34,197,94,0.18)]"
                          : "border-primary/45 bg-background/55 shadow-[0_0_42px_rgba(59,130,246,0.18)]"
                  )}
                  aria-label="Upload contract dropzone"
                >
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div aria-hidden="true" className="pointer-events-none absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD] sm:flex">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI scan ready
                  </div>

                  <input
                    ref={fileInputRef}
                    id="contract-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />

                  <div className="relative flex flex-col items-center text-center">
                    <motion.div
                      animate={isDragging && !shouldReduceMotion ? { y: [-2, 2, -2] } : undefined}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className={cn(
                        "relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-[0_18px_56px_rgba(59,130,246,0.24)]",
                        uploadZoneState === "invalid"
                          ? "border-[#EF4444]/50 bg-[#EF4444]/10 text-[#FCA5A5]"
                          : uploadZoneState === "success"
                            ? "border-[#22C55E]/50 bg-[#22C55E]/10 text-[#86EFAC]"
                            : "border-primary/50 bg-primary/10 text-primary"
                      )}
                    >
                      <span aria-hidden="true" className="absolute inset-2 rounded-xl border border-white/5" />
                      {uploadZoneState === "success" ? <CheckCircle2 className="h-9 w-9" aria-hidden="true" /> : <UploadCloud className="h-9 w-9" aria-hidden="true" />}
                    </motion.div>

                    <h2 className="mt-6 text-xl font-semibold leading-7 text-foreground">
                      {selectedFile ? selectedFile.name : "Drop your contract here"}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {selectedFile
                        ? "Review the file details, then start the mock AI upload."
                        : "Drag and drop a PDF, DOCX, PNG, JPG, or JPEG file, or choose a document from your device."}
                    </p>

                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {formatChips.map((format) => (
                        <span key={format} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {format}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                      <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                        <UploadCloud className="mr-2 h-5 w-5" aria-hidden="true" />
                        Select File
                      </Button>
                      {phase === "selected" ? (
                        <Button type="button" variant="outline" onClick={startUpload} className="w-full sm:w-auto">
                          Start Upload
                        </Button>
                      ) : null}
                      {phase === "success" ? (
                        <Button type="button" variant="outline" onClick={startProcessing} className="w-full sm:w-auto">
                          Continue to Processing
                        </Button>
                      ) : null}
                      {phase === "ready" ? (
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                          <Link href="/contracts/demo-analysis">View Analysis</Link>
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-col items-center gap-2 text-xs leading-5 text-muted-foreground sm:flex-row">
                      <span>Supported formats: PDF, DOCX, PNG, JPG. Maximum file size: 20MB.</span>
                      <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" aria-hidden="true" />
                      <span className="inline-flex items-center gap-1.5 text-[#86EFAC]">
                        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                        Files stay local in this demo
                      </span>
                    </div>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {selectedFile ? (
                      <motion.div
                        key="file-details"
                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        className="mt-8 rounded-2xl border border-border bg-card/80 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                            <FileIcon fileName={selectedFile.name} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold leading-6 text-foreground">{selectedFile.name}</p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {formatFileSize(selectedFile.size)}
                              <span aria-hidden="true" className="px-2">/</span>
                              {getExtension(selectedFile.name).replace(".", "").toUpperCase() || "Unknown type"}
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={clearFile} className="h-10 w-full px-3 sm:w-auto">
                            <X className="mr-2 h-4 w-4" aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {error ? (
                    <div className="mt-5 flex gap-3 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-sm leading-6 text-[#FCA5A5]" role="alert">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                      <p>
                        <span className="font-semibold">{error}</span> Remove this file and choose a supported contract document to continue.
                      </p>
                    </div>
                  ) : null}

                  {phase === "uploading" || phase === "success" || phase === "processing" || phase === "ready" ? (
                    <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium leading-6 text-foreground">{statusText}</p>
                        <p className="text-sm font-semibold leading-6 text-primary">{phase === "uploading" ? `${progress}%` : "100%"}</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-primary shadow-[0_0_24px_rgba(59,130,246,0.45)]"
                          animate={{ width: `${phase === "uploading" ? progress : 100}%` }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="lexai-analyzes" className="mt-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="lexai-analyzes" className="text-xl font-semibold leading-7 text-foreground">
                    What LexAI analyzes
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    A structured scan for the contract terms that usually drive legal and business risk.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
                  Clause intelligence
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {analysisItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="group rounded-2xl border border-border bg-[#1F2937]/70 p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:border-primary/45 hover:bg-[#1F2937] hover:shadow-[0_16px_44px_rgba(0,0,0,0.22)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition duration-150 ease-out group-hover:border-primary/45 group-hover:shadow-[0_0_26px_rgba(59,130,246,0.18)]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold leading-6 text-foreground">{item.label}</h3>
                          <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {(phase === "processing" || phase === "ready") ? (
              <Card className="mt-6 border-[#8B5CF6]/35 bg-card/95 shadow-[0_16px_48px_rgba(139,92,246,0.12)]">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-[#C4B5FD]" aria-hidden="true" />
                    AI Processing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-6 pt-0">
                  {processingSteps.map((step, index) => {
                    const Icon = step.icon;
                    const status = statusForStep(index, activeStep, phase);

                    return (
                      <div key={step.label} className="relative flex gap-4 rounded-2xl border border-border bg-background p-4">
                        {index < processingSteps.length - 1 ? <span className="absolute left-[31px] top-12 h-5 w-px bg-border" aria-hidden="true" /> : null}
                        <span
                          className={cn(
                            "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                            status === "Complete"
                              ? "border-[#22C55E]/50 bg-[#22C55E]/10 text-[#86EFAC]"
                              : status === "Processing"
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-6 text-foreground">{step.label}</span>
                          <span className="block text-sm leading-6 text-muted-foreground">{status}</span>
                        </span>
                        {status === "Processing" ? (
                          <motion.span
                            className="mt-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_rgba(59,130,246,0.9)]"
                            animate={shouldReduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                  {phase === "ready" ? (
                    <Button asChild className="mt-3 w-full sm:w-auto">
                      <Link href="/contracts/demo-analysis">View Analysis</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <aside className="space-y-5 xl:pt-[92px]">
            <Card className="bg-card/80 shadow-[0_14px_42px_rgba(0,0,0,0.18)]">
              <CardHeader className="p-5 pb-4">
                <CardTitle className="text-lg">Before you upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0">
                {tips.map((tip) => (
                  <div key={tip} className="flex gap-3 rounded-2xl border border-border bg-background/90 p-4 transition duration-150 ease-out hover:border-primary/35 hover:bg-muted/40">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" aria-hidden="true" />
                    <p className="text-sm leading-6 text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-primary/10 shadow-[0_14px_42px_rgba(59,130,246,0.08)]">
              <CardContent className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">Private by design</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This prototype validates and processes files in browser state only. No backend upload, OCR, or real AI is called.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/80">
              <CardHeader className="p-5 pb-4">
                <CardTitle className="text-lg">Recent examples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0">
                {sampleUploads.map((example) => (
                  <button
                    key={example.name}
                    type="button"
                    onClick={() => handleFile(example)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-background/90 p-4 text-left transition duration-150 ease-out hover:border-primary/50 hover:bg-muted/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary">
                      <FileIcon fileName={example.name} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-6 text-foreground">{example.name}</p>
                      <p className="text-xs leading-5 text-muted-foreground">Use sample for mock analysis</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-90 transition duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100">
                      Use sample
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
