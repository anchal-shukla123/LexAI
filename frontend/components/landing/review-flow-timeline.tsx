"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { FileText, ShieldAlert, SquareCheckBig, Upload } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/landing/scroll-reveal";

type ReviewStep = {
  title: string;
  body: string;
  icon: "upload" | "file" | "risk" | "report";
};

const icons = {
  upload: Upload,
  file: FileText,
  risk: ShieldAlert,
  report: SquareCheckBig
};

export function ReviewFlowTimeline({ steps }: { steps: ReviewStep[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 78%", "end 42%"]
  });

  const markerX = useTransform(scrollYProgress, [0, 1], ["5%", "95%"]);

  return (
    <div ref={sectionRef} className="review-flow-stage">
      <div className="review-flow-rail" aria-hidden="true">
        <motion.div
          className="review-flow-rail-fill"
          initial={shouldReduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.34 }}
          transition={{ duration: shouldReduceMotion ? 0 : 1.1, ease: "easeOut" }}
        />
        <motion.div
          className="review-flow-marker"
          style={shouldReduceMotion ? undefined : { left: markerX }}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
        </motion.div>
      </div>

      <Stagger className="review-timeline">
        {steps.map((step, index) => {
          const Icon = icons[step.icon];

          return (
            <StaggerItem key={step.title} className="review-step">
              <div className="review-step-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="review-step-icon">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-semibold leading-7 text-[#F5F5EF]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#A2AAA5]">{step.body}</p>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
