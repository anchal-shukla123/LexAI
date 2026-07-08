import type { ChatRole, ClauseCategory, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

type CreateChatSessionInput = {
  documentId: string;
  title?: string;
};

type CreateChatMessageInput = {
  sessionId: string;
  content: string;
};

type Citation = {
  type: "RISK" | "CLAUSE" | "RECOMMENDATION" | "CHUNK" | "REPORT";
  title: string;
  label: string;
  excerpt: string;
  score: number;
  metadata?: Record<string, string | number | null>;
};

type ScoredReference = Citation & {
  priority: number;
};

const referencePriority: Record<Citation["type"], number> = {
  RISK: 5,
  CLAUSE: 4,
  RECOMMENDATION: 3,
  CHUNK: 2,
  REPORT: 1
};

const stopWords = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "can",
  "for",
  "give",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "should",
  "tell",
  "the",
  "this",
  "to",
  "what",
  "when",
  "with"
]);

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function excerpt(value: string | null | undefined, maxLength = 420) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function tokenize(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  return Array.from(new Set(normalized));
}

function keywordScore(questionTokens: string[], text: string, base = 0) {
  const haystack = text.toLowerCase();
  return questionTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), base);
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function riskWeight(level: RiskLevel) {
  if (level === "CRITICAL") return 4;
  if (level === "HIGH") return 3;
  if (level === "MEDIUM") return 2;
  return 1;
}

function referenceSort(left: ScoredReference, right: ScoredReference) {
  if (right.score !== left.score) return right.score - left.score;
  return right.priority - left.priority;
}

function serializeSessionMessage(message: {
  id: string;
  role: ChatRole;
  content: string;
  createdById: string | null;
  citations: unknown;
  metadata: unknown;
  createdAt: Date;
}) {
  return message;
}

async function assertDocumentAccess(context: RequestContext, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: context.workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      riskScore: true,
      summary: true
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  return document;
}

async function assertSessionAccess(context: RequestContext, sessionId: string) {
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      workspaceId: context.workspace.id
    },
    select: {
      id: true,
      documentId: true,
      workspaceId: true,
      createdById: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true
        }
      }
    }
  });

  if (!session) {
    throw new AppError("NOT_FOUND", "Chat session not found.");
  }

  return session;
}

async function loadGroundingData(documentId: string) {
  const [chunks, clauses, risks, recommendations, report] = await Promise.all([
    prisma.documentTextChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      take: 40,
      select: {
        id: true,
        chunkIndex: true,
        text: true,
        characterStart: true,
        characterEnd: true
      }
    }),
    prisma.clauseFinding.findMany({
      where: { documentId },
      orderBy: [{ extractionMethod: "asc" }, { pageNumber: "asc" }, { createdAt: "asc" }],
      take: 30,
      select: {
        id: true,
        category: true,
        extractionMethod: true,
        title: true,
        sourceText: true,
        plainLanguageSummary: true,
        confidence: true,
        pageNumber: true
      }
    }),
    prisma.riskFinding.findMany({
      where: { documentId },
      orderBy: [{ riskLevel: "desc" }, { confidence: "desc" }, { createdAt: "asc" }],
      take: 30,
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
        clauseFinding: {
          select: {
            title: true,
            category: true
          }
        }
      }
    }),
    prisma.recommendation.findMany({
      where: { documentId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 20,
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
            ruleId: true,
            clauseFinding: {
              select: {
                title: true,
                category: true
              }
            }
          }
        }
      }
    }),
    prisma.report.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        summarySnapshot: true,
        riskScoreSnapshot: true,
        content: true
      }
    })
  ]);

  return { chunks, clauses, risks, recommendations, report };
}

