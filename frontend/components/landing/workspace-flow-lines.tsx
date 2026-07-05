"use client";

import { motion, useReducedMotion } from "framer-motion";

const connectorPaths = [
  "M430 300 C356 276 302 248 236 244",
  "M438 280 C420 204 454 150 518 112",
  "M478 300 C544 284 608 250 674 250",
  "M424 338 C350 364 306 418 252 492",
  "M484 344 C554 382 598 430 642 508"
];

export function WorkspaceFlowLines() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.svg
      className="workspace-orbit-lines"
      viewBox="0 0 900 620"
      fill="none"
      aria-hidden="true"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.42 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: 0.78, ease: "easeOut" }}
    >
      <defs>
        <linearGradient id="workspaceOrbitGradient" x1="110" y1="90" x2="790" y2="540" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6BAA9C" stopOpacity="0.05" />
          <stop offset="0.42" stopColor="#A7C957" stopOpacity="0.72" />
          <stop offset="0.72" stopColor="#D9B76E" stopOpacity="0.64" />
          <stop offset="1" stopColor="#D9B76E" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="workspaceNodeGlow">
          <stop stopColor="#F5F5EF" />
          <stop offset="0.45" stopColor="#A7C957" />
          <stop offset="1" stopColor="#A7C957" stopOpacity="0" />
        </radialGradient>
        <filter id="workspaceLineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.ellipse
        className="workspace-orbit-path workspace-orbit-path-main"
        cx="454"
        cy="312"
        rx="300"
        ry="166"
        stroke="url(#workspaceOrbitGradient)"
        initial={shouldReduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.42 }}
        transition={{ duration: shouldReduceMotion ? 0 : 1.05, delay: 0.92, ease: "easeOut" }}
      />
      <motion.ellipse
        className="workspace-orbit-path workspace-orbit-path-secondary"
        cx="454"
        cy="312"
        rx="218"
        ry="242"
        stroke="url(#workspaceOrbitGradient)"
        initial={shouldReduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.42 }}
        transition={{ duration: shouldReduceMotion ? 0 : 1.05, delay: 1.02, ease: "easeOut" }}
      />
      <motion.ellipse
        className="workspace-orbit-path workspace-orbit-path-tilt"
        cx="454"
        cy="312"
        rx="262"
        ry="114"
        stroke="url(#workspaceOrbitGradient)"
        initial={shouldReduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.42 }}
        transition={{ duration: shouldReduceMotion ? 0 : 1, delay: 1.12, ease: "easeOut" }}
      />

      {connectorPaths.map((path, index) => (
        <motion.path
          key={path}
          className="workspace-connector-path"
          d={path}
          initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.42 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.72, delay: 1.08 + index * 0.1, ease: "easeOut" }}
        />
      ))}

      <g className="workspace-moving-signals">
        <circle r="5" fill="#A7C957" filter="url(#workspaceLineGlow)">
          <animateMotion dur="14s" repeatCount="indefinite" path="M154 312 A300 166 0 1 1 754 312 A300 166 0 1 1 154 312" />
        </circle>
        <circle r="4" fill="#D9B76E" filter="url(#workspaceLineGlow)">
          <animateMotion dur="17s" begin="-5s" repeatCount="indefinite" path="M236 312 A218 242 0 1 1 672 312 A218 242 0 1 1 236 312" />
        </circle>
      </g>

      {[
        [236, 244],
        [518, 112],
        [674, 250],
        [252, 492],
        [642, 508],
        [454, 312]
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} className="workspace-line-node" cx={cx} cy={cy} r="7" fill="url(#workspaceNodeGlow)" />
      ))}
    </motion.svg>
  );
}
