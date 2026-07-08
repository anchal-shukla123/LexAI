import { DocumentStatus, RiskLevel } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import type { RequestContext } from "../shared/request-context.js";

export async function getWorkspaceDashboard(context: RequestContext) {
  const workspaceId = context.workspace.id;

  const [
    documentCount,
    analyzedDocumentCount,
    highRiskCount,
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
        riskScoreSnapshot: true,
        createdAt: true,
        updatedAt: true,
        document: {
          select: {
            id: true,
            title: true
          }
        }
      }
    }),
    prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
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
    currentUser: context.user
  };
}
