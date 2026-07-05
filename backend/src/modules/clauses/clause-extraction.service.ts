import type { ClauseCategory, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import { ensureDocumentTextExtracted } from "../extraction/extraction.service.js";
import type { RequestContext } from "../shared/request-context.js";

type ClauseExtractionStatus = "COMPLETED" | "FAILED" | "NO_CLAUSES_FOUND" | "EXTRACTION_UNAVAILABLE";

type ClauseDraft = {
  category: ClauseCategory;
  title: string;
  sourceText: string;
  plainLanguageSummary: string;
  confidence: number;
  pageNumber: number | null;
  startOffset: number | null;
  endOffset: number | null;
};

type StoredClause = {
  id: string;
  title: string;
  category: ClauseCategory;
  confidence: number;
  excerpt: string;
  pageNumber: number | null;
  startOffset: number | null;
};

type PreparedClauseExtraction = {
  documentId: string;
  status: ClauseExtractionStatus;
  clauseCount: number;
  categories: Record<string, number>;
  drafts: ClauseDraft[];
  errorMessage?: string;
};

const transactionOptions = {
  maxWait: 10_000,
  timeout: 30_000
};

const maxClauseCount = 30;
const maxSourceTextLength = 12_000;
const maxExcerptLength = 320;

const categoryKeywords: Array<{
  category: ClauseCategory;
  label: string;
  keywords: string[];
}> = [
  {
    category: "CONFIDENTIALITY",
    label: "Confidentiality",
    keywords: ["confidential", "non-disclosure", "nondisclosure", "proprietary information", "trade secret"]
  },
  {
    category: "TERMINATION",
    label: "Termination",
    keywords: ["termination", "terminate", "expiration", "expiry", "breach", "notice period"]
  },
  {
    category: "PAYMENT",
    label: "Payment",
    keywords: ["payment", "fees", "invoice", "billing", "charges", "taxes", "late fees", "compensation"]
  },
  {
    category: "LIABILITY",
    label: "Liability",
    keywords: ["liability", "limitation", "damages", "consequential", "indirect damages", "aggregate liability"]
  },
  {
    category: "INDEMNITY",
    label: "Indemnity",
    keywords: ["indemnify", "indemnification", "hold harmless", "defense", "defend"]
  },
  {
    category: "GOVERNING_LAW",
    label: "Governing Law",
    keywords: ["governing law", "jurisdiction", "laws of", "courts of", "venue"]
  },
  {
    category: "DISPUTE_RESOLUTION",
    label: "Dispute Resolution",
    keywords: ["arbitration", "dispute", "mediation", "litigation", "controversy"]
  },
  {
    category: "RENEWAL",
    label: "Renewal",
    keywords: ["renewal", "auto-renew", "auto renew", "extension", "term renews", "successive term"]
  },
  {
    category: "NOTICE",
    label: "Notice",
    keywords: ["notice", "written notice", "delivery", "address for notice", "notices"]
  },
  {
    category: "INTELLECTUAL_PROPERTY",
    label: "Intellectual Property",
    keywords: ["intellectual property", "ownership", "license", "copyright", "trademark", "patent"]
  },
  {
    category: "DATA_PROTECTION",
    label: "Data Protection",
    keywords: ["data protection", "personal data", "processing", "gdpr", "data subject", "processor"]
  },
  {
    category: "PRIVACY",
    label: "Privacy",
    keywords: ["privacy", "personally identifiable", "personal information", "privacy policy"]
  },
  {
    category: "SECURITY",
    label: "Security",
    keywords: ["security controls", "safeguards", "breach notification", "access control", "information security"]
  },
  {
    category: "WARRANTY",
    label: "Warranties",
    keywords: ["warranty", "warranties", "representations", "as is", "merchantability", "fitness for a particular purpose"]
  },
  {
    category: "ASSIGNMENT",
    label: "Assignment",
    keywords: ["assignment", "assign", "transfer", "successors", "delegation"]
  },
  {
    category: "FORCE_MAJEURE",
    label: "Force Majeure",
    keywords: ["force majeure", "beyond reasonable control", "acts of god", "natural disaster"]
  },
  {
    category: "AUDIT_RIGHTS",
    label: "Audit Rights",
    keywords: ["audit", "inspection", "records", "books and records", "audit rights"]
  },
  {
    category: "SERVICE_LEVEL",
    label: "Service Levels",
    keywords: ["service level", "sla", "uptime", "availability", "service credits"]
  },
  {
    category: "INSURANCE",
    label: "Insurance",
    keywords: ["insurance", "insured", "coverage", "policy limits", "certificate of insurance"]
  },
  {
    category: "NON_COMPETE",
    label: "Non-Compete / Non-Solicit",
    keywords: ["non-compete", "non compete", "non-solicit", "non solicit", "solicitation", "restrictive covenant"]
  },
  {
    category: "MISCELLANEOUS",
    label: "Miscellaneous",
    keywords: ["miscellaneous", "entire agreement", "severability", "waiver", "counterparts"]
  }
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > maxExcerptLength ? `${normalized.slice(0, maxExcerptLength - 1)}...` : normalized;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bIp\b/g, "IP")
    .replace(/\bGdpr\b/g, "GDPR");
}

