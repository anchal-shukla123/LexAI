import type { AnalysisStatus, RiskLevel } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { prepareClauseExtraction } from "../clauses/clause-extraction.service.js";
import { ensureDocumentTextExtracted } from "../extraction/extraction.service.js";
import {
  detectRiskDraftsFromClauses,
  riskLevelCounts,
  type RiskDraft
} from "../risks/risk-detection.service.js";
import type { RequestContext } from "../shared/request-context.js";
import {
  buildMockReportContent,
  mockAnalysisRiskScore,
  mockAnalysisSummary,
  mockClauses,
  mockRecommendations,
  mockRisks
} from "./mock-analysis-provider.js";

type AnalyzeDocumentInput = {
  documentId: string;
  mode?: string;
};

type StoredClauseForAnalysis = {
  id: string;
  analysisJobId: string;
  category: RiskDraft["category"];
  title: string;
  sourceText: string;
  confidence: number;
  extractionMethod: "RULE_BASED" | "MOCK";
};

type RiskForReport = {
  id: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  evidence: string;
  impact: string;
  confidence: number;
  detectionMethod: "RULE_BASED" | "MOCK";
  ruleId: string | null;
  recommendationHint: string | null;
  category: RiskDraft["category"] | null;
  clauseFindingId: string | null;
};

type RecommendationForAnalysis = {
  documentId: string;
  analysisJobId: string;
  riskFindingId: string | null;
  title: string;
  description: string;
  priority: number;
};

const activeAnalysisStatuses: AnalysisStatus[] = ["QUEUED", "PROCESSING"];
const transactionOptions = {
  maxWait: 10_000,
  timeout: 30_000
};

function elapsedMs(startedAt: number) {
  return Date.now() - startedAt;
}

function excerpt(value: string, maxLength = 900) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function scoreFromRisks(risks: Array<{ riskLevel: RiskLevel }>) {
  if (risks.length === 0) return 0;
  const score = risks.reduce((total, risk) => {
    if (risk.riskLevel === "CRITICAL") return total + 35;
    if (risk.riskLevel === "HIGH") return total + 24;
    if (risk.riskLevel === "MEDIUM") return total + 12;
    return total + 5;
  }, 25);
  return Math.min(95, score);
}

