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
    title: string;
    sourceText: string | null;
    plainLanguageSummary: string | null;
    confidence: number | null;
    pageNumber: number | null;
  }>;
  riskFindings: Array<{
    id: string;
    riskLevel: string;
    title: string;
    description: string;
    evidence: string | null;
    impact: string | null;
    confidence: number | null;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: number;
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
    expiresAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
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
