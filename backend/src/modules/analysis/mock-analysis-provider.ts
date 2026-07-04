import type { ClauseCategory, RiskLevel } from "@prisma/client";

export const mockAnalysisSummary =
  "This agreement contains important obligations around data processing, liability, payment, termination, and security. The highest negotiation priority is limiting liability exposure and clarifying security obligations.";

export const mockAnalysisRiskScore = 74;

export type MockClause = {
  category: ClauseCategory;
  title: string;
  sourceText: string;
  plainLanguageSummary: string;
  confidence: number;
};

export type MockRisk = {
  title: string;
  riskLevel: RiskLevel;
  description: string;
  impact: string;
  evidence: string;
  confidence: number;
};

export type MockRecommendation = {
  title: string;
  description: string;
  priority: number;
};

export const mockClauses: MockClause[] = [
  {
    category: "LIABILITY",
    title: "Limitation of Liability",
    sourceText: "The agreement does not clearly cap total liability exposure.",
    plainLanguageSummary: "The agreement does not clearly cap total liability exposure.",
    confidence: 0.91
  },
  {
    category: "PRIVACY",
    title: "Data Processing Obligations",
    sourceText: "The vendor handles customer data and must follow privacy obligations.",
    plainLanguageSummary: "The vendor handles customer data and must follow privacy obligations.",
    confidence: 0.89
  },
  {
    category: "TERMINATION",
    title: "Termination Rights",
    sourceText: "Termination rights exist but notice periods should be clarified.",
    plainLanguageSummary: "Termination rights exist but notice periods should be clarified.",
    confidence: 0.86
  },
  {
    category: "PAYMENT",
    title: "Payment Terms",
    sourceText: "Payment obligations are present and appear lower risk.",
    plainLanguageSummary: "Payment obligations are present and appear lower risk.",
    confidence: 0.84
  }
];

export const mockRisks: MockRisk[] = [
  {
    title: "Uncapped liability",
    riskLevel: "HIGH",
    description: "The agreement may expose the customer to broad liability without a clear cap.",
    impact: "Potential financial exposure beyond expected contract value.",
    evidence: "The limitation of liability language does not define an aggregate cap.",
    confidence: 0.9
  },
  {
    title: "Ambiguous termination rights",
    riskLevel: "MEDIUM",
    description: "Termination language may not clearly define notice periods or transition duties.",
    impact: "Operational uncertainty during vendor exit.",
    evidence: "Termination provisions reference rights without a specific notice period.",
    confidence: 0.84
  },
  {
    title: "Missing security obligations",
    riskLevel: "HIGH",
    description: "Security controls and breach notification requirements are not specific enough.",
    impact: "Increased privacy and compliance exposure.",
    evidence: "Security obligations do not list controls or breach notification timing.",
    confidence: 0.88
  },
  {
    title: "Limited indemnity protection",
    riskLevel: "MEDIUM",
    description: "Indemnity protection may not fully cover third-party claims.",
    impact: "Reduced protection in dispute scenarios.",
    evidence: "Indemnity coverage appears narrower than common third-party claim language.",
    confidence: 0.8
  }
];

export const mockRecommendations: MockRecommendation[] = [
  {
    title: "Add liability cap",
    description: "Add an aggregate liability cap tied to contract value and carve out only agreed exceptions.",
    priority: 1
  },
  {
    title: "Clarify termination notice period",
    description: "Define notice periods, cure periods, and transition assistance obligations.",
    priority: 2
  },
  {
    title: "Define security obligations",
    description: "Specify minimum security controls, audit rights, and compliance requirements.",
    priority: 3
  },
  {
    title: "Add breach notification timeline",
    description: "Require prompt breach notice with a concrete deadline and cooperation obligations.",
    priority: 4
  }
];

export function buildMockReportContent() {
  return {
    summary: mockAnalysisSummary,
    riskScore: mockAnalysisRiskScore,
    clauses: mockClauses,
    risks: mockRisks,
    recommendations: mockRecommendations,
    generatedBy: "mock-analysis-provider",
    legalDisclaimer: "LexAI provides AI-generated document intelligence and does not replace professional legal advice."
  };
}
