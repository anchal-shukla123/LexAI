import type { ClauseCategory, ClauseExtractionMethod, Prisma, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

type RiskDetectionStatus = "COMPLETED" | "NO_REAL_CLAUSES" | "NO_RISKS_FOUND" | "EXTRACTION_UNAVAILABLE" | "NOT_STARTED";

type ClauseForRiskDetection = {
  id: string;
  analysisJobId: string;
  category: ClauseCategory;
  title: string;
  sourceText: string;
  confidence: number;
  extractionMethod: ClauseExtractionMethod;
};

export type RiskDraft = {
  clauseFindingId: string | null;
  category: ClauseCategory;
  ruleId: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  evidence: string;
  impact: string;
  recommendationHint: string;
  confidence: number;
};

const maxEvidenceLength = 420;
const contractCategories = new Set<ClauseCategory>([
  "CONFIDENTIALITY",
  "TERMINATION",
  "PAYMENT",
  "LIABILITY",
  "INDEMNITY",
  "GOVERNING_LAW",
  "DISPUTE_RESOLUTION",
  "RENEWAL",
  "NOTICE",
  "INTELLECTUAL_PROPERTY",
  "DATA_PROTECTION",
  "SECURITY",
  "WARRANTY",
  "ASSIGNMENT",
  "FORCE_MAJEURE",
  "NON_COMPETE",
  "PRIVACY"
]);

const levelWeight: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function evidenceFrom(value: string) {
  const normalized = normalize(value);
  return normalized.length > maxEvidenceLength ? `${normalized.slice(0, maxEvidenceLength - 1)}...` : normalized;
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function lacksAny(text: string, patterns: RegExp[]) {
  return !includesAny(text, patterns);
}

function numberInRangePattern(unit: "hour" | "day", max: number) {
  const alternatives = Array.from({ length: max }, (_, index) => String(index + 1)).join("|");
  return new RegExp(`\\b(?:${alternatives})\\s+${unit}s?\\b`, "i");
}

function risk(input: Omit<RiskDraft, "confidence"> & { clauseConfidence: number; confidenceAdjustment?: number }): RiskDraft {
  return {
    clauseFindingId: input.clauseFindingId,
    category: input.category,
    ruleId: input.ruleId,
    riskLevel: input.riskLevel,
    title: input.title,
    description: input.description,
    evidence: input.evidence,
    impact: input.impact,
    recommendationHint: input.recommendationHint,
    confidence: Math.min(0.97, Math.max(0.45, input.clauseConfidence + (input.confidenceAdjustment ?? 0)))
  };
}

function addClauseRisks(clause: ClauseForRiskDetection) {
  const text = normalize(`${clause.title} ${clause.sourceText}`);
  const lower = text.toLowerCase();
  const evidence = evidenceFrom(clause.sourceText);
  const risks: RiskDraft[] = [];

  if (
    clause.category === "LIABILITY" &&
    lacksAny(lower, [/\bcap(?:ped)?\b/i, /\blimit(?:ation|ed)?\b.{0,80}\b(?:liability|aggregate|fees|amount)\b/i, /\b(?:12|twelve)\s+months?\b/i])
  ) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "LIABILITY_MISSING_CAP",
        riskLevel: "HIGH",
        title: "Missing liability cap",
        description: "The liability clause does not appear to set an aggregate cap or fee-based ceiling.",
        evidence,
        impact: "The business may face uncapped financial exposure for contract claims.",
        recommendationHint: "Add an aggregate liability cap tied to fees or a negotiated monetary amount.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (
    clause.category === "LIABILITY" &&
    lacksAny(lower, [/consequential/i, /indirect/i, /special/i, /incidental/i, /lost profits/i])
  ) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "LIABILITY_NO_DAMAGE_EXCLUSION",
        riskLevel: "MEDIUM",
        title: "No indirect damages exclusion",
        description: "The liability language does not clearly exclude indirect, consequential, special, or lost-profit damages.",
        evidence,
        impact: "Claims could include harder-to-forecast categories of damages.",
        recommendationHint: "Add a mutual exclusion for indirect, consequential, special, incidental, and lost-profit damages.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.04
      })
    );
  }

  if (
    clause.category === "INDEMNITY" &&
    includesAny(lower, [/any and all/i, /arising out of/i, /hold harmless/i, /\bdefend\b/i]) &&
    lacksAny(lower, [/third[- ]party/i, /gross negligence/i, /willful misconduct/i, /breach of confidentiality/i, /data protection/i])
  ) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "INDEMNITY_BROAD_UNBOUNDED",
        riskLevel: "HIGH",
        title: "Broad indemnity obligation",
        description: "The indemnity appears broad but does not clearly limit covered claims or carve out misconduct standards.",
        evidence,
        impact: "The indemnifying party may absorb claims beyond negotiated third-party or fault-based scenarios.",
        recommendationHint: "Limit indemnity to defined third-party claims and agreed breaches, with clear exclusions.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (
    clause.category === "TERMINATION" &&
    includesAny(lower, [/\bmay terminate\b/i, /terminate (?:this )?agreement/i]) &&
    lacksAny(lower, [/\beither party\b/i, /\bmutual\b/i, /\bboth parties\b/i])
  ) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "TERMINATION_UNILATERAL",
        riskLevel: "MEDIUM",
        title: "Unilateral termination right",
        description: "Termination rights appear to favor one party rather than applying mutually.",
        evidence,
        impact: "One party may have a stronger exit right, creating operational and negotiation imbalance.",
        recommendationHint: "Make termination rights mutual or define objective triggers for unilateral termination.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "TERMINATION" && includesAny(lower, [/breach/i, /default/i, /cause/i]) && lacksAny(lower, [/cure/i, /remed/i, numberInRangePattern("day", 60)])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "TERMINATION_NO_CURE_PERIOD",
        riskLevel: "MEDIUM",
        title: "No cure period for breach",
        description: "The termination language references breach or cause but does not clearly provide a cure window.",
        evidence,
        impact: "The agreement may allow termination before the breaching party can fix remediable issues.",
        recommendationHint: "Add a defined cure period, commonly 15 to 30 days depending on breach type.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "RENEWAL" && includesAny(lower, [/auto[- ]?renew/i, /automatically renew/i, /successive term/i]) && lacksAny(lower, [/non[- ]renew/i, /opt[- ]out/i, /written notice/i, numberInRangePattern("day", 90)])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "RENEWAL_AUTO_RENEWAL",
        riskLevel: "MEDIUM",
        title: "Auto-renewal without clear opt-out",
        description: "The renewal clause appears to renew automatically without a clear non-renewal notice process.",
        evidence,
        impact: "The business may be locked into another term unintentionally.",
        recommendationHint: "Add a clear opt-out deadline and require written renewal reminders.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "CONFIDENTIALITY" && lacksAny(lower, [/already known/i, /public(?:ly)? known/i, /independently developed/i, /rightfully received/i, /required by law/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "CONFIDENTIALITY_MISSING_EXCEPTIONS",
        riskLevel: "MEDIUM",
        title: "Missing confidentiality exceptions",
        description: "The confidentiality clause does not clearly include standard exceptions for public, independently developed, already known, or legally required disclosures.",
        evidence,
        impact: "Ordinary or legally compelled disclosures may technically breach the agreement.",
        recommendationHint: "Add standard confidentiality exceptions and a required-disclosure notice process.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.02
      })
    );
  }

  if ((clause.category === "DATA_PROTECTION" || clause.category === "SECURITY" || clause.category === "PRIVACY") && includesAny(lower, [/breach/i, /security incident/i, /personal data/i, /personal information/i]) && lacksAny(lower, [numberInRangePattern("hour", 72), numberInRangePattern("day", 7), /without undue delay/i, /promptly/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "DATA_NO_BREACH_TIMELINE",
        riskLevel: "HIGH",
        title: "No breach notification timeline",
        description: "The data or security clause references sensitive data or incidents without a concrete breach notification deadline.",
        evidence,
        impact: "Delayed notice could impair regulatory response, customer notice, and containment obligations.",
        recommendationHint: "Require notice within a fixed timeframe, such as 24 to 72 hours after discovery.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (
    clause.category === "INTELLECTUAL_PROPERTY" &&
    includesAny(lower, [/assigns? all/i, /all right(?:s)?, title and interest/i, /work product/i]) &&
    lacksAny(lower, [/pre-existing/i, /background/i, /retained/i, /limited license/i])
  ) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "IP_BROAD_ASSIGNMENT",
        riskLevel: "HIGH",
        title: "Broad IP assignment",
        description: "The intellectual property clause appears to assign broad rights without protecting pre-existing or background IP.",
        evidence,
        impact: "A party could unintentionally transfer ownership of tools, templates, or pre-existing materials.",
        recommendationHint: "Carve out background IP and grant only the license needed for contract performance.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "DISPUTE_RESOLUTION" && includesAny(lower, [/mandatory arbitration/i, /binding arbitration/i, /exclusive arbitration/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "DISPUTE_MANDATORY_ARBITRATION",
        riskLevel: "MEDIUM",
        title: "Mandatory arbitration",
        description: "The dispute clause requires binding arbitration, which may limit court access and appeal rights.",
        evidence,
        impact: "Disputes may be harder to consolidate, appeal, or resolve through ordinary courts.",
        recommendationHint: "Confirm arbitration is acceptable, and define venue, rules, emergency relief, and cost allocation.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "DISPUTE_RESOLUTION" && lacksAny(lower, [/arbitration/i, /mediation/i, /court/i, /venue/i, /jurisdiction/i, /escalation/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "DISPUTE_UNCLEAR_PROCESS",
        riskLevel: "MEDIUM",
        title: "Unclear dispute process",
        description: "The dispute language does not clearly identify the process, forum, or escalation path.",
        evidence,
        impact: "Ambiguity may increase time and cost when resolving disputes.",
        recommendationHint: "Define escalation, forum, venue, governing rules, and interim relief rights.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.03
      })
    );
  }

  if (clause.category === "PAYMENT" && includesAny(lower, [/invoice/i, /payment/i, /fees/i]) && lacksAny(lower, [/dispute/i, /good faith/i, /undisputed/i, /credit/i, /set[- ]?off/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "PAYMENT_NO_DISPUTE_PROCESS",
        riskLevel: "LOW",
        title: "Unclear payment dispute process",
        description: "The payment clause does not clearly explain how disputed invoices should be handled.",
        evidence,
        impact: "Invoice disagreements may create late-fee, suspension, or collection disputes.",
        recommendationHint: "Add a good-faith invoice dispute process and require timely payment of undisputed amounts.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.05
      })
    );
  }

  if (clause.category === "WARRANTY" && includesAny(lower, [/\bas is\b/i, /disclaims? all warranties/i, /without warranty/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "WARRANTY_BROAD_DISCLAIMER",
        riskLevel: "MEDIUM",
        title: "Broad warranty disclaimer",
        description: "The warranty clause broadly disclaims warranties and may leave limited remedies for performance failures.",
        evidence,
        impact: "The customer may have weak recourse if services or deliverables fail to meet expectations.",
        recommendationHint: "Add limited performance, authority, non-infringement, and compliance warranties where appropriate.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "ASSIGNMENT" && includesAny(lower, [/may assign/i, /transfer this agreement/i]) && lacksAny(lower, [/prior written consent/i, /without consent/i, /affiliate/i, /successor/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "ASSIGNMENT_UNRESTRICTED",
        riskLevel: "MEDIUM",
        title: "Unrestricted assignment",
        description: "The assignment clause may allow transfer without a clear consent requirement or permitted-assignment boundaries.",
        evidence,
        impact: "A party could be forced to work with an unexpected assignee.",
        recommendationHint: "Require prior written consent, with narrow exceptions for affiliates or mergers.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "FORCE_MAJEURE" && lacksAny(lower, [/notice/i, /mitigat/i, /resume/i, /terminate/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "FORCE_MAJEURE_NO_NOTICE_MITIGATION",
        riskLevel: "LOW",
        title: "Force majeure lacks notice or mitigation",
        description: "The force majeure clause does not clearly require notice, mitigation, or service resumption steps.",
        evidence,
        impact: "Performance delays may continue without practical communication or recovery obligations.",
        recommendationHint: "Add prompt notice, mitigation duties, and termination rights after prolonged events.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.05
      })
    );
  }

  if (clause.category === "NON_COMPETE" && includesAny(lower, [/non[- ]compete/i, /competing business/i, /restricted period/i, /solicit/i])) {
    const isBroad = lacksAny(lower, [/reasonable/i, /\b\d{1,2}\s+months?\b/i, /territory/i, /specific/i, /customers? with whom/i]);
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: isBroad ? "NON_COMPETE_BROAD" : "NON_COMPETE_RESTRICTION",
        riskLevel: isBroad ? "HIGH" : "MEDIUM",
        title: isBroad ? "Broad non-compete restriction" : "Restrictive covenant requires review",
        description: isBroad
          ? "The non-compete or non-solicit language appears broad and may lack reasonable duration, territory, or scope limits."
          : "The agreement includes restrictive covenant language that should be reviewed for enforceability and business impact.",
        evidence,
        impact: "Overbroad restrictions may limit business operations or create enforceability disputes.",
        recommendationHint: "Narrow duration, geography, covered customers, and restricted activities.",
        clauseConfidence: clause.confidence
      })
    );
  }

  if (clause.category === "NOTICE" && lacksAny(lower, [/email/i, /address/i, /courier/i, /certified mail/i, /deemed received/i])) {
    risks.push(
      risk({
        clauseFindingId: clause.id,
        category: clause.category,
        ruleId: "NOTICE_UNCLEAR_METHOD",
        riskLevel: "LOW",
        title: "Unclear notice method",
        description: "The notice clause does not clearly define delivery methods, addresses, or when notice is effective.",
        evidence,
        impact: "Parties may dispute whether formal notices were properly delivered.",
        recommendationHint: "Define accepted notice methods, addresses, and deemed receipt timing.",
        clauseConfidence: clause.confidence,
        confidenceAdjustment: -0.05
      })
    );
  }

  return risks;
}

