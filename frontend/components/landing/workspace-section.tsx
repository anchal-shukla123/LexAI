"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";

const workspaceCopy =
  "The workspace. A review workspace, not another document dump. LexAI keeps the review connected: clauses, risks, recommendations, chat, and reports all stay tied to the document.";

const sparkles = [
  { left: "18%", top: "18%", size: "4px", delay: "0s", duration: "8.4s", color: "rgba(217, 183, 110, 0.86)" },
  { left: "28%", top: "11%", size: "3px", delay: "-2.2s", duration: "9.8s", color: "rgba(167, 201, 87, 0.8)" },
  { left: "39%", top: "21%", size: "5px", delay: "-4.4s", duration: "10.6s", color: "rgba(217, 183, 110, 0.78)" },
  { left: "12%", top: "39%", size: "3px", delay: "-1.4s", duration: "8.8s", color: "rgba(107, 170, 156, 0.82)" },
  { left: "33%", top: "42%", size: "4px", delay: "-6.2s", duration: "11.2s", color: "rgba(167, 201, 87, 0.88)" },
  { left: "47%", top: "36%", size: "3px", delay: "-3.1s", duration: "9.2s", color: "rgba(217, 183, 110, 0.72)" },
  { left: "22%", top: "58%", size: "5px", delay: "-5.4s", duration: "10.8s", color: "rgba(217, 183, 110, 0.82)" },
  { left: "42%", top: "61%", size: "4px", delay: "-0.8s", duration: "8.9s", color: "rgba(167, 201, 87, 0.78)" },
  { left: "53%", top: "69%", size: "3px", delay: "-7.1s", duration: "12s", color: "rgba(107, 170, 156, 0.76)" },
  { left: "15%", top: "77%", size: "3px", delay: "-4.8s", duration: "9.6s", color: "rgba(217, 183, 110, 0.72)" },
  { left: "36%", top: "82%", size: "4px", delay: "-2.7s", duration: "11.6s", color: "rgba(167, 201, 87, 0.82)" },
  { left: "58%", top: "53%", size: "3px", delay: "-6.6s", duration: "10.2s", color: "rgba(217, 183, 110, 0.64)" }
];

export function WorkspaceSection() {
  const shouldReduceMotion = useReducedMotion();
  const imageX = useSpring(0, { stiffness: 95, damping: 26, mass: 0.25 });
  const imageY = useSpring(0, { stiffness: 95, damping: 26, mass: 0.25 });
  const glowX = useSpring(0, { stiffness: 80, damping: 24, mass: 0.28 });
  const glowY = useSpring(0, { stiffness: 80, damping: 24, mass: 0.28 });
  const particleX = useSpring(0, { stiffness: 70, damping: 22, mass: 0.3 });
  const particleY = useSpring(0, { stiffness: 70, damping: 22, mass: 0.3 });

  function handlePointerMove(event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) {
    if (
      shouldReduceMotion ||
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    imageX.set(x * 5);
    imageY.set(y * 5);
    glowX.set(x * 11);
    glowY.set(y * 11);
    particleX.set(x * 14);
    particleY.set(y * 14);
  }

  function resetParallax() {
    imageX.set(0);
    imageY.set(0);
    glowX.set(0);
    glowY.set(0);
    particleX.set(0);
    particleY.set(0);
  }

  return (
    <section
      id="how-it-works"
      className="workspace-cinematic-section relative z-10 scroll-mt-24"
      onPointerMove={handlePointerMove}
      onMouseMove={handlePointerMove}
      onPointerLeave={resetParallax}
      onMouseLeave={resetParallax}
    >
      <span className="sr-only">{workspaceCopy}</span>

      <div className="workspace-cinematic-grid" aria-hidden="true" />

      <motion.div
        className="workspace-cinematic-scene"
      >
        <motion.div
          className="workspace-cinematic-image-layer"
          style={{ x: imageX, y: imageY }}
          aria-hidden="true"
        >
          <div className="workspace-cinematic-image" />
        </motion.div>

        <div className="workspace-cinematic-edge-fades" aria-hidden="true" />
        <div className="workspace-cinematic-text-protect" aria-hidden="true" />

        <motion.div
          className="workspace-cinematic-glow"
          style={{ x: glowX, y: glowY }}
          aria-hidden="true"
        />

        <motion.div
          className="workspace-cinematic-rays"
          style={{ x: glowX, y: glowY }}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </motion.div>

        <motion.div
          className="workspace-cinematic-particles"
          style={{ x: particleX, y: particleY }}
          aria-hidden="true"
        >
          {sparkles.map((sparkle, index) => (
            <span
              key={`${sparkle.left}-${sparkle.top}`}
              style={
                {
                  "--sparkle-left": sparkle.left,
                  "--sparkle-top": sparkle.top,
                  "--sparkle-size": sparkle.size,
                  "--sparkle-delay": sparkle.delay,
                  "--sparkle-duration": sparkle.duration,
                  "--sparkle-color": sparkle.color
                } as CSSProperties
              }
              className={`workspace-cinematic-particle workspace-cinematic-particle-${index + 1}`}
            />
          ))}
        </motion.div>

        <div className="workspace-cinematic-sweep" aria-hidden="true" />
      </motion.div>

      <div className="workspace-cinematic-mobile-copy" aria-hidden="true">
        <p>The workspace</p>
        <h2>A review workspace, not another document dump.</h2>
        <span>
          LexAI keeps the review connected: clauses, risks, recommendations, chat, and reports all stay tied to the document.
        </span>
      </div>
    </section>
  );
}
