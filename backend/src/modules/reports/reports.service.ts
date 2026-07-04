import type { Prisma, ReportStatus } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import type { RequestContext } from "../shared/request-context.js";

type ListReportsInput = {
  page: number;
  limit: number;
  status?: ReportStatus;
};

function paginationFor(page: number, limit: number, total: number): Pagination {
  return {
    page,
    limit,
    total,
    hasNext: page * limit < total
  };
}

export async function listReports(context: RequestContext, input: ListReportsInput) {
  const { workspace } = context;
  const where: Prisma.ReportWhereInput = {
    workspaceId: workspace.id,
    ...(input.status ? { status: input.status } : {})
  };

  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        documentId: true,
        title: true,
        status: true,
        summarySnapshot: true,
        riskScoreSnapshot: true,
        createdAt: true,
        updatedAt: true,
        document: {
          select: {
            id: true,
            title: true,
            riskScore: true,
            status: true
          }
        }
      }
    })
  ]);

  return {
    reports,
    pagination: paginationFor(input.page, input.limit, total)
  };
}

export async function getReportDetail(context: RequestContext, reportId: string) {
  const { workspace } = context;

  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      workspaceId: workspace.id
    },
    select: {
      id: true,
      workspaceId: true,
      documentId: true,
      createdById: true,
      status: true,
      title: true,
      summarySnapshot: true,
      riskScoreSnapshot: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true,
          createdAt: true,
          updatedAt: true
        }
      },
      exportJobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          format: true,
          status: true,
          storageKey: true,
          expiresAt: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!report) {
    throw new AppError("NOT_FOUND", "Report not found.");
  }

  return report;
}