function scoreReferences(question: string, data: Awaited<ReturnType<typeof loadGroundingData>>) {
  const questionTokens = tokenize(question);
  const normalizedQuestion = question.toLowerCase();
  const references: ScoredReference[] = [];

  for (const risk of data.risks) {
    const text = [risk.title, risk.description, risk.evidence, risk.impact, risk.recommendationHint, risk.ruleId, risk.category, risk.clauseFinding?.title].filter(Boolean).join(" ");
    const categoryBoost = risk.category && normalizedQuestion.includes(risk.category.toLowerCase().replaceAll("_", " ")) ? 3 : 0;
    const score = keywordScore(questionTokens, text, referencePriority.RISK + riskWeight(risk.riskLevel) + categoryBoost);
    if (score > referencePriority.RISK) {
      references.push({
        type: "RISK",
        title: risk.title,
        label: `${titleCase(risk.riskLevel)} risk${risk.ruleId ? ` - ${risk.ruleId}` : ""}`,
        excerpt: excerpt(`${risk.description} ${risk.impact ? `Impact: ${risk.impact}` : ""} ${risk.evidence ? `Evidence: ${risk.evidence}` : ""}`),
        score,
        priority: referencePriority.RISK,
        metadata: {
          riskLevel: risk.riskLevel,
          ruleId: risk.ruleId,
          category: risk.category,
          clauseTitle: risk.clauseFinding?.title ?? null,
          detectionMethod: risk.detectionMethod
        }
      });
    }
  }

  for (const clause of data.clauses) {
    const text = [clause.title, clause.category, clause.plainLanguageSummary, clause.sourceText].filter(Boolean).join(" ");
    const categoryLabel = clause.category.toLowerCase().replaceAll("_", " ");
    const categoryBoost = normalizedQuestion.includes(categoryLabel) || normalizedQuestion.includes(clause.title.toLowerCase()) ? 4 : 0;
    const score = keywordScore(questionTokens, text, referencePriority.CLAUSE + categoryBoost);
    if (score > referencePriority.CLAUSE) {
      references.push({
        type: "CLAUSE",
        title: clause.title,
        label: `${titleCase(clause.category)} clause`,
        excerpt: excerpt(clause.plainLanguageSummary || clause.sourceText),
        score,
        priority: referencePriority.CLAUSE,
        metadata: {
          category: clause.category,
          extractionMethod: clause.extractionMethod,
          pageNumber: clause.pageNumber
        }
      });
    }
  }

  for (const recommendation of data.recommendations) {
    const text = [recommendation.title, recommendation.description, recommendation.riskFinding?.title, recommendation.riskFinding?.ruleId, recommendation.riskFinding?.clauseFinding?.title].filter(Boolean).join(" ");
    const score = keywordScore(questionTokens, text, referencePriority.RECOMMENDATION);
    if (score > referencePriority.RECOMMENDATION) {
      references.push({
        type: "RECOMMENDATION",
        title: recommendation.title,
        label: `Priority ${recommendation.priority} recommendation`,
        excerpt: excerpt(recommendation.description),
        score,
        priority: referencePriority.RECOMMENDATION,
        metadata: {
          priority: recommendation.priority,
          riskTitle: recommendation.riskFinding?.title ?? null,
          riskLevel: recommendation.riskFinding?.riskLevel ?? null,
          clauseTitle: recommendation.riskFinding?.clauseFinding?.title ?? null
        }
      });
    }
  }

  for (const chunk of data.chunks) {
    const score = keywordScore(questionTokens, chunk.text, referencePriority.CHUNK);
    if (score > referencePriority.CHUNK) {
      references.push({
        type: "CHUNK",
        title: `Text chunk ${chunk.chunkIndex}`,
        label: `Document text chunk ${chunk.chunkIndex}`,
        excerpt: excerpt(chunk.text),
        score,
        priority: referencePriority.CHUNK,
        metadata: {
          chunkIndex: chunk.chunkIndex,
          characterStart: chunk.characterStart,
          characterEnd: chunk.characterEnd
        }
      });
    }
  }

  if (data.report?.summarySnapshot) {
    const score = keywordScore(questionTokens, data.report.summarySnapshot, referencePriority.REPORT);
    if (score > referencePriority.REPORT || hasAny(normalizedQuestion, [/summar/i, /overview/i, /score/i])) {
      references.push({
        type: "REPORT",
        title: data.report.title,
        label: "Latest report summary",
        excerpt: excerpt(data.report.summarySnapshot),
        score: Math.max(score, referencePriority.REPORT + 1),
        priority: referencePriority.REPORT,
        metadata: {
          reportId: data.report.id,
          riskScore: data.report.riskScoreSnapshot
        }
      });
    }
  }

  return references.sort(referenceSort).slice(0, 5);
}

function topRisks(data: Awaited<ReturnType<typeof loadGroundingData>>) {
  return [...data.risks].sort((left, right) => {
    const levelDelta = riskWeight(right.riskLevel) - riskWeight(left.riskLevel);
    if (levelDelta !== 0) return levelDelta;
    return right.confidence - left.confidence;
  });
}

