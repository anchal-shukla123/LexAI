export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown[];
      };
    };

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
  role?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  workspace: AuthWorkspace;
  currentWorkspaceId?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role?: string;
};

export type UserSummary = {
  id: string;
  email: string;
  name: string | null;
};

export type FileMetadata = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum?: string;
  createdAt: string;
};

export type DocumentListItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  riskScore: number | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  files?: FileMetadata[];
  currentAnalysisJob?: {
    id: string;
    status: string;
    provider: string | null;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    metadata: unknown;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type DocumentDetail = DocumentListItem & {
  workspaceId: string;
  createdById: string | null;
  clauseFindings: Array<{
    id: string;
    category: string;
    extractionMethod?: "RULE_BASED" | "MOCK" | string;
    title: string;
    sourceText: string | null;
    plainLanguageSummary: string | null;
    confidence: number | null;
    pageNumber: number | null;
  }>;
  clauseExtraction?: {
    status: string;
    realClauseCount: number;
    mockClauseCount: number;
    storedClauseCount: number;
    categories: Record<string, number>;
    topClauses: Array<{
      title: string;
      category: string;
      extractionMethod?: "RULE_BASED" | "MOCK" | string;
      isFallbackMock?: boolean;
      confidence: number | null;
      excerpt: string;
    }>;
  };
  riskDetection?: {
    status: string;
    realRiskCount: number;
    mockRiskCount: number;
    storedRiskCount: number;
    riskLevelCounts: Record<string, number>;
    topRisks: Array<{
      title: string;
      category: string | null;
      riskLevel: string;
      detectionMethod?: "RULE_BASED" | "MOCK" | string;
      isFallbackMock?: boolean;
      ruleId: string | null;
      confidence: number | null;
      evidence: string | null;
    }>;
  };
  riskFindings: Array<{
    id: string;
    clauseFindingId?: string | null;
    detectionMethod?: "RULE_BASED" | "MOCK" | string;
    ruleId?: string | null;
    category?: string | null;
    riskLevel: string;
    title: string;
    description: string;
    evidence: string | null;
    impact: string | null;
    recommendationHint?: string | null;
    confidence: number | null;
    clauseFinding?: {
      title: string;
      category: string;
    } | null;
  }>;
  recommendations: Array<{
    id: string;
    riskFindingId?: string | null;
    title: string;
    description: string;
    priority: number;
    riskFinding?: {
      id: string;
      title: string;
      riskLevel: string;
      ruleId: string | null;
      category: string | null;
      detectionMethod?: "RULE_BASED" | "MOCK" | string;
      clauseFinding?: {
        title: string;
        category: string;
      } | null;
    } | null;
  }>;
  reports: Array<Pick<ReportListItem, "id" | "title" | "status" | "summarySnapshot" | "riskScoreSnapshot" | "createdAt" | "updatedAt">>;
  chatSessions: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type ReportListItem = {
  id: string;
  documentId: string;
  title: string;
  status: string;
  summarySnapshot: string | null;
  riskScoreSnapshot: number | null;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    title: string;
    riskScore: number | null;
    status: string;
  };
};

export type ReportDetail = ReportListItem & {
  workspaceId: string;
  createdById: string | null;
  content: unknown;
  document: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    riskScore: number | null;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
  };
  exportJobs: Array<{
    id: string;
    format: string;
    status: string;
    storageKey: string | null;
    fileName?: string | null;
    downloadUrl?: string | null;
    expiresAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type ExportJobDetail = {
  id: string;
  reportId: string;
  workspaceId: string;
  requestedById: string;
  format: "PDF" | "DOCX" | "SECURE_LINK" | string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  storageKey: string | null;
  fileName: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  contextMode?: "auth" | "demo";
  workspace: WorkspaceSummary;
  counts: {
    documents: number;
    analyzedDocuments: number;
    highRiskFindings: number;
  };
  recentDocuments: DocumentListItem[];
  recentReports: ReportListItem[];
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: unknown;
    createdAt: string;
    actorUser: UserSummary | null;
  }>;
  riskStats?: {
    levels: Record<string, number>;
  };
  currentUser: UserSummary;
};

export type ChatSessionDetail = {
  id: string;
  workspaceId: string;
  documentId: string | null;
  createdById: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    riskScore: number | null;
    summary: string | null;
  } | null;
  messages: Array<{
    id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM" | string;
    content: string;
    createdById: string | null;
    citations: unknown;
    metadata: unknown;
    createdAt: string;
  }>;
};

export type ChatSessionListItem = Omit<ChatSessionDetail, "messages"> & {
  messages: ChatSessionDetail["messages"];
};

export type ChatCitation = {
  type: "RISK" | "CLAUSE" | "RECOMMENDATION" | "CHUNK" | "REPORT" | string;
  title: string;
  label: string;
  excerpt: string;
  score?: number;
  metadata?: Record<string, string | number | null>;
};

export type ChatMessageCreateResult = {
  sessionId: string;
  userMessage: ChatSessionDetail["messages"][number];
  assistantMessage: ChatSessionDetail["messages"][number];
};

export type ClauseReviewItem = {
  id: string;
  title: string;
  category: string;
  plainLanguageSummary: string;
  confidence: number;
  extractionMethod: "RULE_BASED" | "MOCK" | string;
  pageNumber: number | null;
  startOffset: number | null;
  excerpt: string;
  evidencePreview: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string | null;
  negotiationStatus: string;
  linkedRisks: Array<{
    id: string;
    title: string;
    category: string | null;
    riskLevel: string;
    description: string;
    evidence: string | null;
    impact: string | null;
    recommendationHint: string | null;
    ruleId: string | null;
    detectionMethod: "RULE_BASED" | "MOCK" | string;
    confidence: number;
  }>;
  linkedRecommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: number;
    riskFindingId: string;
    riskTitle: string;
  }>;
};

export type ClauseReviewResponse = {
  documentId: string;
  total: number;
  filters: Record<string, unknown>;
  categories: Record<string, number>;
  items: ClauseReviewItem[];
};

export type ClauseRewriteGoal = "balanced" | "buyer_friendly" | "seller_friendly" | "shorter" | "stronger_protection";
export type ClauseRewriteStatus = "DRAFT" | "SAVED" | "ACCEPTED" | "REJECTED";

export type ClauseRewriteResponse = {
  id: string | null;
  documentId: string;
  clauseFindingId: string;
  workspaceId: string;
  createdById: string | null;
  goal: ClauseRewriteGoal | string;
  userInstruction: string | null;
  originalClause: {
    id: string;
    title: string;
    category: string;
    text: string;
  };
  rewrittenClause: string;
  rewriteStrategy: string;
  keyChanges: string[];
  negotiationPoints: string[];
  riskReductionNotes: string[];
  status: ClauseRewriteStatus;
  createdAt: string;
  updatedAt: string;
  disclaimer: string;
};

export type ClauseRewriteHistoryResponse = {
  documentId: string;
  clauseId: string;
  rewrites: ClauseRewriteResponse[];
};
