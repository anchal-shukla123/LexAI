import type { ClauseCategory } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

export type RewriteGoal = "balanced" | "buyer_friendly" | "seller_friendly" | "shorter" | "stronger_protection";

type RewriteRisk = {
  title: string;
  description: string;
  impact: string | null;
  recommendationHint: string | null;
  ruleId: string | null;
};

type RewriteRecommendation = {
  title: string;
  description: string;
  priority: number;
};

type RewriteContext = {
  category: ClauseCategory;
  title: string;
  sourceText: string;
  risks: RewriteRisk[];
  recommendations: RewriteRecommendation[];
  goal: RewriteGoal;
  userInstruction?: string;
};

type RewriteDraft = {
  rewrittenClause: string;
  rewriteStrategy: string;
  keyChanges: string[];
  negotiationPoints: string[];
  riskReductionNotes: string[];
};

const disclaimer = "Rule-based drafting aid only. LexAI does not provide legal advice; have qualified counsel review this language before use.";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentence(value: string) {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function unique(values: string[]) {
  return [...new Set(values.map(sentence).filter(Boolean))];
}

function goalLabel(goal: RewriteGoal) {
  if (goal === "buyer_friendly") return "buyer-friendly";
  if (goal === "seller_friendly") return "seller-friendly";
  if (goal === "shorter") return "shorter";
  if (goal === "stronger_protection") return "stronger protection";
  return "balanced";
}

function combinedSignals(input: RewriteContext) {
  return normalizeWhitespace(
    [
      input.title,
      input.sourceText,
      ...input.risks.flatMap((risk) => [risk.title, risk.description, risk.impact ?? "", risk.recommendationHint ?? "", risk.ruleId ?? ""]),
      ...input.recommendations.flatMap((recommendation) => [recommendation.title, recommendation.description]),
      input.userInstruction ?? ""
    ].join(" ")
  ).toLowerCase();
}

function mentionsAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function partyTerms(goal: RewriteGoal) {
  if (goal === "buyer_friendly" || goal === "stronger_protection") {
    return {
      protectedParty: "Customer",
      counterparty: "Supplier",
      cap: "the greater of the fees paid or payable in the twelve months before the claim or the amount recoverable under Supplier's insurance",
      terminationCure: "fifteen (15) days",
      paymentDisputeWindow: "thirty (30) days"
    };
  }

  if (goal === "seller_friendly") {
    return {
      protectedParty: "Supplier",
      counterparty: "Customer",
      cap: "the fees paid by Customer in the three months before the claim",
      terminationCure: "thirty (30) days",
      paymentDisputeWindow: "ten (10) days"
    };
  }

  return {
    protectedParty: "each party",
    counterparty: "the other party",
    cap: "the fees paid or payable under the agreement in the twelve months before the claim",
    terminationCure: "thirty (30) days",
    paymentDisputeWindow: "fifteen (15) days"
  };
}

function maybeInstruction(input: RewriteContext) {
  return input.userInstruction ? ` Additional drafting instruction considered: ${sentence(input.userInstruction)}` : "";
}

function baseNotes(input: RewriteContext) {
  const notes = input.risks.map((risk) => risk.recommendationHint ?? risk.description);
  return unique([
    ...notes,
    ...input.recommendations.map((recommendation) => recommendation.description),
    `Rewrite goal: ${goalLabel(input.goal)}.`
  ]);
}

function liabilityRewrite(input: RewriteContext): RewriteDraft {
  const terms = partyTerms(input.goal);
  const signals = combinedSignals(input);
  const missingCap = mentionsAny(signals, [/missing.*cap/, /uncapped/, /liability.*cap/, /limitation.*liability/]);
  const missingIndirect = mentionsAny(signals, [/indirect/, /consequential/, /special damages/, /damage exclusion/]);
  const carveouts =
    input.goal === "seller_friendly"
      ? "This cap does not limit liability for payment obligations, confidentiality breaches, fraud, willful misconduct, or matters that cannot legally be limited."
      : "This cap does not limit liability for confidentiality breaches, data security incidents, indemnity obligations, fraud, willful misconduct, unpaid fees, or matters that cannot legally be limited.";

  const rewrittenClause = unique([
    `Limitation of Liability. Except for the exclusions stated below, each party's aggregate liability arising out of or relating to this agreement will not exceed ${terms.cap}.`,
    "Neither party will be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, or data, even if advised that such damages may occur.",
    carveouts,
    `${terms.protectedParty === "each party" ? "The parties" : terms.protectedParty} will use commercially reasonable efforts to mitigate losses and promptly notify ${terms.counterparty} of any claim.${maybeInstruction(input)}`
  ]).join(" ");

  return {
    rewrittenClause,
    rewriteStrategy: `Added a ${goalLabel(input.goal)} liability framework with a clear aggregate cap, damages exclusion, and negotiated carveouts.`,
    keyChanges: unique([
      missingCap ? "Added an aggregate liability cap." : "Clarified the liability cap.",
      missingIndirect ? "Added exclusion for indirect and consequential damages." : "Preserved indirect damages exclusion language.",
      "Defined carveouts that should remain outside the cap.",
      "Added mitigation and notice language."
    ]),
    negotiationPoints: unique([
      "Confirm the liability cap amount and measurement period.",
      "Decide whether confidentiality, data security, indemnity, and payment obligations should be uncapped.",
      "Check whether insurance requirements support the proposed exposure.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces uncapped exposure by setting a measurable aggregate cap.",
      "Limits remote damages categories that often create outsized exposure.",
      "Keeps high-impact exceptions visible for business negotiation."
    ])
  };
}

function terminationRewrite(input: RewriteContext): RewriteDraft {
  const terms = partyTerms(input.goal);
  const convenience =
    input.goal === "buyer_friendly"
      ? "Customer may terminate for convenience on thirty (30) days' written notice."
      : input.goal === "seller_friendly"
        ? "Either party may terminate for convenience only if expressly stated in an applicable order form."
        : "Either party may terminate for convenience on sixty (60) days' written notice if no active statement of work would be materially disrupted.";

  return {
    rewrittenClause: unique([
      `Termination. Either party may terminate this agreement for material breach if the breaching party fails to cure the breach within ${terms.terminationCure} after written notice describing the breach in reasonable detail.`,
      convenience,
      "Either party may terminate immediately if the other party becomes insolvent, ceases business operations, or violates confidentiality, security, or legal compliance obligations in a way that cannot reasonably be cured.",
      "Upon termination, accrued payment obligations survive, each party will return or destroy confidential information as required, and transition assistance will be provided for a commercially reasonable period if needed to avoid service disruption.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Converted termination rights into a ${goalLabel(input.goal)} mutual structure with notice, cure, immediate termination triggers, and survival mechanics.`,
    keyChanges: unique([
      "Made material-breach termination mutual.",
      "Added written notice and cure period.",
      "Added immediate termination triggers for insolvency and uncured high-impact breaches.",
      "Clarified post-termination payment, confidentiality, and transition obligations."
    ]),
    negotiationPoints: unique([
      "Negotiate the cure period for payment breaches versus non-payment breaches.",
      "Decide whether termination for convenience is acceptable and whether fees apply.",
      "Confirm survival of confidentiality, payment, indemnity, IP, and dispute terms.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces unilateral termination risk by giving both parties equivalent breach remedies.",
      "Creates a practical cure path before contract termination.",
      "Preserves operational continuity after termination."
    ])
  };
}

function paymentRewrite(input: RewriteContext): RewriteDraft {
  const terms = partyTerms(input.goal);
  const lateFee = input.goal === "seller_friendly" ? "1.5% per month or the maximum allowed by law" : "1.0% per month or the maximum allowed by law, whichever is lower";

  return {
    rewrittenClause: unique([
      `Payment. Undisputed invoices are due within thirty (30) days after receipt unless the applicable order form states otherwise.`,
      `Customer may dispute an invoice in good faith by giving written notice within ${terms.paymentDisputeWindow} after receipt, identifying the disputed amount and the basis for the dispute.`,
      "The parties will work promptly and in good faith to resolve invoice disputes, and Customer will timely pay all undisputed amounts.",
      `Late undisputed amounts may accrue interest at ${lateFee}. Supplier may suspend services only after written notice and a reasonable opportunity to cure.`,
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Added a ${goalLabel(input.goal)} payment process with disputed-invoice handling, undisputed payment obligations, late-fee boundaries, and suspension notice.`,
    keyChanges: unique([
      "Added a good-faith invoice dispute process.",
      "Separated disputed amounts from undisputed payment obligations.",
      "Added notice before service suspension.",
      "Clarified late-fee treatment."
    ]),
    negotiationPoints: unique([
      "Confirm invoice due date and dispute window.",
      "Decide whether setoff or withholding rights should be allowed.",
      "Confirm when suspension rights become available.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces payment ambiguity by requiring timely dispute notices.",
      "Protects cash flow by preserving payment of undisputed amounts.",
      "Limits operational disruption through suspension notice and cure."
    ])
  };
}

function confidentialityRewrite(input: RewriteContext): RewriteDraft {
  const recipientStandard = input.goal === "stronger_protection" || input.goal === "buyer_friendly" ? "at least the same degree of care it uses for its own confidential information and no less than reasonable care" : "reasonable care";

  return {
    rewrittenClause: unique([
      `Confidentiality. Each party may receive non-public business, technical, financial, security, product, customer, or legal information from the other party that is marked confidential or should reasonably be understood as confidential.`,
      `The receiving party will protect confidential information using ${recipientStandard}, use it only to perform or receive benefits under this agreement, and disclose it only to personnel, affiliates, contractors, and advisors who need to know and are bound by confidentiality obligations at least as protective as this clause.`,
      "Confidential information does not include information that is independently developed without use of the disclosing party's information, lawfully received from a third party, publicly available without breach, or already known without restriction.",
      "If legally compelled to disclose confidential information, the receiving party will provide prompt notice where legally permitted and reasonably cooperate to limit disclosure.",
      "These obligations survive for five (5) years after disclosure, and trade secrets remain protected for as long as they qualify as trade secrets under applicable law.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Created a ${goalLabel(input.goal)} confidentiality clause with scope, use limits, permitted recipients, exclusions, compelled disclosure, and survival.`,
    keyChanges: unique([
      "Defined confidential information broadly.",
      "Added use and disclosure restrictions.",
      "Added standard exclusions and compelled-disclosure process.",
      "Added survival period and trade-secret protection."
    ]),
    negotiationPoints: unique([
      "Confirm survival period and whether trade secrets remain protected indefinitely.",
      "Decide whether affiliates and contractors may receive confidential information.",
      "Add data-security obligations if confidential information includes personal or regulated data.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces leakage risk by defining permitted use and recipients.",
      "Adds enforceable handling standards.",
      "Preserves protection after contract termination."
    ])
  };
}

function indemnityRewrite(input: RewriteContext): RewriteDraft {
  const scope =
    input.goal === "seller_friendly"
      ? "third-party claims alleging that the indemnifying party's materials, as provided under this agreement, infringe intellectual property rights"
      : "third-party claims arising from infringement, confidentiality breaches, data security incidents, gross negligence, willful misconduct, or violation of law by the indemnifying party";

  return {
    rewrittenClause: unique([
      `Indemnity. Each party will defend, indemnify, and hold harmless the other party and its officers, directors, employees, and affiliates from third-party claims, damages, penalties, costs, and reasonable attorneys' fees arising from ${scope}.`,
      "The indemnified party must promptly notify the indemnifying party of the claim, provide reasonable cooperation, and allow the indemnifying party to control the defense and settlement.",
      "The indemnifying party may not settle any claim in a way that admits fault, imposes non-monetary obligations, or restricts the indemnified party's business without prior written consent.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Drafted a ${goalLabel(input.goal)} indemnity with covered claims, defense control, cooperation duties, and settlement consent protections.`,
    keyChanges: unique([
      "Clarified covered third-party claims.",
      "Added defense, indemnity, and hold-harmless obligations.",
      "Added notice and cooperation mechanics.",
      "Restricted settlements that create admissions or non-monetary obligations."
    ]),
    negotiationPoints: unique([
      "Confirm whether indemnity is mutual or one-way.",
      "Align indemnity carveouts with the liability cap.",
      "Decide whether data breach and confidentiality claims should be expressly covered.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Allocates third-party claim defense responsibility.",
      "Reduces uncertainty around settlement authority.",
      "Connects indemnity scope to high-impact contract risks."
    ])
  };
}

function intellectualPropertyRewrite(input: RewriteContext): RewriteDraft {
  const ownership =
    input.goal === "buyer_friendly"
      ? "Customer owns deliverables created specifically for Customer upon full payment, excluding Supplier's pre-existing materials, tools, templates, and know-how."
      : input.goal === "seller_friendly"
        ? "Supplier retains all ownership of its pre-existing materials, tools, templates, know-how, and any improvements to them; Customer receives only the license expressly granted below."
        : "Each party retains ownership of its pre-existing intellectual property, and ownership of deliverables will be allocated as stated in the applicable statement of work.";

  return {
    rewrittenClause: unique([
      `Intellectual Property. ${ownership}`,
      "To the extent a deliverable includes pre-existing materials, the owning party grants the other party a non-exclusive, worldwide license to use those materials solely as necessary to receive or provide the contracted services.",
      "Neither party may reverse engineer, remove proprietary notices from, or use the other party's intellectual property outside the scope of this agreement.",
      "Feedback may be used without restriction provided it does not disclose confidential information or identify the providing party without permission.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Clarified IP ownership, embedded materials, license scope, restrictions, and feedback treatment using a ${goalLabel(input.goal)} posture.`,
    keyChanges: unique([
      "Separated pre-existing IP from project deliverables.",
      "Added license rights for embedded materials.",
      "Added use restrictions.",
      "Clarified feedback handling."
    ]),
    negotiationPoints: unique([
      "Confirm who owns custom deliverables and when ownership transfers.",
      "List excluded pre-existing technology and templates.",
      "Check whether the license scope supports the intended business use.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces ownership ambiguity.",
      "Protects background technology while preserving operational use rights.",
      "Limits unauthorized use of IP."
    ])
  };
}

function disputeRewrite(input: RewriteContext): RewriteDraft {
  return {
    rewrittenClause: unique([
      "Dispute Resolution. Before filing a legal proceeding, the parties will first escalate the dispute to executive representatives who will meet in good faith within ten (10) business days after written notice.",
      "If the dispute is not resolved within thirty (30) days after escalation, either party may pursue the remedies available under this agreement in the agreed venue.",
      "Nothing prevents either party from seeking temporary or injunctive relief to protect confidential information, intellectual property, data security, or payment rights.",
      "The prevailing party in any action may recover reasonable attorneys' fees and costs if permitted by applicable law.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Added a ${goalLabel(input.goal)} escalation process while preserving urgent equitable remedies.`,
    keyChanges: unique([
      "Added executive escalation before litigation.",
      "Added a defined resolution timeline.",
      "Preserved injunctive relief for urgent matters.",
      "Addressed attorneys' fees."
    ]),
    negotiationPoints: unique([
      "Confirm governing law, venue, and whether arbitration is required.",
      "Decide whether emergency injunctive relief should bypass escalation.",
      "Align fee-shifting language with local law.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Creates a lower-cost path before formal proceedings.",
      "Prevents escalation requirements from blocking urgent relief.",
      "Clarifies procedural expectations."
    ])
  };
}

function warrantyRewrite(input: RewriteContext): RewriteDraft {
  const standard = input.goal === "buyer_friendly" || input.goal === "stronger_protection" ? "materially conform to the documentation, specifications, and applicable statement of work" : "be performed in a professional and workmanlike manner";

  return {
    rewrittenClause: unique([
      `Warranty. Supplier warrants that the services and deliverables will ${standard} for ninety (90) days after delivery or performance.`,
      "Supplier will comply with applicable laws and will use personnel with appropriate skill and experience.",
      "Customer's exclusive remedy for breach of this warranty is prompt correction, replacement, re-performance, or, if Supplier cannot reasonably cure, a refund of the affected fees.",
      "Except as expressly stated, each party disclaims implied warranties to the maximum extent permitted by law.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Added a ${goalLabel(input.goal)} express warranty with remedy mechanics and controlled disclaimer language.`,
    keyChanges: unique([
      "Added express performance warranty.",
      "Added legal compliance and skill standard.",
      "Defined warranty remedies.",
      "Clarified implied warranty disclaimer."
    ]),
    negotiationPoints: unique([
      "Confirm warranty period and acceptance process.",
      "Decide whether remedies are exclusive.",
      "Align warranty promises with service levels and deliverable specifications.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Creates an enforceable quality baseline.",
      "Provides a practical cure path.",
      "Controls open-ended warranty exposure."
    ])
  };
}

function generalRewrite(input: RewriteContext): RewriteDraft {
  if (input.goal === "shorter") {
    return {
      rewrittenClause: unique([
        `${input.title}. ${normalizeWhitespace(input.sourceText)}`,
        maybeInstruction(input)
      ]).join(" "),
      rewriteStrategy: "Condensed the clause while preserving its apparent business function.",
      keyChanges: unique(["Shortened redundant wording.", "Preserved the original clause's core obligation."]),
      negotiationPoints: unique(["Confirm no defined terms or cross-references were removed.", ...baseNotes(input)]),
      riskReductionNotes: unique(["Improves readability and reduces drafting ambiguity."])
    };
  }

  return {
    rewrittenClause: unique([
      `${input.title}. The parties will perform their obligations under this clause in good faith, in compliance with applicable law, and in a manner consistent with the purpose of the agreement.`,
      "Any notice, approval, or consent required under this clause must be in writing and may not be unreasonably withheld, conditioned, or delayed unless the agreement expressly states otherwise.",
      "The parties will cooperate reasonably to resolve operational issues before treating them as material breaches.",
      maybeInstruction(input)
    ]).join(" "),
    rewriteStrategy: `Applied a ${goalLabel(input.goal)} general cleanup because this category does not have a more specific deterministic rewrite template.`,
    keyChanges: unique([
      "Added good-faith performance language.",
      "Added written approval and consent standards.",
      "Added cooperation before escalation."
    ]),
    negotiationPoints: unique([
      "Confirm the clause category and whether a more specific business position is required.",
      "Check defined terms and cross-references against the full agreement.",
      ...baseNotes(input)
    ]),
    riskReductionNotes: unique([
      "Reduces ambiguity in general obligations.",
      "Adds practical process language for notices and approvals."
    ])
  };
}

function rewriteForCategory(input: RewriteContext): RewriteDraft {
  if (input.goal === "shorter" && normalizeWhitespace(input.sourceText).length > 0) {
    const compressed = normalizeWhitespace(input.sourceText)
      .split(/(?<=[.!?])\s+/)
      .slice(0, 3)
      .join(" ");

    if (compressed.length >= 80 && input.category !== "LIABILITY" && input.category !== "PAYMENT" && input.category !== "TERMINATION") {
      return {
        rewrittenClause: sentence(compressed),
        rewriteStrategy: "Shortened the clause by retaining the leading operative sentences and removing secondary detail.",
        keyChanges: unique(["Condensed the clause for readability.", "Preserved the primary obligation."]),
        negotiationPoints: unique(["Confirm removed details are not needed for enforcement.", ...baseNotes(input)]),
        riskReductionNotes: unique(["Reduces ambiguity created by overlong drafting."])
      };
    }
  }

  if (input.category === "LIABILITY") return liabilityRewrite(input);
  if (input.category === "TERMINATION") return terminationRewrite(input);
  if (input.category === "PAYMENT") return paymentRewrite(input);
  if (input.category === "CONFIDENTIALITY" || input.category === "PRIVACY" || input.category === "DATA_PROTECTION" || input.category === "SECURITY") return confidentialityRewrite(input);
  if (input.category === "INDEMNITY") return indemnityRewrite(input);
  if (input.category === "INTELLECTUAL_PROPERTY") return intellectualPropertyRewrite(input);
  if (input.category === "DISPUTE_RESOLUTION" || input.category === "GOVERNING_LAW") return disputeRewrite(input);
  if (input.category === "WARRANTY") return warrantyRewrite(input);
  return generalRewrite(input);
}

export async function rewriteClause(
  context: RequestContext,
  documentId: string,
  clauseId: string,
  input: { goal: RewriteGoal; userInstruction?: string }
) {
  const clause = await prisma.clauseFinding.findFirst({
    where: {
      id: clauseId,
      documentId,
      document: {
        workspaceId: context.workspace.id,
        deletedAt: null
      }
    },
    select: {
      id: true,
      title: true,
      category: true,
      extractionMethod: true,
      sourceText: true,
      riskFindings: {
        orderBy: [{ riskLevel: "desc" }, { confidence: "desc" }, { createdAt: "asc" }],
        select: {
          title: true,
          description: true,
          impact: true,
          recommendationHint: true,
          ruleId: true,
          recommendations: {
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
            select: {
              title: true,
              description: true,
              priority: true
            }
          }
        }
      }
    }
  });

  if (!clause) {
    throw new AppError("NOT_FOUND", "Clause not found for this document.");
  }

  if (clause.extractionMethod === "MOCK") {
    throw new AppError("CONFLICT", "Clause rewrite is available only for real extracted clauses.");
  }

  const recommendations = clause.riskFindings.flatMap((risk) => risk.recommendations);
  const draft = rewriteForCategory({
    category: clause.category,
    title: clause.title,
    sourceText: clause.sourceText,
    risks: clause.riskFindings,
    recommendations,
    goal: input.goal,
    userInstruction: input.userInstruction
  });

  return {
    originalClause: {
      id: clause.id,
      title: clause.title,
      category: clause.category,
      text: clause.sourceText
    },
    rewrittenClause: draft.rewrittenClause,
    rewriteStrategy: draft.rewriteStrategy,
    keyChanges: draft.keyChanges,
    negotiationPoints: draft.negotiationPoints,
    riskReductionNotes: draft.riskReductionNotes,
    disclaimer
  };
}
