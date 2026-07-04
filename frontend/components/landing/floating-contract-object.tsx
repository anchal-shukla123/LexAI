"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Check, FileText, ShieldAlert, SquareCheckBig } from "lucide-react";

const labels = [
  { className: "cinematic-label-liability", title: "Liability flagged", tone: "risk" },
  { className: "cinematic-label-termination", title: "Termination reviewed", tone: "sage" },
  { className: "cinematic-label-security", title: "Security missing", tone: "risk" },
  { className: "cinematic-label-report", title: "Report prepared", tone: "sage" }
];

export function FloatingContractObject() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: Number((x * 5).toFixed(2)), y: Number((-y * 5).toFixed(2)) });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <div
      className="cinematic-review-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          "--tilt-x": `${tilt.x}deg`,
          "--tilt-y": `${tilt.y}deg`
        } as CSSProperties
      }
    >
      <div className="cinematic-orbit cinematic-orbit-one" aria-hidden="true" />
      <div className="cinematic-orbit cinematic-orbit-two" aria-hidden="true" />

      <div className="cinematic-review-object">
        <div className="cinematic-panel cinematic-panel-back" aria-hidden="true" />
        <div className="cinematic-panel cinematic-panel-side" aria-hidden="true" />

        <div className="cinematic-panel cinematic-panel-main">
          <div className="cinematic-scan-surface" aria-hidden="true" />
          <div className="cinematic-panel-grid" aria-hidden="true" />

          <div className="relative z-10 flex items-start justify-between gap-5">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#2C3632] bg-[#1B2421]/92 text-[#A7C957] shadow-[inset_0_1px_0_rgba(245,245,239,0.05)]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-sm font-medium leading-6 text-[#A2AAA5]">Review file</p>
              <h2 className="mt-1 max-w-[16rem] text-2xl font-semibold leading-8 text-[#F5F5EF]">
                Vendor Data Processing Agreement
              </h2>
            </div>

            <div className="cinematic-risk-chip">
              <span className="text-lg font-semibold leading-none">74</span>
              <span className="mt-1 text-[0.58rem] uppercase tracking-[0.14em]">Risk score</span>
            </div>
          </div>

          <div className="relative z-10 mt-9 space-y-3">
            <div className="cinematic-clause-row cinematic-clause-risk">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Uncapped liability exposure</span>
            </div>
            <div className="cinematic-clause-row">
              <SquareCheckBig className="h-4 w-4" aria-hidden="true" />
              <span>Termination notice reviewed</span>
            </div>
            <div className="cinematic-clause-row cinematic-clause-risk">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <span>Security timeline missing</span>
            </div>
          </div>

          <div className="cinematic-report-strip">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#A7C957] text-[#0B0F0E]">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-medium leading-5 text-[#F5F5EF]">Plain-English report</span>
              <span className="block text-xs leading-5 text-[#A2AAA5]">Prepared for review</span>
            </span>
          </div>
        </div>

        <div className="cinematic-clause-block block-one" aria-hidden="true" />
        <div className="cinematic-clause-block block-two" aria-hidden="true" />
        <div className="cinematic-clause-block block-three" aria-hidden="true" />

        {labels.map((label) => (
          <div
            key={label.title}
            className={`cinematic-floating-label ${label.className} ${
              label.tone === "risk" ? "cinematic-label-risk" : "cinematic-label-sage"
            }`}
          >
            <span className="cinematic-label-dot" />
            {label.title}
          </div>
        ))}
      </div>
    </div>
  );
}
