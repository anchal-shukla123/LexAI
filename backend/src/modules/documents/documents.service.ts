import type { DocumentStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import { getDemoContext } from "../demo/demo-context.js";

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

function paginationFor(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    hasNext: page * limit < total
  };
}

export async function listDocuments(input: ListDocumentsInput) {
  const { workspace } = await getDemoContext();
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

export async function createDocument(input: CreateDocumentInput) {
  const { user, workspace } = await getDemoContext();

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

export async function updateDocument(input: UpdateDocumentInput) {
  const { user, workspace } = await getDemoContext();

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

export async function softDeleteDocument(documentId: string) {
  const { user, workspace } = await getDemoContext();

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

export async function getDocumentDetail(documentId: string) {
  const { workspace } = await getDemoContext();

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
      },
      clauseFindings: {
        orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          analysisJobId: true,
          category: true,
          title: true,
          sourceText: true,
          plainLanguageSummary: true,
          confidence: true,
          pageNumber: true,
          startOffset: true,
          endOffset: true,
          createdAt: true
        }
      },
      riskFindings: {
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          analysisJobId: true,
          clauseFindingId: true,
          riskLevel: true,
          title: true,
          description: true,
          evidence: true,
          impact: true,
          confidence: true,
          createdAt: true
        }
      },
      recommendations: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          analysisJobId: true,
          riskFindingId: true,
          title: true,
          description: true,
          priority: true,
          createdAt: true
        }
      },
      reports: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          summarySnapshot: true,
          riskScoreSnapshot: true,
          createdAt: true,
          updatedAt: true
        }
      },
      chatSessions: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  return document;
}
