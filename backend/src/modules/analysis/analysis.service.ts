import type { AnalysisStatus, ClauseFinding, RiskFinding } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
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

export async function runMockAnalysis(context: RequestContext, input: AnalyzeDocumentInput) {
  const { user, workspace } = context;

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

  const startedAt = new Date();
  const job = await prisma.analysisJob.create({
    data: {
      documentId: input.documentId,
      workspaceId: workspace.id,
      requestedById: user.id,
      status: "PROCESSING",
      provider: "mock",
      startedAt,
      metadata: {
        mode: input.mode ?? "standard"
      }
    },
    select: {
      id: true
    }
  });

  const result = await prisma.$transaction(async (tx) => {
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

    const createdClauses: ClauseFinding[] = [];
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
          }
        })
      );
    }

    const createdRisks: RiskFinding[] = [];
    for (const [index, risk] of mockRisks.entries()) {
      createdRisks.push(
        await tx.riskFinding.create({
          data: {
            documentId: input.documentId,
            analysisJobId: job.id,
            clauseFindingId: createdClauses[index]?.id,
            riskLevel: risk.riskLevel,
            title: risk.title,
            description: risk.description,
            evidence: risk.evidence,
            impact: risk.impact,
            confidence: risk.confidence
          }
        })
      );
    }

    for (const [index, recommendation] of mockRecommendations.entries()) {
      await tx.recommendation.create({
        data: {
          documentId: input.documentId,
          analysisJobId: job.id,
          riskFindingId: createdRisks[index]?.id,
          title: recommendation.title,
          description: recommendation.description,
          priority: recommendation.priority
        }
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
        content: buildMockReportContent()
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
          provider: "mock"
        }
      }
    });

    return {
      jobId: job.id,
      documentId: input.documentId,
      status: "COMPLETED",
      reportId: report.id
    };
  });

  return result;
}