function appearsToBeContract(clauses: ClauseForRiskDetection[]) {
  const legalClauses = clauses.filter((clause) => contractCategories.has(clause.category));
  const uniqueCategories = new Set(legalClauses.map((clause) => clause.category));
  const combined = normalize(clauses.map((clause) => `${clause.title} ${clause.sourceText}`).join(" ")).toLowerCase();

  return (
    legalClauses.length >= 3 ||
    uniqueCategories.size >= 2 ||
    (legalClauses.length >= 1 && includesAny(combined, [/\bagreement\b/i, /\bparty\b/i, /\bparties\b/i, /\bshall\b/i, /\bterm\b/i, /\beffective date\b/i]))
  );
}

function hasPersonalDataSignal(clauses: ClauseForRiskDetection[]) {
  const combined = clauses.map((clause) => clause.sourceText).join(" ");
  return includesAny(combined, [/personal data/i, /personal information/i, /personally identifiable/i, /\bPII\b/i, /\bGDPR\b/i, /\bCCPA\b/i, /data subject/i]);
}

function strongestEvidenceClause(clauses: ClauseForRiskDetection[]) {
  return [...clauses].sort((left, right) => right.confidence - left.confidence)[0] ?? null;
}

function addMissingProtectionRisks(clauses: ClauseForRiskDetection[]) {
  if (!appearsToBeContract(clauses)) return [];

  const categories = new Set(clauses.map((clause) => clause.category));
  const anchor = strongestEvidenceClause(clauses);
  if (!anchor) return [];

  const evidence = evidenceFrom(anchor.sourceText);
  const missing: Array<{
    category: ClauseCategory;
    ruleId: string;
    title: string;
    description: string;
    impact: string;
    recommendationHint: string;
    riskLevel: RiskLevel;
  }> = [
    {
      category: "LIABILITY",
      ruleId: "MISSING_LIMITATION_OF_LIABILITY",
      title: "Missing limitation of liability clause",
      description: "The document appears contractual, but no rule-based limitation of liability clause was found.",
      impact: "The contract may lack a negotiated ceiling on damages and claim exposure.",
      recommendationHint: "Add a limitation of liability clause with caps, exclusions, and agreed carve-outs.",
      riskLevel: "HIGH"
    },
    {
      category: "TERMINATION",
      ruleId: "MISSING_TERMINATION",
      title: "Missing termination clause",
      description: "The document appears contractual, but no rule-based termination clause was found.",
      impact: "The parties may not have a clear exit path, notice period, or cure process.",
      recommendationHint: "Add termination for cause, convenience if desired, notice, cure, and transition obligations.",
      riskLevel: "HIGH"
    },
    {
      category: "GOVERNING_LAW",
      ruleId: "MISSING_GOVERNING_LAW",
      title: "Missing governing law clause",
      description: "The document appears contractual, but no rule-based governing law clause was found.",
      impact: "Disputes may start with uncertainty over applicable law and forum.",
      recommendationHint: "Specify governing law and, where appropriate, venue or jurisdiction.",
      riskLevel: "MEDIUM"
    },
    {
      category: "DISPUTE_RESOLUTION",
      ruleId: "MISSING_DISPUTE_RESOLUTION",
      title: "Missing dispute resolution clause",
      description: "The document appears contractual, but no rule-based dispute resolution clause was found.",
      impact: "The parties may lack a predictable process for escalation, forum selection, and interim relief.",
      recommendationHint: "Add a dispute resolution process covering escalation, venue, rules, and remedies.",
      riskLevel: "MEDIUM"
    },
    {
      category: "CONFIDENTIALITY",
      ruleId: "MISSING_CONFIDENTIALITY",
      title: "Missing confidentiality clause",
      description: "The document appears contractual, but no rule-based confidentiality clause was found.",
      impact: "Sensitive business information may not be protected by express confidentiality obligations.",
      recommendationHint: "Add confidentiality obligations, exclusions, permitted disclosures, and return or destruction duties.",
      riskLevel: "HIGH"
    }
  ];

  if (hasPersonalDataSignal(clauses)) {
    missing.push({
      category: "DATA_PROTECTION",
      ruleId: "MISSING_DATA_PROTECTION",
      title: "Missing data protection clause",
      description: "The document references personal data, but no rule-based data protection clause was found.",
      impact: "Privacy, processing, security, and breach obligations may be underspecified.",
      recommendationHint: "Add data processing, security controls, subprocessor, audit, and breach notification obligations.",
      riskLevel: "HIGH"
    });
  }

  return missing
    .filter((item) => !categories.has(item.category))
    .map((item) =>
      risk({
        clauseFindingId: anchor.id,
        category: item.category,
        ruleId: item.ruleId,
        riskLevel: item.riskLevel,
        title: item.title,
        description: item.description,
        evidence,
        impact: item.impact,
        recommendationHint: item.recommendationHint,
        clauseConfidence: Math.min(0.86, anchor.confidence),
        confidenceAdjustment: -0.08
      })
    );
}

