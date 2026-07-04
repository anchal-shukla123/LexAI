"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

const imageSrc = "/brand/from-chaos-to-clarity.png";

const labels = [
  { text: "Dense terms", className: "chaos-clarity-label-dense", delay: 0.4 },
  { text: "Risk signals", className: "chaos-clarity-label-risk", delay: 0.58 },
  { text: "Structured report", className: "chaos-clarity-label-report", delay: 0.76 }
];

const fragments = [
  "chaos-clarity-fragment-one",
  "chaos-clarity-fragment-two",
  "chaos-clarity-fragment-three",
  "chaos-clarity-fragment-four",
  "chaos-clarity-fragment-five",
  "chaos-clarity-fragment-six",
  "chaos-clarity-fragment-seven",
  "chaos-clarity-fragment-eight"
];

export function ChaosToClaritySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 78%", "end 38%"]
  });
  const imageX = useTransform(scrollYProgress, [0, 1], ["0%", "-4.5%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.02]);
  const labelDrift = useTransform(scrollYProgress, [0, 1], ["0px", "-22px"]);
  const reportDrift = useTransform(scrollYProgress, [0, 1], ["0px", "-34px"]);

  const reveal: Variants = {
    hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" }
  };

  return (
    <section ref={sectionRef} className="chaos-clarity-section relative z-10">
      <motion.div
        className="chaos-clarity-image-pan"
        style={shouldReduceMotion ? undefined : { x: imageX, scale: imageScale }}
        aria-hidden="true"
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="chaos-clarity-overlay-dark" aria-hidden="true" />
      <div className="chaos-clarity-overlay-vignette" aria-hidden="true" />
      <div className="chaos-clarity-overlay-glow" aria-hidden="true" />
      <div className="chaos-clarity-overlay-grid" aria-hidden="true" />
      <div className="chaos-clarity-scan-wave" aria-hidden="true" />
      <div className="chaos-clarity-edge-fade chaos-clarity-edge-top" aria-hidden="true" />
      <div className="chaos-clarity-edge-fade chaos-clarity-edge-bottom" aria-hidden="true" />

      <div className="chaos-clarity-fragments" aria-hidden="true">
        {fragments.map((fragment) => (
          <span key={fragment} className={`chaos-clarity-fragment ${fragment}`} />
        ))}
      </div>

      <div className="container relative z-10 flex min-h-screen items-center py-24 sm:py-28">
        <motion.div
          className="chaos-clarity-copy"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.42 }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.14
              }
            }
          }}
        >
          <motion.p className="landing-label" variants={reveal} transition={{ duration: 0.75, ease: "easeOut" }}>
            Clarity engine
          </motion.p>
          <motion.h2
            className="mt-5 max-w-[11ch] font-serif text-5xl font-semibold leading-[0.96] text-[#F5F5EF] sm:text-6xl lg:text-7xl"
            variants={reveal}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            From legal chaos to contract clarity.
          </motion.h2>
          <motion.p
            className="mt-6 max-w-xl text-lg leading-8 text-[#D2D8D3] sm:text-xl"
            variants={reveal}
            transition={{ duration: 0.82, ease: "easeOut" }}
          >
            Contracts are dense, scattered, and easy to misread. LexAI turns uploaded agreements into structured clauses, risks, recommendations, and reports.
          </motion.p>
          <motion.div variants={reveal} transition={{ duration: 0.82, ease: "easeOut" }}>
            <Link href="#how-it-works" className="chaos-clarity-link">
              See how it works <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <div className="chaos-clarity-labels" aria-hidden="true">
        {labels.map((label, index) => (
          <motion.span
            key={label.text}
            className={`chaos-clarity-label ${label.className}`}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.34 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.72, delay: shouldReduceMotion ? 0 : label.delay, ease: "easeOut" }}
            style={shouldReduceMotion ? undefined : { y: index === 2 ? reportDrift : labelDrift }}
          >
            {label.text}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
