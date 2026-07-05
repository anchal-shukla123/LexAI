"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";

import { AnimatedFlowLines } from "@/components/landing/animated-flow-lines";

const processingSteps = [
  "Parsing document...",
  "Identifying clauses...",
  "Assessing risk...",
  "Structuring findings...",
  "Analysis complete.",
];

const outputCards = [
  {
    className: "cinema-output-card cinema-output-card-clause",
    eyebrow: "Clause structured",
    title: "Auto-Renewal",
    meta: "High Risk",
    body: "Renews automatically unless either party provides 30 days' notice.",
    icon: FileText,
  },
  {
    className: "cinema-output-card cinema-output-card-risk",
    eyebrow: "Risk detected",
    title: "Indemnification",
    meta: "Medium Risk",
    body: "Broad indemnity obligations with uncapped liability.",
    icon: AlertTriangle,
  },
  {
    className: "cinema-output-card cinema-output-card-action",
    eyebrow: "Recommendation",
    title: "Suggested Action",
    meta: "Low Effort",
    body: "Add cap on liability.",
    icon: ShieldCheck,
  },
];

export function WorkflowProofScene() {
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 24, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 24, mass: 0.5 });
  const rotateY = useTransform(smoothX, [-1, 1], shouldReduceMotion ? ["0deg", "0deg"] : ["-4deg", "4deg"]);
  const rotateX = useTransform(smoothY, [-1, 1], shouldReduceMotion ? ["0deg", "0deg"] : ["3deg", "-3deg"]);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (shouldReduceMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  function handleMouseLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.div
      className="cinema-workflow-scene"
      aria-label="LexAI transforms a document into clauses, risks, reports, and chat insight"
      style={{ "--scene-rotate-x": rotateX, "--scene-rotate-y": rotateY } as CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cinema-core-glow cinema-core-glow-sage" aria-hidden="true" />
      <div className="cinema-core-glow cinema-core-glow-gold" aria-hidden="true" />
      <div className="cinema-core-ray cinema-core-ray-one" aria-hidden="true" />
      <div className="cinema-core-ray cinema-core-ray-two" aria-hidden="true" />
      <div className="cinema-core-ray cinema-core-ray-three" aria-hidden="true" />
      <div className="cinema-orbit cinema-orbit-one" aria-hidden="true" />
      <div className="cinema-orbit cinema-orbit-two" aria-hidden="true" />

      <div className="cinema-perspective-stage">
        <AnimatedFlowLines />
        <InputDocumentPanel />
        <LexAiCore />
        <StructuredOutputCluster />
      </div>
    </motion.div>
  );
}

function InputDocumentPanel() {
  return (
    <motion.article
      className="cinema-document-panel"
    >
      <div className="cinema-document-top">
        <span className="cinema-document-icon">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3>MASTER SERVICES AGREEMENT</h3>
          <p>v1_final_MSA.docx</p>
        </div>
      </div>

      <div className="cinema-document-body" aria-label="Annotated sample contract">
        <span className="cinema-doc-line cinema-doc-line-wide" />
        <span className="cinema-doc-line cinema-doc-line-medium" />
        <span className="cinema-doc-note cinema-doc-note-auto">
          <span />
          Auto-renewal?
        </span>
        <span className="cinema-doc-line cinema-doc-line-short" />
        <span className="cinema-doc-line cinema-doc-line-wide" />
        <span className="cinema-doc-note cinema-doc-note-indemnity">
          <span />
          Indemnity
        </span>
        <span className="cinema-doc-line cinema-doc-line-medium" />
        <span className="cinema-doc-note cinema-doc-note-data">
          <span />
          Data residence?
        </span>
        <span className="cinema-doc-line cinema-doc-line-short" />
        <span className="cinema-doc-line cinema-doc-line-wide" />
      </div>
    </motion.article>
  );
}

function LexAiCore() {
  return (
    <motion.div
      className="cinema-core"
    >
      <div className="cinema-core-rings" aria-hidden="true" />
      <div className="cinema-core-orb">
        <Sparkles className="h-8 w-8" aria-hidden="true" />
        <strong>LexAI</strong>
      </div>

      <ol className="cinema-processing-list">
        {processingSteps.map((step) => (
          <li key={step}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

function StructuredOutputCluster() {
  return (
    <div className="cinema-output-cluster" aria-label="Structured LexAI outputs">
      {outputCards.map(({ className, eyebrow, title, meta, body, icon: Icon }) => (
        <motion.article
          key={eyebrow}
          className={className}
        >
          <div className="cinema-output-eyebrow">
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{eyebrow}</span>
          </div>
          <div className="cinema-output-heading">
            <h3>{title}</h3>
            <strong>{meta}</strong>
          </div>
          <p>{body}</p>
        </motion.article>
      ))}

      <ReportReadyCard />
      <ChatInsightCard />
    </div>
  );
}

function ReportReadyCard() {
  return (
    <motion.article
      className="cinema-report-card"
    >
      <div className="cinema-output-eyebrow">
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span>Report generated</span>
      </div>
      <h3>MSA Analysis Report</h3>
      <div className="cinema-report-risk">
        <span>Overall Risk</span>
        <strong>High</strong>
      </div>
      <div className="cinema-report-chart">
        <div className="cinema-risk-donut" aria-hidden="true" />
        <div>
          <p><span className="cinema-risk-dot cinema-risk-dot-high" />High <strong>3</strong></p>
          <p><span className="cinema-risk-dot cinema-risk-dot-medium" />Medium <strong>7</strong></p>
          <p><span className="cinema-risk-dot cinema-risk-dot-low" />Low <strong>4</strong></p>
        </div>
      </div>
      <div className="cinema-report-findings">
        <span><CircleGauge className="h-3.5 w-3.5" aria-hidden="true" />Auto-Renewal Clause</span>
        <span><CircleGauge className="h-3.5 w-3.5" aria-hidden="true" />Indemnification Clause</span>
      </div>
    </motion.article>
  );
}

function ChatInsightCard() {
  return (
    <motion.article
      className="cinema-chat-card"
    >
      <div className="cinema-output-eyebrow">
        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        <span>Chat insight Q&amp;A</span>
      </div>
      <p className="cinema-chat-question">
        {"Question: What's our exposure if we don't negotiate the indemnity clause?"}
      </p>
      <p className="cinema-chat-answer">Answer: High exposure. Indemnity is uncapped and includes IP infringement.</p>
    </motion.article>
  );
}
