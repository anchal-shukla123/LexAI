import type { Prisma, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

export type EmailTone = "professional" | "firm" | "friendly" | "concise";

const disclaimer = "Rule-based negotiation aid only. LexAI does not provide legal advice; have qualified counsel review all proposed language before sending or signing.";

const riskWeights: Record<RiskLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

type NegotiationDocument = Awaited<ReturnType<typeof loadNegotiationDocument>>;

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string | null | undefined, maxLength = 360) {
  const normalized = normalizeWhitespace(value ?? "");
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function stringArray(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Prisma.JsonValue>) : {};
}

function sortRisks<T extends { riskLevel: RiskLevel; confidence: number; createdAt: Date }>(risks: T[]) {
  return [...risks].sort((left, right) => {
    const levelDelta = riskWeights[right.riskLevel] - riskWeights[left.riskLevel];
    if (levelDelta !== 0) return levelDelta;
    const confidenceDelta = right.confidence - left.confidence;
    if (confidenceDelta !== 0) return confidenceDelta;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function serializeRisk(risk: NegotiationDocument["riskFindings"][number]) {
  return {
    id: risk.id,
    clauseFindingId: risk.clauseFindingId,
    title: risk.title,
    riskLevel: risk.riskLevel,
    severity: titleCase(risk.riskLevel),
    category: risk.category,
    description: risk.description,
    evidence: risk.evidence,
    impact: risk.impact,
    recommendationHint: risk.recommendationHint,
    confidence: risk.confidence,
    detectionMethod: risk.detectionMethod,
    ruleId: risk.ruleId,
    clauseTitle: risk.clauseFinding?.title ?? null
  };
}

function serializeRewrite(rewrite: NegotiationDocument["clauseRewrites"][number]) {
  return {
    id: rewrite.id,
    documentId: rewrite.documentId,
    clauseFindingId: rewrite.clauseFindingId,
    goal: rewrite.goal,
    userInstruction: rewrite.userInstruction,
    originalClause: rewrite.originalClause,
    rewrittenClause: rewrite.rewrittenClause,
    rewriteStrategy: rewrite.rewriteStrategy,
    keyChanges: stringArray(rewrite.keyChanges),
    negotiationPoints: stringArray(rewrite.negotiationPoints),
    riskReductionNotes: stringArray(rewrite.riskReductionNotes),
    status: rewrite.status,
    createdAt: rewrite.createdAt.toISOString(),
    updatedAt: rewrite.updatedAt.toISOString(),
    clause: {
      id: rewrite.clauseFinding.id,
      title: rewrite.clauseFinding.title,
      category: rewrite.clauseFinding.category
    }
  };
}

function recommendationPriority(recommendation: NegotiationDocument["recommendations"][number]) {
  return {
    id: recommendation.id,
    title: recommendation.title,
    description: recommendation.description,
    priority: recommendation.priority,
    riskFindingId: recommendation.riskFindingId,
    linkedRiskTitle: recommendation.riskFinding?.title ?? null,
    linkedRiskLevel: recommendation.riskFinding?.riskLevel ?? null,
    linkedClauseTitle: recommendation.riskFinding?.clauseFinding?.title ?? null
  };
}

function reportChecklist(document: NegotiationDocument) {
  const content = asObject(document.reports[0]?.content);
  const checklist = content.negotiationChecklist;
  return Array.isArray(checklist) ? checklist.filter((item): item is string => typeof item === "string") : [];
}

function buildNegotiationChecklist(input: {
  document: NegotiationDocument;
  topRisks: ReturnType<typeof serializeRisk>[];
  acceptedRewrites: ReturnType<typeof serializeRewrite>[];
  priorities: ReturnType<typeof recommendationPriority>[];
}) {
  const reportItems = reportChecklist(input.document);
  const riskItems = input.topRisks
    .filter((risk) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "HIGH" || risk.riskLevel === "MEDIUM")
    .slice(0, 4)
    .map((risk) => risk.recommendationHint ?? risk.impact ?? `Resolve ${risk.title}.`);
  const rewriteItems = input.acceptedRewrites.slice(0, 4).map((rewrite) => `Use accepted rewrite for ${rewrite.clause.title}.`);
  const priorityItems = input.priorities.slice(0, 6).map((priority) => priority.description);

  return Array.from(new Set([...reportItems, ...riskItems, ...rewriteItems, ...priorityItems].map(excerpt).filter(Boolean))).slice(0, 10);
}

function emailOpening(tone: EmailTone) {
  if (tone === "firm") return "Thank you for the draft. Before we can move forward, we need the following items addressed in the agreement.";
  if (tone === "friendly") return "Thank you for sending the draft. We reviewed it and have a few proposed updates that should make the agreement easier for both sides to finalize.";
  if (tone === "concise") return "We reviewed the draft and request the updates below.";
  return "Thank you for sharing the draft agreement. We have reviewed the key risk areas and would like to propose the following updates before signature.";
}

function emailClosing(tone: EmailTone) {
  if (tone === "firm") return "Please confirm whether you can incorporate these changes in the next draft.";
  if (tone === "friendly") return "Happy to discuss these points and work through language that is practical for both teams.";
  if (tone === "concise") return "Please send an updated draft reflecting these points.";
  return "Please let us know if you would like to discuss any of these points, or send back a revised draft for review.";
}

function buildEmail(input: {
  document: NegotiationDocument;
  tone: EmailTone;
  includeAcceptedRewrites: boolean;
  includeRiskSummary: boolean;
  customInstruction?: string;
  risks: ReturnType<typeof serializeRisk>[];
  rewrites: ReturnType<typeof serializeRewrite>[];
  checklist: string[];
}) {
  const lines = [
    "Hi [Counterparty Name],",
    "",
    emailOpening(input.tone),
    ""
  ];

  if (input.includeRiskSummary && input.risks.length > 0) {
    lines.push("Key issues:");
    for (const risk of input.risks.slice(0, input.tone === "concise" ? 3 : 5)) {
      lines.push(`- ${risk.title} (${risk.severity}): ${excerpt(risk.recommendationHint ?? risk.impact ?? risk.description, 260)}`);
    }
    lines.push("");
  }

  if (input.includeAcceptedRewrites && input.rewrites.length > 0) {
    lines.push("Accepted rewrite positions:");
    for (const rewrite of input.rewrites.slice(0, input.tone === "concise" ? 2 : 4)) {
      lines.push(`- ${rewrite.clause.title}: ${excerpt(rewrite.rewrittenClause, input.tone === "concise" ? 240 : 420)}`);
    }
    lines.push("");
  }

  if (input.checklist.length > 0) {
    lines.push("Requested updates:");
    for (const item of input.checklist.slice(0, input.tone === "concise" ? 4 : 7)) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (input.customInstruction) {
    lines.push(`Additional note: ${excerpt(input.customInstruction, 320)}`);
    lines.push("");
  }

  lines.push(emailClosing(input.tone), "", "Best,", "[Your Name]");

  return {
    subject: input.tone === "concise" ? `Requested contract updates - ${input.document.title}` : `Proposed updates to ${input.document.title}`,
    emailBody: lines.join("\n")
  };
}

async function loadNegotiationDocument(context: RequestContext, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: context.workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      riskScore: true,
      summary: true,
      riskFindings: {
        select: {
          id: true,
          clauseFindingId: true,
          detectionMethod: true,
          ruleId: true,
          category: true,
          riskLevel: true,
          title: true,
          description: true,
          evidence: true,
          impact: true,
          recommendationHint: true,
          confidence: true,
          createdAt: true,
          clauseFinding: {
            select: {
              title: true,
              category: true
            }
          }
        }
      },
      recommendations: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          riskFindingId: true,
          title: true,
          description: true,
          priority: true,
          riskFinding: {
            select: {
              title: true,
              riskLevel: true,
              clauseFinding: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      },
      clauseRewrites: {
        where: {
          status: {
            in: ["ACCEPTED", "DRAFT"]
          }
        },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          documentId: true,
          clauseFindingId: true,
          goal: true,
          userInstruction: true,
          originalClause: true,
          rewrittenClause: true,
          rewriteStrategy: true,
          keyChanges: true,
          negotiationPoints: true,
          riskReductionNotes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          clauseFinding: {
            select: {
              id: true,
              title: true,
              category: true
            }
          }
        }
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true
        }
      }
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  return document;
}

export async function getNegotiationPack(context: RequestContext, documentId: string) {
  const document = await loadNegotiationDocument(context, documentId);
  const topRisks = sortRisks(document.riskFindings).slice(0, 6).map(serializeRisk);
  const acceptedRewrites = document.clauseRewrites.filter((rewrite) => rewrite.status === "ACCEPTED").map(serializeRewrite);
  const pendingDraftRewrites = document.clauseRewrites.filter((rewrite) => rewrite.status === "DRAFT").map(serializeRewrite);
  const recommendedNegotiationPriorities = document.recommendations.map(recommendationPriority);
  const negotiationChecklist = buildNegotiationChecklist({
    document,
    topRisks,
    acceptedRewrites,
    priorities: recommendedNegotiationPriorities
  });
  const suggestedCounterpartyEmail = buildEmail({
    document,
    tone: "professional",
    includeAcceptedRewrites: true,
    includeRiskSummary: true,
    risks: topRisks.filter((risk) => risk.riskLevel !== "LOW"),
    rewrites: acceptedRewrites,
    checklist: negotiationChecklist
  });

  return {
    document: {
      id: document.id,
      title: document.title,
      riskScore: document.riskScore,
      summary: document.summary
    },
    sourceLabel: "Rule-based real analysis",
    topRisks,
    acceptedRewrites,
    pendingDraftRewrites,
    recommendedNegotiationPriorities,
    negotiationChecklist,
    suggestedCounterpartyEmail,
    legalDisclaimer: disclaimer
  };
}

export async function generateNegotiationEmail(
  context: RequestContext,
  documentId: string,
  input: {
    tone: EmailTone;
    includeAcceptedRewrites: boolean;
    includeRiskSummary: boolean;
    customInstruction?: string;
  }
) {
  const document = await loadNegotiationDocument(context, documentId);
  const topRisks = sortRisks(document.riskFindings)
    .filter((risk) => risk.riskLevel === "CRITICAL" || risk.riskLevel === "HIGH" || risk.riskLevel === "MEDIUM")
    .slice(0, 6)
    .map(serializeRisk);
  const acceptedRewrites = document.clauseRewrites.filter((rewrite) => rewrite.status === "ACCEPTED").map(serializeRewrite);
  const priorities = document.recommendations.map(recommendationPriority);
  const checklist = buildNegotiationChecklist({
    document,
    topRisks,
    acceptedRewrites,
    priorities
  });
  const generated = buildEmail({
    document,
    tone: input.tone,
    includeAcceptedRewrites: input.includeAcceptedRewrites,
    includeRiskSummary: input.includeRiskSummary,
    customInstruction: input.customInstruction,
    risks: topRisks,
    rewrites: acceptedRewrites,
    checklist
  });

  return {
    ...generated,
    includedRisks: input.includeRiskSummary ? topRisks : [],
    includedRewrites: input.includeAcceptedRewrites ? acceptedRewrites : [],
    disclaimer
  };
}
