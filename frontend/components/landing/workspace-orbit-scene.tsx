"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpenText,
  FileCheck2,
  FileText,
  MessageSquareText,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { WorkspaceFlowLines } from "@/components/landing/workspace-flow-lines";

const cardTransition = {
  duration: 0.82,
  ease: [0.22, 1, 0.36, 1] as const
};

export function WorkspaceOrbitScene() {
  const shouldReduceMotion = useReducedMotion();

  const revealProps = (delay: number, y = 18) => ({
    initial: shouldReduceMotion ? false : { opacity: 0, y, scale: 0.96, filter: "blur(10px)" },
    whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    viewport: { once: true, amount: 0.38 },
    transition: { ...cardTransition, delay: shouldReduceMotion ? 0 : delay }
  });

  return (
    <motion.div
      className="workspace-orbit-scene"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: 0.18 }}
    >
      <div className="workspace-scene-grid" aria-hidden="true" />
      <div className="workspace-scene-glow workspace-scene-glow-sage" aria-hidden="true" />
      <div className="workspace-scene-glow workspace-scene-glow-gold" aria-hidden="true" />
      <WorkspaceFlowLines />

      <motion.div className="workspace-source-card" {...revealProps(0.74, 24)}>
        <div className="workspace-source-icon">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="workspace-card-kicker">Source document</p>
          <h3>Vendor Agreement.pdf</h3>
          <span>120 pages &middot; Last updated 2m ago</span>
        </div>
        <div className="workspace-document-preview" aria-hidden="true">
          <span className="workspace-document-line workspace-document-line-wide" />
          <span className="workspace-document-line workspace-document-line-medium" />
          <span className="workspace-document-highlight" />
          <span className="workspace-document-line workspace-document-line-short" />
          <span className="workspace-document-line workspace-document-line-wide" />
        </div>
      </motion.div>

      <motion.div className="workspace-orbit-card workspace-orbit-card-clause" {...revealProps(1.42)}>
        <div className="workspace-orbit-card-heading">
          <BookOpenText className="h-4 w-4" aria-hidden="true" />
          <h3>Clause Library</h3>
        </div>
        <p>78 clauses extracted</p>
        <strong>24 flagged</strong>
      </motion.div>

      <motion.div className="workspace-orbit-card workspace-orbit-card-risk" {...revealProps(1.54)}>
        <div className="workspace-orbit-card-heading">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <h3>Risk Findings</h3>
        </div>
        <div className="workspace-risk-row">
          <span>High 3</span>
          <span>Medium 6</span>
          <span>Low 4</span>
        </div>
        <p>13 risks identified</p>
      </motion.div>

      <motion.div className="workspace-orbit-card workspace-orbit-card-chat" {...revealProps(1.78)}>
        <div className="workspace-orbit-card-heading">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          <h3>Chat Q&amp;A</h3>
        </div>
        <p className="workspace-chat-question">What are the renewal terms in this agreement?</p>
        <p className="workspace-chat-answer">Clause 4.2 outlines the renewal terms...</p>
      </motion.div>

      <motion.div className="workspace-orbit-card workspace-orbit-card-recommendations" {...revealProps(1.66)}>
        <div className="workspace-orbit-card-heading">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <h3>Recommendations</h3>
        </div>
        <ul>
          <li>Review limitation of liability</li>
          <li>Clarify termination terms</li>
          <li>Update insurance clause</li>
        </ul>
      </motion.div>

      <motion.div className="workspace-orbit-card workspace-orbit-card-report" {...revealProps(1.9)}>
        <div className="workspace-orbit-card-heading">
          <FileCheck2 className="h-4 w-4" aria-hidden="true" />
          <h3>Report Output</h3>
        </div>
        <p>Plain-English summary</p>
        <strong>Ready for stakeholder review.</strong>
      </motion.div>

      <motion.div
        className="workspace-connected-pill"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.58, delay: 2.08, ease: "easeOut" }}
      >
        <span aria-hidden="true" />
        Everything stays connected
      </motion.div>
    </motion.div>
  );
}