function dedupeRisks(risks: RiskDraft[]) {
  const bestByRule = new Map<string, RiskDraft>();

  for (const current of risks) {
    const existing = bestByRule.get(current.ruleId);
    if (!existing || levelWeight[current.riskLevel] > levelWeight[existing.riskLevel] || current.confidence > existing.confidence) {
      bestByRule.set(current.ruleId, current);
    }
  }

  return [...bestByRule.values()].sort((left, right) => {
    const levelDelta = levelWeight[right.riskLevel] - levelWeight[left.riskLevel];
    if (levelDelta !== 0) return levelDelta;
    return right.confidence - left.confidence;
  });
}

export function detectRiskDraftsFromClauses(clauses: ClauseForRiskDetection[]) {
  const realClauses = clauses.filter((clause) => clause.extractionMethod === "RULE_BASED");
  const clauseRisks = realClauses.flatMap(addClauseRisks);
  const missingProtectionRisks = addMissingProtectionRisks(realClauses);
  return dedupeRisks([...clauseRisks, ...missingProtectionRisks]);
}

export function riskLevelCounts(risks: Array<{ riskLevel: RiskLevel }>) {
  return risks.reduce<Record<RiskLevel, number>>(
    (counts, item) => {
      counts[item.riskLevel] += 1;
      return counts;
    },
    {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    }
  );
}

function statusFromMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as Record<string, unknown>).riskDetectionStatus;
  return typeof status === "string" ? status : null;
}

async function assertDocumentAccess(context: RequestContext, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: context.workspace.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  return document;
}

async function getCompletedExtraction(documentId: string) {
  return prisma.documentExtraction.findFirst({
    where: {
      documentId,
      status: "COMPLETED"
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true
    }
  });
}

export async function loadRuleBasedClauses(documentId: string): Promise<ClauseForRiskDetection[]> {
  return prisma.clauseFinding.findMany({
    where: {
      documentId,
      extractionMethod: "RULE_BASED"
    },
    orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      analysisJobId: true,
      category: true,
      title: true,
      sourceText: true,
      confidence: true,
      extractionMethod: true
    }
  });
}

function serializeRisk(risk: {
  id: string;
  analysisJobId: string;
  clauseFindingId: string | null;
  detectionMethod: "RULE_BASED" | "MOCK";
  ruleId: string | null;
  category: ClauseCategory | null;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  evidence: string | null;
  impact: string | null;
  recommendationHint: string | null;
  confidence: number;
  createdAt: Date;
  clauseFinding?: {
    title: string;
    category: ClauseCategory;
  } | null;
}) {
  return {
    ...risk,
    isFallbackMock: risk.detectionMethod === "MOCK",
    clause: risk.clauseFinding
      ? {
          title: risk.clauseFinding.title,
          category: risk.clauseFinding.category
        }
      : null
  };
}

