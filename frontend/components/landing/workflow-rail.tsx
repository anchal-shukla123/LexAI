"use client";

import { motion, useReducedMotion } from "framer-motion";

const workflowSteps = [
  { title: "Extract", body: "Key clauses and data" },
  { title: "Assess", body: "Identify risks and issues" },
  { title: "Recommend", body: "Suggest actions and clauses" },
  { title: "Report", body: "Generate outputs and summaries" }
];

export function WorkflowRail() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="workspace-workflow" aria-label="Review workflow">
      <div className="workspace-workflow-heading">Review workflow</div>
      <div className="workspace-workflow-rail" aria-hidden="true">
        <motion.span
          className="workspace-workflow-line"
          initial={shouldReduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.55 }}
          transition={{ duration: shouldReduceMotion ? 0 : 1, delay: 0.28, ease: "easeOut" }}
        />
        <motion.span
          className="workspace-workflow-signal"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.55 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.98 }}
        />
      </div>
      <div className="workspace-workflow-steps">
        {workflowSteps.map((step, index) => (
          <motion.div
            key={step.title}
            className="workspace-workflow-step"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.62, delay: 0.46 + index * 0.12, ease: "easeOut" }}
          >
            <span className="workspace-workflow-node" aria-hidden="true" />
            <span className="workspace-workflow-index">{index + 1}</span>
            <strong>{step.title}</strong>
            <span>{step.body}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
