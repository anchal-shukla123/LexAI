import type { DocumentStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import type { RequestContext } from "../shared/request-context.js";

type ListDocumentsInput = {
  page: number;
  limit: number;
  status?: DocumentStatus;
};

type CreateDocumentInput = {
  title: string;
  description?: string;
};

type UpdateDocumentInput = {
  documentId: string;
  title?: string;
  description?: string | null;
};

type DocumentDetailView = "detail" | "summary";

type DocumentDetailInput = {
  view?: DocumentDetailView;
};

const DETAIL_LIMITS = {
  clauses: 10,
  risks: 10,
  recommendations: 10,
  reports: 3,
  chats: 5
};

const SUMMARY_LIMITS = {
  clauses: 3,
  risks: 3,
  recommendations: 3,
  reports: 1,
  chats: 1
};

function paginationFor(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    hasNext: page * limit < total
  };
}

function limitsFor(view: DocumentDetailView) {
  return view === "summary" ? SUMMARY_LIMITS : DETAIL_LIMITS;
}

function statusFromMetadata(value: Prisma.JsonValue | null | undefined, key: string) {
  const metadata = metadataObject(value);
  const status = metadata?.[key];
  return typeof status === "string" ? status : null;
}

function metadataObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function metadataNumber(value: Prisma.JsonValue | null | undefined, key: string) {
  const metadata = metadataObject(value);
  const numberValue = metadata?.[key];
  return typeof numberValue === "number" ? numberValue : null;
}

function metadataString(value: Prisma.JsonValue | null | undefined, key: string) {
  const metadata = metadataObject(value);
  const stringValue = metadata?.[key];
  return typeof stringValue === "string" ? stringValue : null;
}

function metadataRecord(value: Prisma.JsonValue | null | undefined, key: string) {
  const metadata = metadataObject(value);
  const recordValue = metadata?.[key];
  if (!recordValue || typeof recordValue !== "object" || Array.isArray(recordValue)) return null;

  return Object.entries(recordValue).reduce<Record<string, number>>((accumulator, [recordKey, recordEntry]) => {
    if (typeof recordEntry === "number") {
      accumulator[recordKey] = recordEntry;
    }
    return accumulator;
  }, {});
}

function riskLevelRank(level: string) {
  const ranks: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  return ranks[level] ?? 0;
}

function countLoadedBy<T extends string | null>(items: Array<{ value: T }>) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = item.value ?? "UNCATEGORIZED";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

export async function listDocuments(context: RequestContext, input: ListDocumentsInput) {
  const { workspace } = context;
  const where: Prisma.DocumentWhereInput = {
    workspaceId: workspace.id,
    deletedAt: null,
    ...(input.status ? { status: input.status } : {})
  };

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        riskScore: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        files: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            originalName: true,
            mimeType: true,
            extension: true,
            sizeBytes: true,
            checksum: true,
            createdAt: true
          }
        },
        currentAnalysisJob: {
          select: {
            id: true,
            status: true,
            provider: true,
            startedAt: true,
            completedAt: true,
            failedAt: true,
            errorCode: true,
            errorMessage: true,
            metadata: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })
  ]);

  return {
    documents,
    pagination: paginationFor(input.page, input.limit, total)
  };
}

export async function createDocument(context: RequestContext, input: CreateDocumentInput) {
  const { user, workspace } = context;

  const document = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      title: input.title,
      description: input.description,
      status: "UPLOADED"
    },
    select: {
      id: true,
      title: true,
      status: true
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "DOCUMENT_CREATED",
      entityType: "Document",
      entityId: document.id
    }
  });

  return document;
}

export async function updateDocument(context: RequestContext, input: UpdateDocumentInput) {
  const { user, workspace } = context;

  const existingDocument = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      workspaceId: workspace.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!existingDocument) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  const document = await prisma.document.update({
    where: { id: input.documentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {})
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      updatedAt: true
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "DOCUMENT_UPDATED",
      entityType: "Document",
      entityId: document.id
    }
  });

  return document;
}

