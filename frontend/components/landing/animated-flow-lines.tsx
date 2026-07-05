"use client";

const streamPaths = [
  {
    id: "documentToCorePrimary",
    className: "cinema-flow-path cinema-flow-path-primary",
    d: "M132 268 C238 232 294 268 394 306",
    dotClassName: "cinema-flow-dot cinema-flow-dot-teal",
    duration: "4.8s",
  },
  {
    id: "documentToCoreLower",
    className: "cinema-flow-path cinema-flow-path-secondary",
    d: "M154 408 C246 412 312 354 402 328",
    dotClassName: "cinema-flow-dot",
    duration: "5.3s",
    begin: "0.7s",
  },
  {
    id: "coreToClause",
    className: "cinema-flow-path cinema-flow-path-output",
    d: "M532 282 C618 186 672 150 792 146",
    dotClassName: "cinema-flow-dot cinema-flow-dot-gold",
    duration: "5.1s",
    begin: "0.2s",
  },
  {
    id: "coreToRisk",
    className: "cinema-flow-path cinema-flow-path-output cinema-flow-path-delay-one",
    d: "M542 314 C630 286 690 286 806 288",
    dotClassName: "cinema-flow-dot",
    duration: "5.6s",
    begin: "0.9s",
  },
  {
    id: "coreToRecommendation",
    className: "cinema-flow-path cinema-flow-path-output cinema-flow-path-delay-two",
    d: "M532 350 C620 438 682 462 790 452",
    dotClassName: "cinema-flow-dot cinema-flow-dot-gold",
    duration: "6s",
    begin: "1.4s",
  },
  {
    id: "coreToReport",
    className: "cinema-flow-path cinema-flow-path-report",
    d: "M568 306 C666 226 768 216 900 234",
    dotClassName: "cinema-flow-dot cinema-flow-dot-gold",
    duration: "6.4s",
    begin: "0.5s",
  },
  {
    id: "coreToChat",
    className: "cinema-flow-path cinema-flow-path-chat",
    d: "M564 358 C650 538 756 596 900 588",
    dotClassName: "cinema-flow-dot cinema-flow-dot-teal",
    duration: "6.8s",
    begin: "1.8s",
  },
];

export function AnimatedFlowLines() {
  return (
    <svg className="cinema-flow-lines" viewBox="0 0 1040 700" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="cinemaFlowGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6BAA9C" stopOpacity="0.1" />
          <stop offset="34%" stopColor="#A7C957" stopOpacity="0.92" />
          <stop offset="68%" stopColor="#D9B76E" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#A7C957" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id="cinemaFlowQuiet" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6BAA9C" stopOpacity="0.05" />
          <stop offset="48%" stopColor="#A7C957" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#D9B76E" stopOpacity="0.16" />
        </linearGradient>
        <filter id="cinemaFlowGlow" x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {streamPaths.map((path) => (
        <g key={path.id}>
          <path
            className="cinema-flow-halo"
            d={path.d}
            stroke="url(#cinemaFlowQuiet)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            id={path.id}
            className={path.className}
            d={path.d}
            stroke="url(#cinemaFlowGradient)"
            strokeWidth="2.4"
            filter="url(#cinemaFlowGlow)"
          />
          <circle className={path.dotClassName} r="3.2">
            <animateMotion
              dur={path.duration}
              begin={path.begin}
              repeatCount="indefinite"
              path={path.d}
            />
          </circle>
        </g>
      ))}

      <g className="cinema-core-sparks">
        <path d="M455 218 C486 204 524 205 556 222" />
        <path d="M448 442 C488 468 534 464 570 438" />
        <path d="M414 286 C386 316 386 352 414 382" />
        <path d="M590 260 C626 302 628 356 588 402" />
      </g>
    </svg>
  );
}
