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
    recommendationHint: risk.recommendationHint
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
    recommendationHint: null
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
  const reportContent = {
    ...buildMockReportContent(),
    summary,
    riskScore,
    clauses: initialState.clauses.map((clause) => ({
      category: clause.category,
      title: clause.title,
      sourceText: excerpt(clause.sourceText),
      excerpt: excerpt(clause.sourceText),
      confidence: clause.confidence,
      extractionMethod: clause.extractionMethod
    })),
    risks: selectedRisks.map((risk) => ({
      title: risk.title,
      riskLevel: risk.riskLevel,
      description: risk.description,
      evidence: risk.evidence,
      impact: risk.impact,
      confidence: risk.confidence,
      detectionMethod: risk.detectionMethod,
      ruleId: risk.ruleId
    })),
    generatedBy: useRealRisks ? "rule-based-risk-detection" : "mock-analysis-provider"
  };

  const finalizeStartedAt = Date.now();
  try {
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

      const recommendations = useRealRisks
        ? selectedRisks.slice(0, 6).map((risk, index) => ({
            documentId: input.documentId,
            analysisJobId: initialState.jobId,
            riskFindingId: risk.id,
            title: risk.recommendationHint ?? `Review ${risk.title}`,
            description: risk.recommendationHint ?? risk.description,
            priority: index + 1
          }))
        : mockRecommendations.map((recommendation, index) => ({
            documentId: input.documentId,
            analysisJobId: initialState.jobId,
            riskFindingId: selectedRisks[index]?.id ?? null,
            title: recommendation.title,
            description: recommendation.description,
            priority: recommendation.priority
          }));

      if (recommendations.length > 0) {
        await tx.recommendation.createMany({
          data: recommendations
        });
      }

      const report = await tx.report.create({
        data: {
          workspaceId: workspace.id,
          documentId: input.documentId,
          createdById: user.id,
          status: "READY",
          title: `${document.title} Report`,
          summarySnapshot: summary,
          riskScoreSnapshot: riskScore,
          content: reportContent
        },
        select: {
          id: true
        }
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
            reportId: report.id,
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
        reportId: report.id,
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
