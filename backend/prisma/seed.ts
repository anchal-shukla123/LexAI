import {
  AnalysisStatus,
  ChatRole,
  ClauseCategory,
  DocumentStatus,
  ExportFormat,
  ExportStatus,
  Prisma,
  PrismaClient,
  ReportStatus,
  RiskLevel,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

const documentSummary =
  "LexAI found moderate contractual risk in this agreement. The main concerns relate to uncapped liability, ambiguous termination rights, missing security obligations, and limited indemnity protection. The agreement is usable, but several clauses should be reviewed before execution.";

const aiPreferences: Prisma.JsonObject = {
  analysisDepth: "balanced",
  tone: "legal-professional",
  includeRecommendations: true,
  showConfidenceScores: true,
  highlightRiskyClauses: true
};

const reportContent: Prisma.JsonObject = {
  executiveSummary: documentSummary,
  riskScore: 74,
  riskLevel: "Medium",
  metrics: {
    clausesScanned: 216,
    risksDetected: 7,
    confidence: 91,
    processingTime: "30s"
  },
  heatmap: [
    { label: "Liability", value: 88, signal: "high" },
    { label: "Privacy", value: 76, signal: "medium" },
    { label: "Termination", value: 72, signal: "medium" },
    { label: "Payment", value: 34, signal: "low" },
    { label: "Security", value: 79, signal: "medium" },
    { label: "Audit", value: 28, signal: "low" }
  ],
  findings: [
    {
      title: "Uncapped liability",
      severity: "High",
      finding: "The agreement does not clearly limit aggregate exposure for privacy or commercial claims.",
      action: "Negotiate a liability cap tied to fees or an agreed monetary ceiling."
    },
    {
      title: "Ambiguous termination rights",
      severity: "Medium",
      finding: "Termination triggers and cure periods are not specific enough for operational planning.",
      action: "Define termination for cause, convenience, notice periods, and cure windows."
    },
    {
      title: "Missing security obligations",
      severity: "Medium",
      finding: "Security controls are referenced generally but ownership and minimum safeguards are incomplete.",
      action: "Add baseline controls, audit evidence, and breach response obligations."
    },
    {
      title: "Limited indemnity protection",
      severity: "Medium",
      finding: "Indemnity language does not fully cover regulatory claims or third-party privacy losses.",
      action: "Expand indemnity scope for data protection failures and vendor misconduct."
    }
  ],
  recommendedRedlines: [
    {
      title: "Add liability cap",
      change: "Insert a clear aggregate cap tied to fees or a negotiated monetary ceiling.",
      why: "It limits unexpected financial exposure before the agreement is signed.",
      priority: "High"
    },
    {
      title: "Clarify termination notice period",
      change: "Specify notice windows, cure periods, and termination triggers.",
      why: "Clear exits reduce operational ambiguity if service quality or compliance changes.",
      priority: "Medium"
    },
    {
      title: "Define security obligations",
      change: "Add minimum safeguards, encryption expectations, audit evidence, and ownership.",
      why: "Specific duties make vendor accountability measurable after execution.",
      priority: "Medium"
    },
    {
      title: "Add breach notification timeline",
      change: "Require notification within a fixed timeframe after discovery.",
      why: "A defined timeline supports regulatory response and customer communication.",
      priority: "Medium"
    }
  ]
};

async function upsertDocumentFile(documentId: string, uploadedById: string) {
  const existing = await prisma.documentFile.findFirst({
    where: { documentId, storageKey: "demo/vendor-dpa.pdf" }
  });

  const data = {
    fileName: "vendor-dpa.pdf",
    originalName: "vendor-dpa.pdf",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 1_240_000,
    storageKey: "demo/vendor-dpa.pdf",
    checksum: "demo-vendor-dpa-checksum",
    uploadedById
  };

  if (existing) {
    return prisma.documentFile.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.documentFile.create({
    data: {
      ...data,
      documentId
    }
  });
}

async function upsertClauseFinding(documentId: string, analysisJobId: string, data: {
  category: ClauseCategory;
  title: string;
  sourceText: string;
  plainLanguageSummary: string;
  confidence: number;
  pageNumber: number;
}) {
  const existing = await prisma.clauseFinding.findFirst({
    where: { documentId, title: data.title }
  });

  if (existing) {
    return prisma.clauseFinding.update({
      where: { id: existing.id },
      data: {
        ...data,
        extractionMethod: "MOCK",
        analysisJobId
      }
    });
  }

  return prisma.clauseFinding.create({
    data: {
      ...data,
      documentId,
      analysisJobId,
      extractionMethod: "MOCK"
    }
  });
}

async function upsertRiskFinding(documentId: string, analysisJobId: string, data: {
  clauseFindingId?: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  evidence: string;
  impact: string;
  confidence: number;
}) {
  const existing = await prisma.riskFinding.findFirst({
    where: { documentId, title: data.title }
  });

  if (existing) {
    return prisma.riskFinding.update({
      where: { id: existing.id },
      data: {
        ...data,
        analysisJobId
      }
    });
  }

  return prisma.riskFinding.create({
    data: {
      ...data,
      documentId,
      analysisJobId
    }
  });
}

async function upsertRecommendation(documentId: string, analysisJobId: string, data: {
  riskFindingId?: string;
  title: string;
  description: string;
  priority: number;
}) {
  const existing = await prisma.recommendation.findFirst({
    where: { documentId, title: data.title }
  });

  if (existing) {
    return prisma.recommendation.update({
      where: { id: existing.id },
      data: {
        ...data,
        analysisJobId
      }
    });
  }

  return prisma.recommendation.create({
    data: {
      ...data,
      documentId,
      analysisJobId
    }
  });
}

async function main() {
  const completedAt = new Date();

  const user = await prisma.user.upsert({
    where: { email: "anchal@example.com" },
    update: {
      name: "Anchal Shukla",
      passwordHash: "mock-hash-do-not-use-in-prod"
    },
    create: {
      name: "Anchal Shukla",
      email: "anchal@example.com",
      passwordHash: "mock-hash-do-not-use-in-prod",
      emailVerifiedAt: completedAt
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "apex-workspace" },
    update: {
      name: "Apex Workspace",
      createdById: user.id
    },
    create: {
      name: "Apex Workspace",
      slug: "apex-workspace",
      createdById: user.id
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    update: {
      role: UserRole.OWNER,
      joinedAt: completedAt
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: UserRole.OWNER,
      joinedAt: completedAt
    }
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      theme: "dark",
      defaultWorkspaceId: workspace.id,
      emailNotificationsEnabled: true
    },
    create: {
      userId: user.id,
      theme: "dark",
      defaultWorkspaceId: workspace.id,
      emailNotificationsEnabled: true
    }
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    update: {
      defaultRiskThreshold: RiskLevel.MEDIUM,
      allowedUploadTypes: ["pdf", "docx", "png", "jpg", "jpeg"],
      maxUploadSizeBytes: 20 * 1024 * 1024,
      aiPreferences
    },
    create: {
      workspaceId: workspace.id,
      defaultRiskThreshold: RiskLevel.MEDIUM,
      allowedUploadTypes: ["pdf", "docx", "png", "jpg", "jpeg"],
      maxUploadSizeBytes: 20 * 1024 * 1024,
      aiPreferences
    }
  });

  const existingDocument = await prisma.document.findFirst({
    where: {
      workspaceId: workspace.id,
      title: "Vendor Data Processing Agreement"
    }
  });

  const document = existingDocument
    ? await prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          createdById: user.id,
          status: DocumentStatus.ANALYZED,
          riskScore: 74,
          summary: documentSummary
        }
      })
    : await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          createdById: user.id,
          title: "Vendor Data Processing Agreement",
          status: DocumentStatus.ANALYZED,
          riskScore: 74,
          summary: documentSummary
        }
      });

  await upsertDocumentFile(document.id, user.id);

  const existingAnalysisJob = await prisma.analysisJob.findFirst({
    where: {
      documentId: document.id,
      provider: "mock"
    }
  });

  const analysisJob = existingAnalysisJob
    ? await prisma.analysisJob.update({
        where: { id: existingAnalysisJob.id },
        data: {
          workspaceId: workspace.id,
          requestedById: user.id,
          status: AnalysisStatus.COMPLETED,
          completedAt,
          metadata: {
            mode: "demo",
            clausesScanned: 216,
            risksDetected: 7,
            confidence: 91,
            processingTimeSeconds: 30
          }
        }
      })
    : await prisma.analysisJob.create({
        data: {
          documentId: document.id,
          workspaceId: workspace.id,
          requestedById: user.id,
          status: AnalysisStatus.COMPLETED,
          provider: "mock",
          startedAt: new Date(completedAt.getTime() - 30_000),
          completedAt,
          metadata: {
            mode: "demo",
            clausesScanned: 216,
            risksDetected: 7,
            confidence: 91,
            processingTimeSeconds: 30
          }
        }
      });

  await prisma.document.update({
    where: { id: document.id },
    data: { currentAnalysisJobId: analysisJob.id }
  });

  const liabilityClause = await upsertClauseFinding(document.id, analysisJob.id, {
    category: ClauseCategory.LIABILITY,
    title: "Liability",
    sourceText: "Vendor liability is not expressly capped for privacy or commercial claims.",
    plainLanguageSummary: "Liability appears uncapped and may expose the business to excessive risk.",
    confidence: 0.92,
    pageNumber: 8
  });

  const dataProcessingClause = await upsertClauseFinding(document.id, analysisJob.id, {
    category: ClauseCategory.PRIVACY,
    title: "Data Processing",
    sourceText: "The agreement describes processing obligations but does not fully define security responsibilities.",
    plainLanguageSummary: "Processing obligations are present but security responsibilities are not fully defined.",
    confidence: 0.89,
    pageNumber: 11
  });

  const terminationClause = await upsertClauseFinding(document.id, analysisJob.id, {
    category: ClauseCategory.TERMINATION,
    title: "Termination",
    sourceText: "Termination triggers, cure periods, and notice requirements require clarification.",
    plainLanguageSummary: "Termination rights are unclear and notice periods should be clarified.",
    confidence: 0.88,
    pageNumber: 14
  });

  const paymentClause = await upsertClauseFinding(document.id, analysisJob.id, {
    category: ClauseCategory.PAYMENT,
    title: "Payment",
    sourceText: "Payment obligations use standard billing language with clear fee payment duties.",
    plainLanguageSummary: "Payment obligations are mostly clear with standard billing language.",
    confidence: 0.9,
    pageNumber: 5
  });

  const uncappedLiabilityRisk = await upsertRiskFinding(document.id, analysisJob.id, {
    clauseFindingId: liabilityClause.id,
    riskLevel: RiskLevel.HIGH,
    title: "Uncapped liability",
    description: "The agreement does not clearly limit aggregate exposure for privacy or commercial claims.",
    evidence: liabilityClause.sourceText,
    impact: "Unexpected financial exposure before the agreement is signed.",
    confidence: 0.91
  });

  const terminationRisk = await upsertRiskFinding(document.id, analysisJob.id, {
    clauseFindingId: terminationClause.id,
    riskLevel: RiskLevel.MEDIUM,
    title: "Ambiguous termination rights",
    description: "Termination triggers and cure periods are not specific enough for operational planning.",
    evidence: terminationClause.sourceText,
    impact: "Operational ambiguity if service quality or compliance changes.",
    confidence: 0.89
  });

  const securityRisk = await upsertRiskFinding(document.id, analysisJob.id, {
    clauseFindingId: dataProcessingClause.id,
    riskLevel: RiskLevel.MEDIUM,
    title: "Missing security obligations",
    description: "Security controls are referenced generally but ownership and minimum safeguards are incomplete.",
    evidence: dataProcessingClause.sourceText,
    impact: "Vendor accountability may be difficult to measure after execution.",
    confidence: 0.86
  });

  const indemnityRisk = await upsertRiskFinding(document.id, analysisJob.id, {
    riskLevel: RiskLevel.MEDIUM,
    title: "Limited indemnity protection",
    description: "Indemnity language does not fully cover regulatory claims or third-party privacy losses.",
    evidence: "Indemnity scope excludes several data protection failure scenarios.",
    impact: "Third-party privacy losses may not be fully recoverable.",
    confidence: 0.84
  });

  await upsertRecommendation(document.id, analysisJob.id, {
    riskFindingId: uncappedLiabilityRisk.id,
    title: "Add liability cap",
    description: "Insert a clear aggregate cap tied to fees or a negotiated monetary ceiling.",
    priority: 1
  });

  await upsertRecommendation(document.id, analysisJob.id, {
    riskFindingId: terminationRisk.id,
    title: "Clarify termination notice period",
    description: "Specify notice windows, cure periods, and termination triggers.",
    priority: 2
  });

  await upsertRecommendation(document.id, analysisJob.id, {
    riskFindingId: securityRisk.id,
    title: "Define security obligations",
    description: "Add minimum safeguards, encryption expectations, audit evidence, and ownership.",
    priority: 3
  });

  await upsertRecommendation(document.id, analysisJob.id, {
    riskFindingId: indemnityRisk.id,
    title: "Add breach notification timeline",
    description: "Require notification within a fixed timeframe after discovery.",
    priority: 4
  });

  const existingChatSession = await prisma.chatSession.findFirst({
    where: {
      documentId: document.id,
      title: "Vendor DPA Review"
    }
  });

  const chatSession = existingChatSession
    ? await prisma.chatSession.update({
        where: { id: existingChatSession.id },
        data: {
          workspaceId: workspace.id,
          createdById: user.id
        }
      })
    : await prisma.chatSession.create({
        data: {
          workspaceId: workspace.id,
          documentId: document.id,
          createdById: user.id,
          title: "Vendor DPA Review"
        }
      });

  await prisma.chatMessage.deleteMany({
    where: { chatSessionId: chatSession.id }
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        chatSessionId: chatSession.id,
        role: ChatRole.USER,
        content: "What should I negotiate first?",
        createdById: user.id
      },
      {
        chatSessionId: chatSession.id,
        role: ChatRole.ASSISTANT,
        content:
          "The first priority should be the uncapped liability clause. The agreement does not clearly limit aggregate exposure for privacy or commercial claims, which could create excessive financial risk.",
        citations: [{ clause: "Liability", riskFinding: "Uncapped liability" }],
        metadata: {
          confidence: 91,
          nextQuestion: "Explain the liability clause simply.",
          recommendedAction: "Negotiate a liability cap tied to fees or an agreed monetary ceiling."
        }
      },
      {
        chatSessionId: chatSession.id,
        role: ChatRole.USER,
        content: "Is the payment section risky?",
        createdById: user.id
      },
      {
        chatSessionId: chatSession.id,
        role: ChatRole.ASSISTANT,
        content:
          "The payment section appears low risk. Payment obligations are mostly clear with standard billing language. However, confirm billing cycles, late fees, and any credit terms before signing.",
        citations: [{ clause: paymentClause.title }],
        metadata: {
          confidence: 88,
          nextQuestion: "What should I ask the vendor to change?"
        }
      }
    ]
  });

  const existingReport = await prisma.report.findFirst({
    where: {
      documentId: document.id,
      title: "Vendor Data Processing Agreement Report"
    }
  });

  const report = existingReport
    ? await prisma.report.update({
        where: { id: existingReport.id },
        data: {
          workspaceId: workspace.id,
          createdById: user.id,
          status: ReportStatus.READY,
          summarySnapshot: documentSummary,
          riskScoreSnapshot: 74,
          content: reportContent
        }
      })
    : await prisma.report.create({
        data: {
          workspaceId: workspace.id,
          documentId: document.id,
          createdById: user.id,
          status: ReportStatus.READY,
          title: "Vendor Data Processing Agreement Report",
          summarySnapshot: documentSummary,
          riskScoreSnapshot: 74,
          content: reportContent
        }
      });

  const existingExportJob = await prisma.exportJob.findFirst({
    where: {
      reportId: report.id,
      format: ExportFormat.PDF
    }
  });

  if (existingExportJob) {
    await prisma.exportJob.update({
      where: { id: existingExportJob.id },
      data: {
        workspaceId: workspace.id,
        requestedById: user.id,
        status: ExportStatus.COMPLETED,
        storageKey: "demo/exports/vendor-dpa-report.pdf",
        completedAt
      }
    });
  } else {
    await prisma.exportJob.create({
      data: {
        reportId: report.id,
        workspaceId: workspace.id,
        requestedById: user.id,
        format: ExportFormat.PDF,
        status: ExportStatus.COMPLETED,
        storageKey: "demo/exports/vendor-dpa-report.pdf",
        startedAt: new Date(completedAt.getTime() - 5_000),
        completedAt
      }
    });
  }

  await prisma.auditLog.deleteMany({
    where: {
      workspaceId: workspace.id,
      action: {
        in: ["DOCUMENT_UPLOADED", "ANALYSIS_COMPLETED", "REPORT_CREATED"]
      },
      entityId: {
        in: [document.id, analysisJob.id, report.id]
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        metadata: {
          title: document.title,
          originalName: "vendor-dpa.pdf"
        }
      },
      {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "ANALYSIS_COMPLETED",
        entityType: "AnalysisJob",
        entityId: analysisJob.id,
        metadata: {
          provider: "mock",
          riskScore: 74
        }
      },
      {
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: "REPORT_CREATED",
        entityType: "Report",
        entityId: report.id,
        metadata: {
          title: report.title,
          status: ReportStatus.READY
        }
      }
    ]
  });

  console.log("Seeded LexAI demo workspace:", {
    user: user.email,
    workspace: workspace.slug,
    document: document.title,
    report: report.title
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
