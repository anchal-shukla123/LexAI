"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { WorkflowProofScene } from "@/components/landing/workflow-proof-scene";

const proofItems = [
  "Secure Authentication",
  "Workspace Context",
  "Deterministic Analysis",
  "Persisted Findings",
];

export function WorkflowProofSection() {
  return (
    <section id="mvp-transparency" className="landing-section workflow-cinema-section relative z-10">
      <div className="workflow-cinema-fade workflow-cinema-fade-top" aria-hidden="true" />
      <div className="workflow-cinema-fade workflow-cinema-fade-bottom" aria-hidden="true" />
      <div className="workflow-cinema-grid" aria-hidden="true" />
      <div className="workflow-cinema-field workflow-cinema-field-core" aria-hidden="true" />
      <div className="workflow-cinema-field workflow-cinema-field-report" aria-hidden="true" />

      <div className="container relative z-10">
        <motion.div
          className="workflow-cinema-stage"
          initial="hidden"
          animate="show"
          whileInView="show"
          viewport={{ once: true, amount: 0.32 }}
        >
          <motion.div
            className="workflow-cinema-copy"
            variants={{
              hidden: { opacity: 0, y: 34, filter: "blur(8px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            transition={{ duration: 0.82, ease: "easeOut" }}
          >
            <p className="landing-label">MVP transparency</p>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
              Built to prove the workflow first.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#A2AAA5]">
              LexAI uses deterministic mock analysis today &mdash; but the real workflow is working end to end. Authentication, workspace context, uploads, analysis jobs, persisted findings, reports, and chat are all connected and verifiable.
            </p>
          </motion.div>

          <WorkflowProofScene />

          <motion.div
            className="workflow-cinema-proof"
            variants={{
              hidden: { opacity: 0, y: 20, filter: "blur(7px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            transition={{ duration: 0.72, delay: 2.1, ease: "easeOut" }}
          >
            <div className="workflow-proof-rail" aria-label="MVP proof rail">
              {proofItems.map((item) => (
                <span key={item}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>

            <p className="workflow-cinema-trust-line">Transparent by design. Trusted by default.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