export async function softDeleteDocument(context: RequestContext, documentId: string) {
  const { user, workspace } = context;

  const existingDocument = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: workspace.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!existingDocument) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      deletedAt: new Date(),
      status: "ARCHIVED"
    },
    select: {
      id: true
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: documentId
    }
  });

  return {
    deleted: true
  };
}

export async function getDocumentDetail(context: RequestContext, documentId: string, input: DocumentDetailInput = {}) {
  const { workspace } = context;
  const view = input.view ?? "detail";
  const limits = limitsFor(view);

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      workspaceId: true,
      createdById: true,
      title: true,
      description: true,
      status: true,
      riskScore: true,
      summary: true,
      currentAnalysisJobId: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  const currentAnalysisJob = document.currentAnalysisJobId
    ? await prisma.analysisJob.findUnique({
        where: { id: document.currentAnalysisJobId },
        select: {
          id: true,
          status: true,
          provider: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          errorCode: true,
          errorMessage: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      })
    : null;

  const metadata = currentAnalysisJob?.metadata;

  const clauseFindings = await prisma.clauseFinding.findMany({
    where: { documentId: document.id },
    orderBy: [{ extractionMethod: "asc" }, { pageNumber: "asc" }, { createdAt: "asc" }],
    take: limits.clauses,
    select: {
      id: true,
      analysisJobId: true,
      category: true,
      extractionMethod: true,
      title: true,
      sourceText: true,
      plainLanguageSummary: true,
      confidence: true,
      pageNumber: true,
      startOffset: true,
      endOffset: true,
      createdAt: true
    }
  });
  const riskFindings = await prisma.riskFinding.findMany({
    where: { documentId: document.id },
    orderBy: [{ riskLevel: "desc" }, { confidence: "desc" }, { createdAt: "asc" }],
    take: limits.risks,
    select: {
      id: true,
      analysisJobId: true,
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
  });
  const recommendations = await prisma.recommendation.findMany({
    where: { documentId: document.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: limits.recommendations,
    select: {
      id: true,
      analysisJobId: true,
      riskFindingId: true,
      title: true,
      description: true,
      priority: true,
      createdAt: true,
      riskFinding: {
        select: {
          id: true,
          title: true,
          riskLevel: true,
          ruleId: true,
          category: true,
          detectionMethod: true,
          clauseFinding: {
            select: {
              title: true,
              category: true
            }
          }
        }
      }
    }
  });
  const reports = await prisma.report.findMany({
    where: { documentId: document.id },
    orderBy: { createdAt: "desc" },
    take: limits.reports,
    select: {
      id: true,
      title: true,
      status: true,
      summarySnapshot: true,
      riskScoreSnapshot: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const { currentAnalysisJobId, ...documentWithoutCurrentAnalysisJobId } = document;
  const documentDetail = {
    ...documentWithoutCurrentAnalysisJobId,
    files: [],
    currentAnalysisJob,
    clauseFindings,
    riskFindings,
    recommendations,
    reports,
    chatSessions: []
  };

  void currentAnalysisJobId;

  const extractionStatus = metadataString(metadata, "extractionStatus");
  const loadedClauseCountsByMethod = countLoadedBy(
    clauseFindings.map((clause) => ({ value: clause.extractionMethod }))
  );
  const loadedRiskCountsByMethod = countLoadedBy(
    riskFindings.map((risk) => ({ value: risk.detectionMethod }))
  );
  const realClauseCount = metadataNumber(metadata, "realClauseCount") ?? loadedClauseCountsByMethod.RULE_BASED ?? 0;
  const mockClauseCount = metadataNumber(metadata, "mockClauseCount") ?? loadedClauseCountsByMethod.MOCK ?? 0;
  const storedClauseCount = metadataNumber(metadata, "storedClauseCount") ?? realClauseCount + mockClauseCount;
  const realRiskCount = metadataNumber(metadata, "realRiskCount") ?? loadedRiskCountsByMethod.RULE_BASED ?? 0;
  const mockRiskCount = metadataNumber(metadata, "mockRiskCount") ?? loadedRiskCountsByMethod.MOCK ?? 0;
  const storedRiskCount = metadataNumber(metadata, "storedRiskCount") ?? realRiskCount + mockRiskCount;
  const clauseMetadataStatus = statusFromMetadata(metadata, "clauseExtractionStatus");
  const riskMetadataStatus = statusFromMetadata(metadata, "riskDetectionStatus");
  const clauseExtractionStatus =
    realClauseCount > 0
      ? "COMPLETED"
      : clauseMetadataStatus === "FAILED"
        ? "FAILED"
        : mockClauseCount > 0 && (clauseMetadataStatus === "NO_CLAUSES_FOUND" || clauseMetadataStatus === "EXTRACTION_UNAVAILABLE")
          ? "FALLBACK_MOCK_USED"
          : clauseMetadataStatus === "NO_CLAUSES_FOUND"
            ? "NO_CLAUSES_FOUND"
            : clauseMetadataStatus === "EXTRACTION_UNAVAILABLE"
              ? "EXTRACTION_UNAVAILABLE"
              : "NOT_STARTED";
  const riskDetectionStatus =
    realRiskCount > 0
      ? "COMPLETED"
      : mockRiskCount > 0
        ? "FALLBACK_MOCK_USED"
        : riskMetadataStatus === "NO_RISKS_FOUND"
          ? "NO_RISKS_FOUND"
          : riskMetadataStatus === "NO_REAL_CLAUSES"
            ? "NO_REAL_CLAUSES"
            : riskMetadataStatus === "FAILED"
              ? "FAILED"
              : "NOT_STARTED";
  const clauseCategories = countLoadedBy(
    clauseFindings
      .filter((clause) => clause.extractionMethod === "RULE_BASED")
      .map((clause) => ({ value: clause.category }))
  );
  const riskLevels =
    metadataRecord(metadata, "riskLevelCounts") ??
    countLoadedBy(
      riskFindings
        .filter((risk) => risk.detectionMethod === "RULE_BASED")
        .map((risk) => ({ value: risk.riskLevel }))
    );
  const topRisks = [...riskFindings]
    .sort((left, right) => riskLevelRank(String(right.riskLevel)) - riskLevelRank(String(left.riskLevel)))
    .slice(0, 5);

  return {
    ...documentDetail,
    clauseFindings: clauseFindings.map((clause) => ({
      ...clause
    })),
    riskFindings: riskFindings.map((risk) => ({
      ...risk
    })),
    extraction: extractionStatus
      ? {
          status: extractionStatus,
          wordCount: metadataNumber(metadata, "extractionWordCount") ?? 0,
          characterCount: metadataNumber(metadata, "extractionCharacterCount") ?? 0,
          pageCount: metadataNumber(metadata, "extractionPageCount"),
          chunkCount: metadataNumber(metadata, "extractionChunkCount") ?? 0,
          fileName: null,
          mimeType: null,
          errorMessage: metadataString(metadata, "extractionErrorMessage"),
          preview: null
        }
      : null,
    clauseExtraction: {
      status: clauseExtractionStatus,
      realClauseCount,
      mockClauseCount,
      storedClauseCount,
      categories: clauseCategories,
      topClauses: clauseFindings.slice(0, 5).map((clause) => ({
        title: clause.title,
        category: clause.category,
        extractionMethod: clause.extractionMethod,
        isFallbackMock: clause.extractionMethod === "MOCK",
        confidence: clause.confidence,
        excerpt: clause.plainLanguageSummary
      }))
    },
    riskDetection: {
      status: riskDetectionStatus,
      realRiskCount,
      mockRiskCount,
      storedRiskCount,
      riskLevelCounts: riskLevels,
      topRisks: topRisks.map((risk) => ({
        title: risk.title,
        category: risk.category,
        riskLevel: risk.riskLevel,
        detectionMethod: risk.detectionMethod,
        isFallbackMock: risk.detectionMethod === "MOCK",
        ruleId: risk.ruleId,
        confidence: risk.confidence,
        evidence: risk.description
      }))
    }
  };
}
