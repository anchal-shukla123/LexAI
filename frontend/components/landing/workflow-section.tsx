"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";

const proofItems = [
  "Secure Authentication",
  "Workspace Context",
  "Deterministic Analysis",
  "Persisted Findings",
];

const particles = [
  { x: 11, y: 44, dx: 96, dy: -18, size: 5, delay: -0.2, duration: 9.2, tone: "sage" },
  { x: 16, y: 58, dx: 88, dy: 10, size: 4, delay: -2.6, duration: 10.4, tone: "teal" },
  { x: 22, y: 35, dx: 76, dy: 18, size: 3, delay: -4.1, duration: 8.8, tone: "gold" },
  { x: 29, y: 70, dx: 74, dy: -22, size: 4, delay: -1.4, duration: 11.5, tone: "sage" },
  { x: 35, y: 47, dx: 58, dy: -6, size: 5, delay: -5.4, duration: 9.7, tone: "gold" },
  { x: 41, y: 29, dx: 38, dy: 20, size: 3, delay: -3.3, duration: 12.2, tone: "teal" },
  { x: 44, y: 61, dx: 34, dy: -17, size: 4, delay: -6.8, duration: 9.4, tone: "sage" },
  { x: 50, y: 42, dx: 26, dy: 8, size: 6, delay: -0.9, duration: 8.5, tone: "gold" },
  { x: 54, y: 54, dx: 28, dy: -16, size: 3, delay: -7.1, duration: 10.8, tone: "sage" },
  { x: 58, y: 33, dx: 42, dy: 12, size: 4, delay: -4.8, duration: 9.9, tone: "teal" },
  { x: 63, y: 65, dx: 44, dy: -8, size: 5, delay: -2.1, duration: 11.1, tone: "gold" },
  { x: 68, y: 47, dx: 36, dy: 18, size: 3, delay: -6.2, duration: 8.9, tone: "sage" },
  { x: 73, y: 36, dx: 30, dy: -15, size: 4, delay: -3.8, duration: 10.6, tone: "gold" },
  { x: 78, y: 57, dx: 22, dy: 10, size: 3, delay: -5.7, duration: 9.1, tone: "teal" },
  { x: 83, y: 42, dx: 18, dy: -8, size: 5, delay: -1.8, duration: 12, tone: "sage" },
  { x: 88, y: 63, dx: 14, dy: 7, size: 3, delay: -7.6, duration: 10.2, tone: "gold" },
];

const cinematicEase = [0.22, 1, 0.36, 1] as const;
const visualEase = [0.16, 1, 0.3, 1] as const;

const sectionVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.08,
    },
  },
};

const copyVariants: Variants = {
  hidden: { opacity: 0, y: 36, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.86, ease: cinematicEase },
  },
};

const proofVariants: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(7px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.72, delay: 0.18, ease: cinematicEase },
  },
};

const visualVariants: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.96, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 1.12, delay: 0.22, ease: visualEase },
  },
};

const proofItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.48, ease: "easeOut" },
  },
};

export function WorkflowSection() {
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
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.32 }}
        >
          <WorkflowTextBlock />
          <WorkflowVisual />
          <WorkflowProofBlock />
        </motion.div>
      </div>
    </section>
  );
}

function WorkflowTextBlock() {
  return (
    <motion.div className="workflow-cinema-copy" variants={copyVariants}>
      <p className="landing-label">MVP transparency</p>
      <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#F5F5EF] sm:text-5xl">
        Built to prove the workflow first.
      </h2>
      <p className="mt-6 text-lg leading-8 text-[#A2AAA5]">
        LexAI uses deterministic mock analysis today, but the real workflow is working end to end.
        Authentication, workspace context, uploads, analysis jobs, persisted findings, reports, and chat
        are all connected and verifiable.
      </p>
    </motion.div>
  );
}

function WorkflowProofBlock() {
  return (
    <motion.div className="workflow-cinema-proof" variants={proofVariants}>
      <motion.div
        className="workflow-proof-rail"
        aria-label="MVP proof rail"
        variants={sectionVariants}
      >
        {proofItems.map((item) => (
          <motion.span key={item} variants={proofItemVariants}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {item}
          </motion.span>
        ))}
      </motion.div>

      <p className="workflow-cinema-trust-line">Transparent by design. Trusted by default.</p>
    </motion.div>
  );
}