function clausesByCategory(data: Awaited<ReturnType<typeof loadGroundingData>>, categories: ClauseCategory[]) {
  return data.clauses.filter((clause) => categories.includes(clause.category));
}

function answerFromQuestion(input: {
  question: string;
  document: Awaited<ReturnType<typeof assertDocumentAccess>>;
  data: Awaited<ReturnType<typeof loadGroundingData>>;
  references: Citation[];
}) {
  const normalized = input.question.toLowerCase();
  const risks = topRisks(input.data);
  const reportSummary = input.data.report?.summarySnapshot ?? input.document.summary;

  if (hasAny(normalized, [/summar/i, /overview/i, /what is this document/i])) {
    if (!reportSummary) return "The document does not clearly include enough extracted summary data yet. Run analysis first, then ask again.";
    const mainRisks = risks.slice(0, 3).map((risk) => `${risk.title} (${titleCase(risk.riskLevel)})`).join(", ");
    return `${reportSummary}${mainRisks ? ` The main detected risks are ${mainRisks}.` : ""}`;
  }

  if (hasAny(normalized, [/biggest risk/i, /top risk/i, /main risk/i, /highest risk/i, /risky/i])) {
    if (risks.length === 0) return "The analyzed document does not clearly show stored risk findings yet.";
    return `The biggest risks are ${risks
      .slice(0, 5)
      .map((risk) => `${risk.title} (${titleCase(risk.riskLevel)}): ${risk.impact ?? risk.description}`)
      .join(" ")}`;
  }

  if (hasAny(normalized, [/sign/i, /signature/i, /ready to sign/i, /can i sign/i])) {
    if (risks.length === 0) return "The document does not clearly show blocking risk findings, but LexAI cannot tell you to sign. Have counsel review it before execution.";
    const highRisks = risks.filter((risk) => risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL");
    return highRisks.length > 0
      ? `I would not treat this as signature-ready from the stored findings. Resolve these first: ${highRisks.slice(0, 4).map((risk) => risk.title).join(", ")}. LexAI is not legal advice, so final sign-off should come from counsel.`
      : "The stored findings do not show high or critical risk, but LexAI cannot approve signature. Confirm the recommendations and have counsel review the final version.";
  }

  if (hasAny(normalized, [/negotiate/i, /redline/i, /change/i, /action item/i, /ask the vendor/i])) {
    if (input.data.recommendations.length === 0) return "The document does not clearly include stored recommendations yet.";
    return `Negotiate these items first: ${input.data.recommendations
      .slice(0, 6)
      .map((recommendation) => `${recommendation.title}: ${recommendation.description}`)
      .join(" ")}`;
  }

  if (hasAny(normalized, [/missing/i, /absent/i, /not include/i])) {
    const missingRisks = risks.filter((risk) => risk.ruleId?.startsWith("MISSING_") || risk.title.toLowerCase().includes("missing"));
    if (missingRisks.length === 0) return "The stored findings do not clearly identify missing clauses.";
    return `The analysis flags these missing or under-specified clauses: ${missingRisks
      .map((risk) => `${risk.title}: ${risk.recommendationHint ?? risk.description}`)
      .join(" ")}`;
  }

  const categoryQueries: Array<{ pattern: RegExp; label: string; categories: ClauseCategory[] }> = [
    { pattern: /payment|invoice|fee|billing/i, label: "payment", categories: ["PAYMENT"] },
    { pattern: /termination|terminate|cure|notice period/i, label: "termination", categories: ["TERMINATION"] },
    { pattern: /confidential|confidentiality|nda/i, label: "confidentiality", categories: ["CONFIDENTIALITY"] },
    { pattern: /liability|damages|cap|indemn/i, label: "liability", categories: ["LIABILITY", "INDEMNITY"] },
    { pattern: /security|privacy|data protection|personal data|breach/i, label: "data protection/security", categories: ["SECURITY", "PRIVACY", "DATA_PROTECTION"] }
  ];
  const categoryQuery = categoryQueries.find((query) => query.pattern.test(normalized));
  if (categoryQuery) {
    const clauses = clausesByCategory(input.data, categoryQuery.categories);
    const linkedRisks = risks.filter((risk) => risk.category && categoryQuery.categories.includes(risk.category));
    if (clauses.length === 0 && linkedRisks.length === 0) {
      return `The document does not clearly mention ${categoryQuery.label} terms in the extracted clauses or stored risks.`;
    }
    const clauseText = clauses.slice(0, 3).map((clause) => `${clause.title}: ${clause.plainLanguageSummary || excerpt(clause.sourceText, 220)}`).join(" ");
    const riskText = linkedRisks.slice(0, 3).map((risk) => `Related risk - ${risk.title} (${titleCase(risk.riskLevel)}): ${risk.recommendationHint ?? risk.impact ?? risk.description}`).join(" ");
    return [clauseText, riskText].filter(Boolean).join(" ");
  }

  if (input.references.length === 0) {
    return "The document does not clearly mention that in the extracted text, clauses, risks, recommendations, or latest report.";
  }

  return `Here is what the stored document analysis supports: ${input.references
    .slice(0, 3)
    .map((reference) => `${reference.title}: ${reference.excerpt}`)
    .join(" ")}`;
}

function nextQuestionFor(answer: string) {
  const lower = answer.toLowerCase();
  if (lower.includes("negotiate")) return "Can you turn that into action items?";
  if (lower.includes("termination")) return "What should I change in the termination clause?";
  if (lower.includes("liability")) return "Explain the liability risk simply.";
  return "What should I negotiate first?";
}

async function buildGroundedAnswer(context: RequestContext, sessionId: string, question: string) {
  const session = await assertSessionAccess(context, sessionId);
  const document = await assertDocumentAccess(context, session.documentId);
  const data = await loadGroundingData(session.documentId);
  const references = scoreReferences(question, data);
  const answer = answerFromQuestion({ question, document, data, references });

  return {
    answer,
    references,
    metadata: {
      generatedBy: "deterministic-document-grounded-chat",
      documentId: session.documentId,
      referenceCount: references.length,
      nextQuestion: nextQuestionFor(answer)
    }
  };
}

export async function listDocumentChatSessions(context: RequestContext, documentId: string) {
  await assertDocumentAccess(context, documentId);

  return prisma.chatSession.findMany({
    where: {
      documentId,
      workspaceId: context.workspace.id
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      documentId: true,
      createdById: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          role: true,
          content: true,
          createdById: true,
          citations: true,
          metadata: true,
          createdAt: true
        }
      }
    }
  });
}

