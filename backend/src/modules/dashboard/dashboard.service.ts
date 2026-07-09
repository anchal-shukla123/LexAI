import { DocumentStatus, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import type { RequestContext } from "../shared/request-context.js";

export async function getWorkspaceDashboard(context: RequestContext) {
  const workspaceId = context.workspace.id;
  const startedAt = Date.now();

  try {
    const [
      documentCount,
      analyzedDocumentCount,
      highRiskCount,
      riskLevelCounts,
      recentDocuments,
      recentReports,
      recentAuditLogs
    ] = await Promise.all([
      prisma.document.count({
        where: { workspaceId, deletedAt: null }
      }),
      prisma.document.count({
        where: { workspaceId, deletedAt: null, status: DocumentStatus.ANALYZED }
      }),
      prisma.riskFinding.count({
        where: {
          document: { workspaceId, deletedAt: null },
          detectionMethod: "RULE_BASED",
          riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] }
        }
      }),
      prisma.riskFinding.groupBy({
        by: ["riskLevel"],
        where: {
          document: { workspaceId, deletedAt: null },
          detectionMethod: "RULE_BASED"
        },
        _count: { _all: true }
      }),
      prisma.document.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
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
      }),
      prisma.report.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          documentId: true,
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
      }),
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actorUser: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      contextMode: "auth" as const,
      workspace: {
        ...context.workspace,
        role: context.membership.role
      },
      counts: {
        documents: documentCount,
        analyzedDocuments: analyzedDocumentCount,
        highRiskFindings: highRiskCount
      },
      recentDocuments,
      recentReports,
      recentAuditLogs,
      riskStats: {
        levels: riskLevelCounts.reduce<Record<string, number>>((accumulator, item) => {
          accumulator[item.riskLevel] = item._count._all;
          return accumulator;
        }, {})
      },
      currentUser: context.user
    };
  } finally {
    console.info(`[dashboard] workspace=${workspaceId} durationMs=${Date.now() - startedAt}`);
  }
}