function riskLevelLabel(level: RiskLevel) {
  return level.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityLabel(level: RiskLevel) {
  if (level === "CRITICAL") return "Immediate";
  if (level === "HIGH") return "High";
  if (level === "MEDIUM") return "Medium";
  return "Low";
}

function riskScoreExplanation(riskScore: number, risks: RiskForReport[], fallbackUsed: boolean) {
  if (fallbackUsed) {
    return `The ${riskScore}/100 score is based on the mock fallback profile because real rule-based findings were not available for this document.`;
  }

  const counts = riskLevelCounts(risks);
  return `The ${riskScore}/100 score is calculated from ${risks.length} rule-based finding${risks.length === 1 ? "" : "s"}: ${counts.CRITICAL} critical, ${counts.HIGH} high, ${counts.MEDIUM} medium, and ${counts.LOW} low. Higher-severity findings carry more weight, so high and critical issues should be negotiated first.`;
}

function summaryFromRisks(risks: RiskForReport[]) {
  if (risks.length === 0) return mockAnalysisSummary;
  const topRisks = risks.slice(0, 3).map((risk) => risk.title.toLowerCase());
  return `LexAI detected ${risks.length} rule-based contract risk${risks.length === 1 ? "" : "s"} from extracted clauses. The main concerns are ${topRisks.join(", ")}. Review the supporting clause evidence before signing.`;
}

function serializeRealRiskForReport(risk: RiskDraft): RiskForReport {
  return {
    id: randomUUID(),
    riskLevel: risk.riskLevel,
    title: risk.title,
    description: risk.description,
    evidence: risk.evidence,
    impact: risk.impact,
    confidence: risk.confidence,
    detectionMethod: "RULE_BASED",
    ruleId: risk.ruleId,
    recommendationHint: risk.recommendationHint,
    category: risk.category,
    clauseFindingId: risk.clauseFindingId
  };
}

function serializeMockRiskForReport(index: number): RiskForReport {
  const risk = mockRisks[index];
  if (!risk) {
    throw new AppError("INTERNAL_ERROR", "Mock risk data is not available.");
  }

  return {
    id: randomUUID(),
    riskLevel: risk.riskLevel,
    title: risk.title,
    description: risk.description,
    evidence: risk.evidence,
    impact: risk.impact,
    confidence: risk.confidence,
    detectionMethod: "MOCK",
    ruleId: null,
    recommendationHint: null,
    category: null,
    clauseFindingId: null
  };
}

function clauseForRisk(clauses: StoredClauseForAnalysis[], risk: RiskForReport) {
  if (!risk.clauseFindingId) return null;
  return clauses.find((clause) => clause.id === risk.clauseFindingId) ?? null;
}

function buildRecommendationFromRisk(input: {
  risk: RiskForReport;
  clauses: StoredClauseForAnalysis[];
  documentId: string;
  analysisJobId: string;
  priority: number;
}): RecommendationForAnalysis {
  const clause = clauseForRisk(input.clauses, input.risk);
  const clauseLabel = clause?.title ?? (input.risk.category ? `${input.risk.category.replaceAll("_", " ").toLowerCase()} clause` : "the affected clause");
  const action = input.risk.recommendationHint ?? `Address ${input.risk.title.toLowerCase()} with precise contract language.`;
  const title = `${priorityLabel(input.risk.riskLevel)} priority: ${action.replace(/\.$/, "")}`;
  const description = [
    `Linked risk: ${input.risk.title} (${riskLevelLabel(input.risk.riskLevel)}${input.risk.ruleId ? `, ${input.risk.ruleId}` : ""}).`,
    `Affected clause: ${clauseLabel}.`,
    `Recommended action: ${action}`,
    `Business reason: ${input.risk.impact}`,
    `Evidence: ${excerpt(input.risk.evidence, 240)}`
  ].join(" ");

  return {
    documentId: input.documentId,
    analysisJobId: input.analysisJobId,
    riskFindingId: input.risk.id,
    title,
    description,
    priority: input.priority
  };
}

function buildRecommendationsFromRisks(input: {
  risks: RiskForReport[];
  clauses: StoredClauseForAnalysis[];
  documentId: string;
  analysisJobId: string;
}) {
  return input.risks.slice(0, 8).map((risk, index) =>
    buildRecommendationFromRisk({
      risk,
      clauses: input.clauses,
      documentId: input.documentId,
      analysisJobId: input.analysisJobId,
      priority: index + 1
    })
  );
}

function averageConfidence(items: Array<{ confidence: number }>) {
  if (items.length === 0) return 0;
  const average = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
  return Math.round((average <= 1 ? average * 100 : average));
}

function riskSignal(level: RiskLevel) {
  if (level === "CRITICAL" || level === "HIGH") return "high";
  if (level === "LOW") return "low";
  return "medium";
}

function buildReportContent(input: {
  summary: string;
  riskScore: number;
  risks: RiskForReport[];
  clauses: StoredClauseForAnalysis[];
  recommendations: RecommendationForAnalysis[];
  fallbackUsed: boolean;
  extraction: {
    wordCount: number;
    characterCount: number;
    chunkCount: number;
    pageCount: number | null;
    status: string;
  };
  riskDetectionStatus: string;
}) {
  const topRisks = input.risks.slice(0, 5);
  const affectedClauses = input.clauses
    .filter((clause) => input.fallbackUsed || input.risks.some((risk) => risk.clauseFindingId === clause.id))
    .slice(0, 8);
  const realOrMock = input.fallbackUsed ? "MOCK fallback" : "RULE_BASED";

  return {
    summary: input.summary,
    executiveSummary: input.summary,
    riskScore: input.riskScore,
    riskLevel: input.riskScore >= 80 ? "High" : input.riskScore >= 50 ? "Medium" : "Low",
    riskScoreExplanation: riskScoreExplanation(input.riskScore, input.risks, input.fallbackUsed),
    sourceType: realOrMock,
    fallbackUsed: input.fallbackUsed,
    generatedBy: input.fallbackUsed ? "mock-analysis-provider" : "rule-based-risk-detection",
    metrics: {
      clausesScanned: input.clauses.length,
      risksDetected: input.risks.length,
      confidence: averageConfidence([...input.clauses, ...input.risks]),
      processingTime: "Immediate",
      extractionStatus: input.extraction.status,
      extractionWordCount: input.extraction.wordCount,
      extractionCharacterCount: input.extraction.characterCount,
      extractionChunkCount: input.extraction.chunkCount,
      extractionPageCount: input.extraction.pageCount,
      riskDetectionStatus: input.riskDetectionStatus
    },
    heatmap: topRisks.map((risk) => ({
      label: risk.category?.replaceAll("_", " ") ?? risk.title,
      value: risk.riskLevel === "CRITICAL" ? 95 : risk.riskLevel === "HIGH" ? 86 : risk.riskLevel === "MEDIUM" ? 64 : 32,
      signal: riskSignal(risk.riskLevel)
    })),
    topRisks: topRisks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      severity: riskLevelLabel(risk.riskLevel),
      category: risk.category,
      ruleId: risk.ruleId,
      detectionMethod: risk.detectionMethod,
      finding: risk.description,
      evidence: risk.evidence,
      impact: risk.impact,
      action: risk.recommendationHint ?? risk.impact,
      linkedClauseId: risk.clauseFindingId,
      linkedClauseTitle: clauseForRisk(input.clauses, risk)?.title ?? null
    })),
    findings: topRisks.map((risk) => ({
      title: risk.title,
      severity: riskLevelLabel(risk.riskLevel),
      finding: `${risk.description} Evidence: ${excerpt(risk.evidence, 220)}`,
      action: risk.recommendationHint ?? risk.impact
    })),
    affectedClauses: affectedClauses.map((clause) => ({
      id: clause.id,
      category: clause.category,
      title: clause.title,
      summary: excerpt(clause.sourceText, 280),
      excerpt: excerpt(clause.sourceText),
      confidence: clause.confidence,
      extractionMethod: clause.extractionMethod,
      linkedRiskTitles: input.risks.filter((risk) => risk.clauseFindingId === clause.id).map((risk) => risk.title)
    })),
    clauses: input.clauses.map((clause) => ({
      category: clause.category,
      title: clause.title,
      sourceText: excerpt(clause.sourceText),
      excerpt: excerpt(clause.sourceText),
      confidence: clause.confidence,
      extractionMethod: clause.extractionMethod
    })),
    recommendedActions: input.recommendations.map((recommendation) => {
      const risk = input.risks.find((item) => item.id === recommendation.riskFindingId);
      return {
        title: recommendation.title,
        description: recommendation.description,
        priority: recommendation.priority,
        linkedRiskId: recommendation.riskFindingId,
        linkedRiskTitle: risk?.title ?? null,
        linkedClauseTitle: risk ? clauseForRisk(input.clauses, risk)?.title ?? null : null
      };
    }),
    recommendedRedlines: input.recommendations.map((recommendation) => {
      const risk = input.risks.find((item) => item.id === recommendation.riskFindingId);
      return {
        title: recommendation.title,
        change: recommendation.description,
        why: risk?.impact ?? "This action reduces contract ambiguity before signature.",
        priority: risk ? priorityLabel(risk.riskLevel) : "Medium",
        linkedRiskTitle: risk?.title ?? null,
        linkedClauseTitle: risk ? clauseForRisk(input.clauses, risk)?.title ?? null : null
      };
    }),
    negotiationChecklist: input.recommendations.slice(0, 6).map((recommendation) => {
      const risk = input.risks.find((item) => item.id === recommendation.riskFindingId);
      const clauseTitle = risk ? clauseForRisk(input.clauses, risk)?.title : null;
      return `${priorityLabel(risk?.riskLevel ?? "MEDIUM")}: ${risk?.recommendationHint ?? recommendation.title}${clauseTitle ? ` (${clauseTitle})` : ""}`;
    }),
    risks: input.risks.map((risk) => ({
      title: risk.title,
      riskLevel: risk.riskLevel,
      description: risk.description,
      evidence: risk.evidence,
      impact: risk.impact,
      confidence: risk.confidence,
      detectionMethod: risk.detectionMethod,
      ruleId: risk.ruleId,
      category: risk.category,
      clauseFindingId: risk.clauseFindingId
    })),
    legalDisclaimer: "LexAI provides deterministic document intelligence to support review workflows. It is not legal advice and does not replace review by a qualified attorney."
  };
}