function WorkflowVisual() {
  const shouldReduceMotion = useReducedMotion();
  const visualRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 95, damping: 26, mass: 0.55 });
  const smoothY = useSpring(pointerY, { stiffness: 95, damping: 26, mass: 0.55 });

  const imageX = useTransform(smoothX, [-1, 1], shouldReduceMotion ? [0, 0] : [-5, 5]);
  const imageY = useTransform(smoothY, [-1, 1], shouldReduceMotion ? [0, 0] : [-4, 4]);
  const glowX = useTransform(smoothX, [-1, 1], shouldReduceMotion ? [0, 0] : [-11, 11]);
  const glowY = useTransform(smoothY, [-1, 1], shouldReduceMotion ? [0, 0] : [-9, 9]);
  const rayX = useTransform(smoothX, [-1, 1], shouldReduceMotion ? [0, 0] : [-11, 11]);
  const rayY = useTransform(smoothY, [-1, 1], shouldReduceMotion ? [0, 0] : [-8, 8]);
  const particleX = useTransform(smoothX, [-1, 1], shouldReduceMotion ? [0, 0] : [-13, 13]);
  const particleY = useTransform(smoothY, [-1, 1], shouldReduceMotion ? [0, 0] : [-10, 10]);
  const highlightX = useTransform(smoothX, [-1, 1], shouldReduceMotion ? [0, 0] : [-8, 8]);
  const highlightY = useTransform(smoothY, [-1, 1], shouldReduceMotion ? [0, 0] : [-6, 6]);

  useEffect(() => {
    function resetPointer() {
      pointerX.set(0);
      pointerY.set(0);
    }

    if (shouldReduceMotion) {
      resetPointer();
      return;
    }

    function resetWhenOutside(event: globalThis.PointerEvent) {
      if (window.innerWidth < 1024) {
        resetPointer();
        return;
      }

      const visual = visualRef.current;
      if (!visual) {
        return;
      }

      const rect = visual.getBoundingClientRect();
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;

      if (isOutside) {
        resetPointer();
      }
    }

    window.addEventListener("pointermove", resetWhenOutside, { passive: true });
    window.addEventListener("blur", resetPointer);

    return () => {
      window.removeEventListener("pointermove", resetWhenOutside);
      window.removeEventListener("blur", resetPointer);
    };
  }, [pointerX, pointerY, shouldReduceMotion]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion || window.innerWidth < 1024) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.div
      ref={visualRef}
      className="workflow-visual"
      aria-label="Upload to LexAI analysis stream to structured outputs"
      variants={visualVariants}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="workflow-visual-depth-field" aria-hidden="true" />

      <motion.div
        className="workflow-visual-image-layer"
        style={{ x: imageX, y: imageY }}
      >
        <motion.div
          className="workflow-visual-image-shell"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.075 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <Image
            src="/sections/workflow-visual.png"
            alt="LexAI workflow from document upload through analysis stream to structured findings, report, and chat output"
            fill
            sizes="(max-width: 1023px) 100vw, 68vw"
            className="workflow-visual-image"
            priority={false}
          />
        </motion.div>
      </motion.div>

      <motion.div className="workflow-visual-glow-layer" style={{ x: glowX, y: glowY }} aria-hidden="true">
        <div className="workflow-core-glow workflow-core-glow-sage" />
        <div className="workflow-core-glow workflow-core-glow-gold" />
        <div className="workflow-core-halo" />
      </motion.div>

      <motion.svg
        className="workflow-ray-layer"
        viewBox="0 0 1000 640"
        preserveAspectRatio="none"
        style={{ x: rayX, y: rayY }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="workflowRayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(107, 170, 156, 0)" />
            <stop offset="38%" stopColor="rgba(167, 201, 87, 0.62)" />
            <stop offset="58%" stopColor="rgba(217, 183, 110, 0.58)" />
            <stop offset="100%" stopColor="rgba(167, 201, 87, 0)" />
          </linearGradient>
        </defs>
        <path className="workflow-ray workflow-ray-one" d="M54 304 C250 236 385 288 498 318 S742 386 946 310" />
        <path className="workflow-ray workflow-ray-two" d="M82 378 C252 332 374 356 512 337 S738 278 916 354" />
        <path className="workflow-ray workflow-ray-three" d="M74 244 C250 294 382 232 505 289 S746 344 926 238" />
        <path className="workflow-ray workflow-ray-four" d="M118 456 C298 412 410 414 532 382 S744 386 902 444" />
        <path className="workflow-ray workflow-ray-five" d="M126 176 C294 214 426 202 522 249 S720 294 894 190" />
        <circle className="workflow-ray-dot workflow-ray-dot-one" r="4" cx="0" cy="0" />
        <circle className="workflow-ray-dot workflow-ray-dot-two" r="3.5" cx="0" cy="0" />
      </motion.svg>

      <motion.div className="workflow-particle-layer" style={{ x: particleX, y: particleY }} aria-hidden="true">
        {particles.map((particle, index) => (
          <span
            key={`${particle.x}-${particle.y}-${index}`}
            className={`workflow-particle workflow-particle-${particle.tone}`}
            style={
              {
                "--particle-x": `${particle.x}%`,
                "--particle-y": `${particle.y}%`,
                "--particle-dx": `${particle.dx}px`,
                "--particle-dy": `${particle.dy}px`,
                "--particle-size": `${particle.size}px`,
                "--particle-delay": `${particle.delay}s`,
                "--particle-duration": `${particle.duration}s`,
              } as CSSProperties
            }
          />
        ))}
      </motion.div>

      <motion.div className="workflow-highlight-layer" style={{ x: highlightX, y: highlightY }} aria-hidden="true" />
      <div className="workflow-visual-edge-mask" aria-hidden="true" />
      <div className="workflow-visual-shimmer" aria-hidden="true" />
    </motion.div>
  );
}