function stripHeadingPrefix(line: string) {
  return line
    .replace(/^\s*(section|article|clause)\s+[ivxlcdm\d]+(?:[.):\s-]+)?/i, "")
    .replace(/^\s*\d+(?:\.\d+)*[.):\s-]+/, "")
    .trim();
}

function isNoiseLine(line: string) {
  const value = line.trim();
  if (value.length === 0) return true;
  if (/^\d{1,4}$/.test(value)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(value)) return true;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) return true;
  if (/^[-_=*]{3,}$/.test(value)) return true;
  return false;
}

function countKeywordHits(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.reduce((count, keyword) => (normalized.includes(keyword) ? count + 1 : count), 0);
}

function bestCategory(heading: string, body: string) {
  let best = {
    category: "OTHER" as ClauseCategory,
    label: "Other",
    headingHits: 0,
    bodyHits: 0,
    confidence: 0.34
  };

  for (const candidate of categoryKeywords) {
    const headingHits = countKeywordHits(heading, candidate.keywords);
    const bodyHits = countKeywordHits(body, candidate.keywords);
    const score = headingHits * 3 + Math.min(bodyHits, 4);
    const bestScore = best.headingHits * 3 + Math.min(best.bodyHits, 4);

    if (score > bestScore) {
      const confidence = Math.min(0.96, 0.42 + headingHits * 0.22 + bodyHits * 0.09);
      best = {
        category: candidate.category,
        label: candidate.label,
        headingHits,
        bodyHits,
        confidence
      };
    }
  }

  if (best.headingHits === 0 && best.bodyHits < 2) {
    return {
      category: "OTHER" as ClauseCategory,
      label: "Other",
      confidence: 0.35
    };
  }

  return {
    category: best.category,
    label: best.label,
    confidence: Math.max(0.48, best.confidence)
  };
}

function looksLikeHeading(line: string, nextLine?: string) {
  const value = line.trim();
  if (isNoiseLine(value) || value.length > 120 || value.length < 3) return false;
  if (/signature|in witness whereof|authorized representative/i.test(value)) return false;

  const stripped = stripHeadingPrefix(value);
  const hasNumbering = /^(section|article|clause)\s+[ivxlcdm\d]+/i.test(value) || /^\d+(?:\.\d+)*[.):\s-]+/.test(value);
  const hasLegalKeyword = categoryKeywords.some((candidate) => countKeywordHits(value, candidate.keywords) > 0);
  const letters = stripped.replace(/[^a-z]/gi, "");
  const upperRatio = letters.length > 0 ? stripped.replace(/[^A-Z]/g, "").length / letters.length : 0;
  const isUpper = letters.length >= 4 && upperRatio > 0.75;
  const isTitle = /^[A-Z][A-Za-z0-9,&'()/\-\s]+$/.test(stripped) && stripped.split(/\s+/).length <= 9;
  const followedByText = Boolean(nextLine && !isNoiseLine(nextLine) && nextLine.trim().length > 20);

  return (hasLegalKeyword && (hasNumbering || isUpper || isTitle || followedByText)) || (hasNumbering && (hasLegalKeyword || followedByText));
}

function findOffset(text: string, needle: string, cursor: number) {
  const exact = text.indexOf(needle, cursor);
  if (exact >= 0) return exact;
  const normalizedNeedle = normalizeWhitespace(needle).slice(0, 120);
  if (normalizedNeedle.length === 0) return null;
  const normalizedText = normalizeWhitespace(text);
  const normalizedIndex = normalizedText.indexOf(normalizedNeedle);
  return normalizedIndex >= 0 ? normalizedIndex : null;
}

function buildPlainSummary(category: ClauseCategory, title: string, text: string) {
  const categoryLabel = categoryKeywords.find((candidate) => candidate.category === category)?.label ?? titleCase(category);
  return `${categoryLabel} clause detected from the uploaded document: ${excerpt(text)}`;
}

