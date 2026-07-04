"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  scale?: boolean;
  blur?: boolean;
};

export function Reveal({ children, className, delay = 0, scale = false, blur = true }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        shouldReduceMotion
          ? false
          : { opacity: 0, y: 40, scale: scale ? 0.96 : 1, filter: blur ? "blur(8px)" : "blur(0px)" }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.95, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: shouldReduceMotion ? 0 : 0.14
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: shouldReduceMotion ? {} : { opacity: 0, y: 26 },
        show: { opacity: 1, y: 0 }
      }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.82, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