function buildStoredClausesForAnalysis(input: {
  analysisJobId: string;
  documentId: string;
  hasRealClauses: boolean;
  drafts: Awaited<ReturnType<typeof prepareClauseExtraction>>["drafts"];
}): StoredClauseForAnalysis[] {
  if (input.hasRealClauses) {
    return input.drafts.map((draft) => ({
      id: randomUUID(),
      analysisJobId: input.analysisJobId,
      category: draft.category,
      title: draft.title,
      sourceText: draft.sourceText,
      confidence: draft.confidence,
      extractionMethod: "RULE_BASED"
    }));
  }

  return mockClauses.map((clause) => ({
    id: randomUUID(),
    analysisJobId: input.analysisJobId,
    category: clause.category,
    title: clause.title,
    sourceText: clause.sourceText,
    confidence: clause.confidence,
    extractionMethod: "MOCK"
  }));
}

export async function runMockAnalysis(context: RequestContext, input: AnalyzeDocumentInput) {
  const { user, workspace } = context;
  const totalStartedAt = Date.now();

  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      workspaceId: workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      files: {
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  if (document.files.length === 0) {
    throw new AppError("CONFLICT", "Upload a file before analyzing this document.");
  }

  const activeJob = await prisma.analysisJob.findFirst({
    where: {
      documentId: input.documentId,
      workspaceId: workspace.id,
      status: {
        in: activeAnalysisStatuses
      }
    },
    select: {
      id: true
    }
  });

  if (activeJob) {
    throw new AppError("CONFLICT", "An analysis job is already active for this document.");
  }

  const extractionStartedAt = Date.now();
  const extraction = await ensureDocumentTextExtracted(context, input.documentId).catch((error: unknown) => ({
    documentId: input.documentId,
    status: "FAILED" as const,
    wordCount: 0,
    characterCount: 0,
    chunkCount: 0,
    pageCount: null,
    fileName: null,
    mimeType: null,
    errorMessage: error instanceof Error ? error.message : "Document text extraction failed."
  }));
  console.info("[analysis] extraction completed", {
    documentId: input.documentId,
    status: extraction.status,
    durationMs: elapsedMs(extractionStartedAt)
  });

  const analysisMetadata = {
    mode: input.mode ?? "standard",
    extractionStatus: extraction.status,
    extractionAvailable: extraction.status === "COMPLETED",
    extractionWordCount: extraction.wordCount,
    extractionCharacterCount: extraction.characterCount,
    extractionChunkCount: extraction.chunkCount,
    extractionPageCount: extraction.pageCount,
    extractionErrorMessage: extraction.errorMessage
  };

  const clauseExtractionStartedAt = Date.now();
  const preparedClauses = await prepareClauseExtraction(context, input.documentId, extraction).catch((error: unknown) => ({
    documentId: input.documentId,
    status: "FAILED" as const,
    clauseCount: 0,
    categories: {},
    drafts: [],
    errorMessage: error instanceof Error ? error.message : "Clause extraction failed."
  }));
  console.info("[analysis] clause extraction prepared", {
    documentId: input.documentId,
    status: preparedClauses.status,
    clauseCount: preparedClauses.clauseCount,
    durationMs: elapsedMs(clauseExtractionStartedAt)
  });

  const hasRealClauses = preparedClauses.status === "COMPLETED" && preparedClauses.drafts.length > 0;
  const startedAt = new Date();
  const createJobStartedAt = Date.now();

  const initialState = await prisma.$transaction(async (tx) => {
    const job = await tx.analysisJob.create({
      data: {
        documentId: input.documentId,
        workspaceId: workspace.id,
        requestedById: user.id,
        status: "PROCESSING",
        provider: "mock",
        startedAt,
        metadata: {
          ...analysisMetadata,
          clauseExtractionStatus: preparedClauses.status,
          realClauseCount: hasRealClauses ? preparedClauses.clauseCount : 0,
          mockClauseCount: hasRealClauses ? 0 : mockClauses.length,
          storedClauseCount: hasRealClauses ? preparedClauses.clauseCount : mockClauses.length
        }
      },
      select: {
        id: true
      }
    });

    await tx.exportJob.deleteMany({
      where: {
        report: {
          documentId: input.documentId,
          workspaceId: workspace.id
        }
      }
    });

    await Promise.all([
      tx.recommendation.deleteMany({ where: { documentId: input.documentId } }),
      tx.riskFinding.deleteMany({ where: { documentId: input.documentId } }),
      tx.clauseFinding.deleteMany({ where: { documentId: input.documentId } }),
      tx.report.deleteMany({ where: { documentId: input.documentId, workspaceId: workspace.id } })
    ]);

    const clauses = buildStoredClausesForAnalysis({
      analysisJobId: job.id,
      documentId: input.documentId,
      hasRealClauses,
      drafts: preparedClauses.drafts
    });

    if (clauses.length > 0) {
      await tx.clauseFinding.createMany({
        data: clauses.map((clause, index) => {
          const realDraft = hasRealClauses ? preparedClauses.drafts[index] : null;
          const mockClause = hasRealClauses ? null : mockClauses[index];

          return {
            id: clause.id,
            documentId: input.documentId,
            analysisJobId: job.id,
            extractionMethod: clause.extractionMethod,
            category: clause.category,
            title: clause.title,
            sourceText: clause.sourceText,
            plainLanguageSummary: realDraft?.plainLanguageSummary ?? mockClause?.plainLanguageSummary ?? clause.title,
            confidence: clause.confidence,
            pageNumber: realDraft?.pageNumber ?? null,
            startOffset: realDraft?.startOffset ?? null,
            endOffset: realDraft?.endOffset ?? null
          };
        })
      });
    }

    return {
      jobId: job.id,
      clauses
    };
  }, transactionOptions);

  console.info("[analysis] clauses stored", {
    documentId: input.documentId,
    durationMs: elapsedMs(createJobStartedAt)
  });

  const riskDetectionStartedAt = Date.now();
  const realRiskDrafts = hasRealClauses ? detectRiskDraftsFromClauses(initialState.clauses) : [];
  const realRisksForReport = realRiskDrafts.map(serializeRealRiskForReport);
  const useRealRisks = realRisksForReport.length > 0;
  const fallbackUsed = !useRealRisks;
  const selectedRisks = useRealRisks ? realRisksForReport : mockRisks.map((_, index) => serializeMockRiskForReport(index));
  const riskDetectionStatus = useRealRisks ? "COMPLETED" : hasRealClauses ? "NO_RISKS_FOUND" : "NO_REAL_CLAUSES";
  console.info("[analysis] risk detection completed", {
    documentId: input.documentId,
    status: riskDetectionStatus,
    realRiskCount: realRisksForReport.length,
    durationMs: elapsedMs(riskDetectionStartedAt)
  });

  const summary = useRealRisks ? summaryFromRisks(selectedRisks) : mockAnalysisSummary;
  const riskScore = useRealRisks ? scoreFromRisks(selectedRisks) : mockAnalysisRiskScore;
  const counts = riskLevelCounts(useRealRisks ? selectedRisks : []);
  const recommendations = useRealRisks
    ? buildRecommendationsFromRisks({
        risks: selectedRisks,
        clauses: initialState.clauses,
        documentId: input.documentId,
        analysisJobId: initialState.jobId
      })
    : mockRecommendations.map((recommendation, index) => ({
        documentId: input.documentId,
        analysisJobId: initialState.jobId,
        riskFindingId: selectedRisks[index]?.id ?? null,
        title: recommendation.title,
        description: recommendation.description,
        priority: recommendation.priority
      }));
  const reportContent = useRealRisks
    ? buildReportContent({
        summary,
        riskScore,
        risks: selectedRisks,
        clauses: initialState.clauses,
        recommendations,
        fallbackUsed,
        extraction: {
          status: extraction.status,
          wordCount: extraction.wordCount,
          characterCount: extraction.characterCount,
          chunkCount: extraction.chunkCount,
          pageCount: extraction.pageCount
        },
        riskDetectionStatus
      })
    : {
        ...buildMockReportContent(),
        fallbackUsed,
        sourceType: "MOCK fallback",
        riskScoreExplanation: riskScoreExplanation(riskScore, selectedRisks, fallbackUsed),
        topRisks: selectedRisks.map((risk) => ({
          id: risk.id,
          title: risk.title,
          severity: riskLevelLabel(risk.riskLevel),
          detectionMethod: risk.detectionMethod,
          finding: risk.description,
          evidence: risk.evidence,
          impact: risk.impact,
          action: risk.impact,
          linkedClauseId: risk.clauseFindingId,
          linkedClauseTitle: clauseForRisk(initialState.clauses, risk)?.title ?? null
        })),
        affectedClauses: initialState.clauses.map((clause) => ({
          id: clause.id,
          category: clause.category,
          title: clause.title,
          summary: excerpt(clause.sourceText, 280),
          excerpt: excerpt(clause.sourceText),
          confidence: clause.confidence,
          extractionMethod: clause.extractionMethod,
          linkedRiskTitles: selectedRisks.filter((risk) => risk.clauseFindingId === clause.id).map((risk) => risk.title)
        })),
        recommendedActions: recommendations.map((recommendation) => ({
          title: recommendation.title,
          description: recommendation.description,
          priority: recommendation.priority,
          linkedRiskId: recommendation.riskFindingId,
          linkedRiskTitle: selectedRisks.find((risk) => risk.id === recommendation.riskFindingId)?.title ?? null,
          linkedClauseTitle: null
        })),
        negotiationChecklist: recommendations.map((recommendation) => recommendation.description),
        legalDisclaimer: "LexAI provides deterministic document intelligence to support review workflows. It is not legal advice and does not replace review by a qualified attorney."
      };

  const finalizeStartedAt = Date.now();
  try {
    const reportId = randomUUID();
    const result = await prisma.$transaction(async (tx) => {
      await tx.riskFinding.createMany({
        data: selectedRisks.map((risk, index) => ({
          id: risk.id,
          documentId: input.documentId,
          analysisJobId: initialState.jobId,
          clauseFindingId: useRealRisks ? realRiskDrafts[index]?.clauseFindingId ?? null : initialState.clauses[index]?.id ?? null,
          detectionMethod: risk.detectionMethod,
          ruleId: risk.ruleId,
          category: useRealRisks ? realRiskDrafts[index]?.category ?? null : null,
          riskLevel: risk.riskLevel,
          title: risk.title,
          description: risk.description,
          evidence: risk.evidence,
          impact: risk.impact,
          recommendationHint: risk.recommendationHint,
          confidence: risk.confidence
        }))
      });

      if (recommendations.length > 0) {
        await tx.recommendation.createMany({
          data: recommendations
        });
      }

      await tx.report.createMany({
        data: [{
          id: reportId,
          workspaceId: workspace.id,
          documentId: input.documentId,
          createdById: user.id,
          status: "READY",
          title: `${document.title} Report`,
          summarySnapshot: summary,
          riskScoreSnapshot: riskScore,
          content: reportContent
        }]
      });

      await tx.analysisJob.update({
        where: { id: initialState.jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          metadata: {
            ...analysisMetadata,
            clauseExtractionStatus: preparedClauses.status,
            riskDetectionStatus,
            realClauseCount: hasRealClauses ? initialState.clauses.length : 0,
            mockClauseCount: hasRealClauses ? 0 : initialState.clauses.length,
            storedClauseCount: initialState.clauses.length,
            realRiskCount: useRealRisks ? selectedRisks.length : 0,
            mockRiskCount: useRealRisks ? 0 : selectedRisks.length,
            storedRiskCount: selectedRisks.length,
            riskLevelCounts: counts,
            fallbackUsed
          }
        }
      });

      await tx.document.update({
        where: { id: input.documentId },
        data: {
          status: "ANALYZED",
          riskScore,
          summary,
          currentAnalysisJobId: initialState.jobId
        }
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: user.id,
          action: "ANALYSIS_COMPLETED",
          entityType: "Document",
          entityId: input.documentId,
          metadata: {
            analysisJobId: initialState.jobId,
            reportId,
            provider: "mock",
            extractionStatus: extraction.status,
            clauseExtractionStatus: preparedClauses.status,
            riskDetectionStatus,
            fallbackUsed
          }
        }
      });

      return {
        jobId: initialState.jobId,
        documentId: input.documentId,
        status: "COMPLETED",
        reportId,
        extractionStatus: extraction.status,
        extractionAvailable: extraction.status === "COMPLETED",
        clauseExtractionStatus: preparedClauses.status,
        riskDetectionStatus,
        realClauseCount: hasRealClauses ? initialState.clauses.length : 0,
        mockClauseCount: hasRealClauses ? 0 : initialState.clauses.length,
        storedClauseCount: initialState.clauses.length,
        realRiskCount: useRealRisks ? selectedRisks.length : 0,
        mockRiskCount: useRealRisks ? 0 : selectedRisks.length,
        riskLevelCounts: counts,
        fallbackUsed
      };
    }, transactionOptions);

    console.info("[analysis] analysis finalized", {
      documentId: input.documentId,
      durationMs: elapsedMs(finalizeStartedAt)
    });
    console.info("[analysis] analyze completed", {
      documentId: input.documentId,
      durationMs: elapsedMs(totalStartedAt)
    });

    return result;
  } catch (error) {
    console.error("[analysis] finalize failed", {
      documentId: input.documentId,
      durationMs: elapsedMs(finalizeStartedAt),
      error
    });

    await prisma.analysisJob.update({
      where: { id: initialState.jobId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorCode: "ANALYSIS_FINALIZE_FAILED",
        errorMessage: error instanceof Error ? error.message : "Analysis finalization failed."
      }
    });

    throw error;
  }
}
