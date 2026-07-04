"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Stagger, StaggerItem } from "@/components/landing/scroll-reveal";

type WorkspacePanel = {
  eyebrow: string;
  title: string;
  body: string;
  tone: "sage" | "gold";
};

export function WorkspacePanels({ panels }: { panels: WorkspacePanel[] }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Stagger className="workspace-panels">
      <motion.svg
        className="workspace-connections"
        viewBox="0 0 680 440"
        fill="none"
        aria-hidden="true"
        initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: shouldReduceMotion ? 0 : 1.15, ease: "easeOut" }}
      >
        <motion.path d="M190 112 C300 86 356 152 454 170" />
        <motion.path d="M464 220 C376 286 302 296 202 340" />
        <motion.path d="M196 142 C244 240 312 310 434 342" />
      </motion.svg>

      {panels.map((panel, index) => (
        <StaggerItem key={panel.eyebrow} className={`workspace-panel workspace-panel-${index + 1}`}>
          <p className={panel.tone === "gold" ? "text-[#D9B76E]" : "text-[#A7C957]"}>{panel.eyebrow}</p>
          <h3 className="mt-4 text-2xl font-semibold leading-8 text-[#F5F5EF]">{panel.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[#A2AAA5]">{panel.body}</p>
          <span className={panel.tone === "gold" ? "workspace-pulse workspace-pulse-gold" : "workspace-pulse"} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