export async function detectAndStoreRuleBasedRisks(context: RequestContext, documentId: string) {
  await assertDocumentAccess(context, documentId);
  const extraction = await getCompletedExtraction(documentId);
  if (!extraction) {
    throw new AppError("CONFLICT", "Run text extraction before detecting risks.");
  }

  const clauses = await loadRuleBasedClauses(documentId);
  if (clauses.length === 0) {
    throw new AppError("CONFLICT", "Run rule-based clause extraction before detecting risks.");
  }

  const drafts = detectRiskDraftsFromClauses(clauses);
  const status: RiskDetectionStatus = drafts.length > 0 ? "COMPLETED" : "NO_RISKS_FOUND";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const job = await tx.analysisJob.create({
      data: {
        documentId,
        workspaceId: context.workspace.id,
        requestedById: context.user.id,
        status: "COMPLETED",
        provider: "rule-based-risk-detection",
        startedAt: now,
        completedAt: now,
        metadata: {
          riskDetectionStatus: status,
          realRiskCount: drafts.length,
          realClauseCount: clauses.length
        }
      },
      select: {
        id: true
      }
    });

    await tx.riskFinding.deleteMany({
      where: {
        documentId,
        detectionMethod: "RULE_BASED"
      }
    });

    if (drafts.length > 0) {
      await tx.riskFinding.createMany({
        data: drafts.map((draft) => ({
          documentId,
          analysisJobId: job.id,
          clauseFindingId: draft.clauseFindingId,
          detectionMethod: "RULE_BASED",
          ruleId: draft.ruleId,
          category: draft.category,
          riskLevel: draft.riskLevel,
          title: draft.title,
          description: draft.description,
          evidence: draft.evidence,
          impact: draft.impact,
          recommendationHint: draft.recommendationHint,
          confidence: draft.confidence
        }))
      });
    }

  });

  return getStoredRisks(context, documentId);
}

