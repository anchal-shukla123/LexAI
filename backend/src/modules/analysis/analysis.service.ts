import type { AnalysisStatus } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { prepareClauseExtraction, replaceClauseFindings } from "../clauses/clause-extraction.service.js";
import { ensureDocumentTextExtracted } from "../extraction/extraction.service.js";
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

const activeAnalysisStatuses: AnalysisStatus[] = ["QUEUED", "PROCESSING"];
const transactionOptions = {
  maxWait: 10_000,
  timeout: 30_000
};

function elapsedMs(startedAt: number) {
  return Date.now() - startedAt;
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

  const payloadStartedAt = Date.now();
  const reportContent = buildMockReportContent();
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
  console.info("[analysis] mock payload generated", {
    documentId: input.documentId,
    durationMs: elapsedMs(payloadStartedAt)
  });

  const clauseExtractionStartedAt = Date.now();
  const preparedClauses = await prepareClauseExtraction(context, input.documentId).catch((error: unknown) => ({
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

  const startedAt = new Date();
  const transactionStartedAt = Date.now();
  try {
    const result = await prisma.$transaction(async (tx) => {
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
            clauseCount: preparedClauses.clauseCount
          }
        },
        select: {
          id: true
        }
      });

      const existingReports = await tx.report.findMany({
        where: {
          documentId: input.documentId,
          workspaceId: workspace.id
        },
        select: {
          id: true
        }
      });
      const existingReportIds = existingReports.map((report) => report.id);

      if (existingReportIds.length > 0) {
        await tx.exportJob.deleteMany({
          where: {
            reportId: {
              in: existingReportIds
            }
          }
        });
      }

      await tx.recommendation.deleteMany({ where: { documentId: input.documentId } });
      await tx.riskFinding.deleteMany({ where: { documentId: input.documentId } });
      await tx.clauseFinding.deleteMany({ where: { documentId: input.documentId } });
      await tx.report.deleteMany({ where: { documentId: input.documentId, workspaceId: workspace.id } });

      const createdClauses: Array<{ id: string }> = [];
      if (preparedClauses.status === "COMPLETED" && preparedClauses.drafts.length > 0) {
        createdClauses.push(
          ...(await replaceClauseFindings(tx, {
            documentId: input.documentId,
            analysisJobId: job.id,
            drafts: preparedClauses.drafts
          }))
        );
      } else {
        for (const clause of mockClauses) {
          createdClauses.push(
            await tx.clauseFinding.create({
              data: {
                documentId: input.documentId,
                analysisJobId: job.id,
                category: clause.category,
                title: clause.title,
                sourceText: clause.sourceText,
                plainLanguageSummary: clause.plainLanguageSummary,
                confidence: clause.confidence
              },
              select: {
                id: true
              }
            })
          );
        }
      }

      const createdRisks: Array<{ id: string }> = [];
      for (const [index, risk] of mockRisks.entries()) {
        createdRisks.push(
          await tx.riskFinding.create({
            data: {
              documentId: input.documentId,
              analysisJobId: job.id,
              clauseFindingId: createdClauses[index]?.id ?? null,
              riskLevel: risk.riskLevel,
              title: risk.title,
              description: risk.description,
              evidence: risk.evidence,
              impact: risk.impact,
              confidence: risk.confidence
            },
            select: {
              id: true
            }
          })
        );
      }

      if (mockRecommendations.length > 0) {
        await tx.recommendation.createMany({
          data: mockRecommendations.map((recommendation, index) => ({
            documentId: input.documentId,
            analysisJobId: job.id,
            riskFindingId: createdRisks[index]?.id ?? null,
            title: recommendation.title,
            description: recommendation.description,
            priority: recommendation.priority
          }))
        });
      }

      const report = await tx.report.create({
        data: {
          workspaceId: workspace.id,
          documentId: input.documentId,
          createdById: user.id,
          status: "READY",
          title: `${document.title} Report`,
          summarySnapshot: mockAnalysisSummary,
          riskScoreSnapshot: mockAnalysisRiskScore,
          content: reportContent
        },
        select: {
          id: true
        }
      });

      await tx.analysisJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      });

      await tx.document.update({
        where: { id: input.documentId },
        data: {
          status: "ANALYZED",
          riskScore: mockAnalysisRiskScore,
          summary: mockAnalysisSummary,
          currentAnalysisJobId: job.id
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
            analysisJobId: job.id,
            reportId: report.id,
            provider: "mock",
            extractionStatus: extraction.status
          }
        }
      });

      return {
        jobId: job.id,
        documentId: input.documentId,
        status: "COMPLETED",
        reportId: report.id,
        extractionStatus: extraction.status,
        extractionAvailable: extraction.status === "COMPLETED",
        clauseExtractionStatus: preparedClauses.status,
        clauseCount: createdClauses.length
      };
    }, transactionOptions);

    console.info("[analysis] db transaction completed", {
      documentId: input.documentId,
      durationMs: elapsedMs(transactionStartedAt)
    });
    console.info("[analysis] analyze completed", {
      documentId: input.documentId,
      durationMs: elapsedMs(totalStartedAt)
    });

    return result;
  } catch (error) {
    console.error("[analysis] db transaction failed", {
      documentId: input.documentId,
      durationMs: elapsedMs(transactionStartedAt),
      error
    });
    throw error;
  }
}