function dedupeDrafts(drafts: ClauseDraft[]) {
  const seen = new Set<string>();
  const deduped: ClauseDraft[] = [];

  for (const draft of drafts) {
    const key = `${draft.category}:${normalizeWhitespace(draft.title).toLowerCase()}:${draft.startOffset ?? excerpt(draft.sourceText).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(draft);
  }

  return deduped.sort((left, right) => (left.startOffset ?? 0) - (right.startOffset ?? 0)).slice(0, maxClauseCount);
}

export function extractClauseDraftsFromText(text: string): ClauseDraft[] {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText.split("\n");
  const headingIndexes: Array<{ index: number; title: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const nextLine = lines[index + 1]?.trim();
    if (looksLikeHeading(line, nextLine)) {
      headingIndexes.push({ index, title: stripHeadingPrefix(line) || line });
    }
  }

  const drafts: ClauseDraft[] = [];
  let cursor = 0;

  if (headingIndexes.length > 0) {
    for (let index = 0; index < headingIndexes.length; index += 1) {
      const heading = headingIndexes[index];
      const nextHeading = headingIndexes[index + 1];
      if (!heading) continue;
      const sectionLines = lines.slice(heading.index, nextHeading?.index);
      const sectionText = normalizeWhitespace(sectionLines.join("\n"));
      if (sectionText.length < 40) continue;

      const classification = bestCategory(heading.title, sectionText);
      const startOffset = findOffset(normalizedText, sectionLines.join("\n").trim(), cursor);
      const endOffset = startOffset === null ? null : startOffset + sectionText.length;
      cursor = endOffset ?? cursor;

      drafts.push({
        category: classification.category,
        title: heading.title.length > 0 ? titleCase(heading.title) : classification.label,
        sourceText: sectionText.slice(0, maxSourceTextLength),
        plainLanguageSummary: buildPlainSummary(classification.category, heading.title, sectionText),
        confidence: classification.confidence,
        pageNumber: null,
        startOffset,
        endOffset
      });
    }
  }

  if (drafts.length === 0) {
    const paragraphs = normalizedText
      .split(/\n{2,}/)
      .map((paragraph) => normalizeWhitespace(paragraph))
      .filter((paragraph) => paragraph.length >= 80 && paragraph.length <= 6000);

    for (const paragraph of paragraphs) {
      const classification = bestCategory("", paragraph);
      if (classification.category === "OTHER" && classification.confidence < 0.48) continue;
      const startOffset = findOffset(normalizedText, paragraph, cursor);
      const endOffset = startOffset === null ? null : startOffset + paragraph.length;
      cursor = endOffset ?? cursor;

      drafts.push({
        category: classification.category,
        title: classification.label,
        sourceText: paragraph.slice(0, maxSourceTextLength),
        plainLanguageSummary: buildPlainSummary(classification.category, classification.label, paragraph),
        confidence: classification.confidence,
        pageNumber: null,
        startOffset,
        endOffset
      });
    }
  }

  return dedupeDrafts(drafts);
}

function categoriesFor(drafts: Array<{ category: ClauseCategory }>) {
  return drafts.reduce<Record<string, number>>((summary, draft) => {
    summary[draft.category] = (summary[draft.category] ?? 0) + 1;
    return summary;
  }, {});
}

async function assertDocumentAccess(context: RequestContext, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: context.workspace.id,
      deletedAt: null
    },
    select: {
      id: true
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }
}

export async function prepareClauseExtraction(
  context: RequestContext,
  documentId: string
): Promise<PreparedClauseExtraction> {
  await assertDocumentAccess(context, documentId);
  const extraction = await ensureDocumentTextExtracted(context, documentId);

  if (extraction.status !== "COMPLETED") {
    return {
      documentId,
      status: "EXTRACTION_UNAVAILABLE",
      clauseCount: 0,
      categories: {},
      drafts: [],
      errorMessage: extraction.errorMessage ?? "Document text extraction is not completed."
    };
  }

  const [latestExtraction, chunks] = await Promise.all([
    prisma.documentExtraction.findFirst({
      where: {
        documentId,
        status: "COMPLETED",
        extractedText: {
          not: null
        }
      },
      orderBy: { createdAt: "desc" },
      select: {
        extractedText: true
      }
    }),
    prisma.documentTextChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      select: {
        text: true
      }
    })
  ]);

  const text = latestExtraction?.extractedText ?? chunks.map((chunk) => chunk.text).join("\n\n");
  if (normalizeWhitespace(text).length === 0) {
    return {
      documentId,
      status: "EXTRACTION_UNAVAILABLE",
      clauseCount: 0,
      categories: {},
      drafts: [],
      errorMessage: "Extracted document text is empty."
    };
  }

  const drafts = extractClauseDraftsFromText(text);
  return {
    documentId,
    status: drafts.length > 0 ? "COMPLETED" : "NO_CLAUSES_FOUND",
    clauseCount: drafts.length,
    categories: categoriesFor(drafts),
    drafts
  };
}

export async function replaceClauseFindings(
  tx: Prisma.TransactionClient,
  input: {
    documentId: string;
    analysisJobId: string;
    drafts: ClauseDraft[];
  }
) {
  await tx.clauseFinding.deleteMany({
    where: {
      documentId: input.documentId
    }
  });

  const created: Array<{ id: string }> = [];
  for (const draft of input.drafts) {
    created.push(
      await tx.clauseFinding.create({
        data: {
          documentId: input.documentId,
          analysisJobId: input.analysisJobId,
          category: draft.category,
          title: draft.title,
          sourceText: draft.sourceText,
          plainLanguageSummary: draft.plainLanguageSummary,
          confidence: draft.confidence,
          pageNumber: draft.pageNumber,
          startOffset: draft.startOffset,
          endOffset: draft.endOffset
        },
        select: {
          id: true
        }
      })
    );
  }

  return created;
}

function serializeClause(clause: {
  id: string;
  title: string;
  category: ClauseCategory;
  confidence: number;
  sourceText: string;
  pageNumber: number | null;
  startOffset: number | null;
}): StoredClause {
  return {
    id: clause.id,
    title: clause.title,
    category: clause.category,
    confidence: clause.confidence,
    excerpt: excerpt(clause.sourceText),
    pageNumber: clause.pageNumber,
    startOffset: clause.startOffset
  };
}

export async function extractAndStoreClauses(context: RequestContext, documentId: string) {
  const prepared = await prepareClauseExtraction(context, documentId);
  if (prepared.status !== "COMPLETED") {
    return {
      documentId,
      status: prepared.status,
      clauseCount: 0,
      categories: {},
      clauses: [] as StoredClause[],
      errorMessage: prepared.errorMessage
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.analysisJob.create({
      data: {
        documentId,
        workspaceId: context.workspace.id,
        requestedById: context.user.id,
        status: "COMPLETED",
        provider: "rule-based-clause-extraction",
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: {
          clauseExtractionStatus: prepared.status,
          clauseCount: prepared.clauseCount
        }
      },
      select: {
        id: true
      }
    });

    await replaceClauseFindings(tx, {
      documentId,
      analysisJobId: job.id,
      drafts: prepared.drafts
    });

    const clauses = await tx.clauseFinding.findMany({
      where: {
        documentId,
        analysisJobId: job.id
      },
      orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        category: true,
        confidence: true,
        sourceText: true,
        pageNumber: true,
        startOffset: true
      }
    });

    return {
      clauses: clauses.map(serializeClause)
    };
  }, transactionOptions);

  return {
    documentId,
    status: prepared.status,
    clauseCount: result.clauses.length,
    categories: categoriesFor(result.clauses),
    clauses: result.clauses
  };
}

export async function listClauseFindings(
  context: RequestContext,
  documentId: string,
  input: { page: number; limit: number }
) {
  await assertDocumentAccess(context, documentId);
  const where: Prisma.ClauseFindingWhereInput = { documentId };
  const [total, clauses] = await Promise.all([
    prisma.clauseFinding.count({ where }),
    prisma.clauseFinding.findMany({
      where,
      orderBy: [{ startOffset: "asc" }, { pageNumber: "asc" }, { createdAt: "asc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
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
    })
  ]);

  const pagination: Pagination = {
    page: input.page,
    limit: input.limit,
    total,
    hasNext: input.page * input.limit < total
  };

  return {
    clauses,
    pagination
  };
}

export async function getClauseExtractionSummary(documentId: string) {
  const clauses = await prisma.clauseFinding.findMany({
    where: { documentId },
    orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
    take: 5,
    select: {
      title: true,
      category: true,
      confidence: true,
      sourceText: true
    }
  });
  const grouped = await prisma.clauseFinding.groupBy({
    by: ["category"],
    where: { documentId },
    _count: {
      category: true
    }
  });
  const clauseCount = grouped.reduce((total, item) => total + item._count.category, 0);

  return {
    status: clauseCount > 0 ? "COMPLETED" : "NO_CLAUSES_FOUND",
    clauseCount,
    categories: grouped.reduce<Record<string, number>>((summary, item) => {
      summary[item.category] = item._count.category;
      return summary;
    }, {}),
    topClauses: clauses.map((clause) => ({
      title: clause.title,
      category: clause.category,
      confidence: clause.confidence,
      excerpt: excerpt(clause.sourceText)
    }))
  };
}