export async function getStoredRisks(context: RequestContext, documentId: string) {
  await assertDocumentAccess(context, documentId);

  const [realRiskCount, mockRiskCount, realRisks, mockRisks] = await Promise.all([
    prisma.riskFinding.count({ where: { documentId, detectionMethod: "RULE_BASED" } }),
    prisma.riskFinding.count({ where: { documentId, detectionMethod: "MOCK" } }),
    prisma.riskFinding.findMany({
      where: { documentId, detectionMethod: "RULE_BASED" },
      orderBy: [{ riskLevel: "desc" }, { createdAt: "asc" }],
      include: {
        clauseFinding: {
          select: {
            title: true,
            category: true
          }
        }
      }
    }),
    prisma.riskFinding.findMany({
      where: { documentId, detectionMethod: "MOCK" },
      orderBy: [{ createdAt: "asc" }],
      include: {
        clauseFinding: {
          select: {
            title: true,
            category: true
          }
        }
      }
    })
  ]);

  const sourceRisks = realRisks.length > 0 ? realRisks : mockRisks;

  return {
    documentId,
    status: realRisks.length > 0 ? "COMPLETED" : mockRisks.length > 0 ? "FALLBACK_MOCK_USED" : "NOT_STARTED",
    realRiskCount,
    mockRiskCount,
    storedRiskCount: realRiskCount + mockRiskCount,
    riskLevelCounts: riskLevelCounts(realRisks),
    risks: sourceRisks.map(serializeRisk)
  };
}