export async function createDocumentChatSession(context: RequestContext, input: CreateChatSessionInput) {
  const document = await assertDocumentAccess(context, input.documentId);
  const session = await prisma.chatSession.create({
    data: {
      workspaceId: context.workspace.id,
      documentId: input.documentId,
      createdById: context.user.id,
      title: input.title ?? `${document.title} Q&A`
    },
    select: {
      id: true
    }
  });

  return getChatSessionDetail(context, session.id);
}

export async function getChatSessionDetail(context: RequestContext, sessionId: string) {
  const { workspace } = context;

  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      workspaceId: workspace.id
    },
    select: {
      id: true,
      workspaceId: true,
      documentId: true,
      createdById: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true
        }
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdById: true,
          citations: true,
          metadata: true,
          createdAt: true
        }
      }
    }
  });

  if (!session) {
    throw new AppError("NOT_FOUND", "Chat session not found.");
  }

  return session;
}

export async function createChatSessionMessage(context: RequestContext, input: CreateChatMessageInput) {
  const session = await assertSessionAccess(context, input.sessionId);
  const grounded = await buildGroundedAnswer(context, input.sessionId, input.content);

  const [userMessage, assistantMessage] = await prisma.$transaction(async (tx) => {
    const createdUserMessage = await tx.chatMessage.create({
      data: {
        chatSessionId: input.sessionId,
        role: "USER",
        content: input.content,
        createdById: context.user.id
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdById: true,
        citations: true,
        metadata: true,
        createdAt: true
      }
    });

    const createdAssistantMessage = await tx.chatMessage.create({
      data: {
        chatSessionId: input.sessionId,
        role: "ASSISTANT",
        content: grounded.answer,
        createdById: null,
        citations: grounded.references,
        metadata: grounded.metadata
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdById: true,
        citations: true,
        metadata: true,
        createdAt: true
      }
    });

    await tx.chatSession.update({
      where: { id: input.sessionId },
      data: {
        title: session.title ?? input.content.slice(0, 80)
      },
      select: {
        id: true
      }
    });

    return [createdUserMessage, createdAssistantMessage];
  });

  return {
    sessionId: input.sessionId,
    userMessage: serializeSessionMessage(userMessage),
    assistantMessage: serializeSessionMessage(assistantMessage)
  };
}