export async function getRiskDetectionSummary(documentId: string) {
  const [realRisks, mockRisks, recentJobs, realRiskCount, mockRiskCount] = await Promise.all([
    prisma.riskFinding.findMany({
      where: { documentId, detectionMethod: "RULE_BASED" },
      orderBy: [{ riskLevel: "desc" }, { confidence: "desc" }, { createdAt: "asc" }],
      take: 5,
      select: {
        title: true,
        category: true,
        riskLevel: true,
        detectionMethod: true,
        ruleId: true,
        confidence: true,
        evidence: true
      }
    }),
    prisma.riskFinding.findMany({
      where: { documentId, detectionMethod: "MOCK" },
      orderBy: [{ createdAt: "asc" }],
      take: 5,
      select: {
        title: true,
        category: true,
        riskLevel: true,
        detectionMethod: true,
        ruleId: true,
        confidence: true,
        evidence: true
      }
    }),
    prisma.analysisJob.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        metadata: true
      }
    }),
    prisma.riskFinding.count({ where: { documentId, detectionMethod: "RULE_BASED" } }),
    prisma.riskFinding.count({ where: { documentId, detectionMethod: "MOCK" } })
  ]);

  const latestStatus = recentJobs.map((job) => statusFromMetadata(job.metadata)).find((status): status is string => Boolean(status));
  const status: RiskDetectionStatus | "FALLBACK_MOCK_USED" =
    realRiskCount > 0
      ? "COMPLETED"
      : mockRiskCount > 0
        ? "FALLBACK_MOCK_USED"
        : latestStatus === "NO_RISKS_FOUND"
          ? "NO_RISKS_FOUND"
          : latestStatus === "NO_REAL_CLAUSES"
            ? "NO_REAL_CLAUSES"
            : latestStatus === "EXTRACTION_UNAVAILABLE"
              ? "EXTRACTION_UNAVAILABLE"
              : "NOT_STARTED";

  const topRisks = realRisks.length > 0 ? realRisks : mockRisks;

  return {
    status,
    realRiskCount,
    mockRiskCount,
    storedRiskCount: realRiskCount + mockRiskCount,
    riskLevelCounts: riskLevelCounts(realRisks),
    topRisks: topRisks.map((riskItem) => ({
      title: riskItem.title,
      category: riskItem.category,
      riskLevel: riskItem.riskLevel,
      detectionMethod: riskItem.detectionMethod,
      isFallbackMock: riskItem.detectionMethod === "MOCK",
      ruleId: riskItem.ruleId,
      confidence: riskItem.confidence,
      evidence: riskItem.evidence ? evidenceFrom(riskItem.evidence) : null
    }))
  };
}
