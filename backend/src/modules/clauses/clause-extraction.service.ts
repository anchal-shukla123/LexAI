import type { ClauseCategory, ClauseExtractionMethod, ExtractionStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import { ensureDocumentTextExtracted } from "../extraction/extraction.service.js";
import type { RequestContext } from "../shared/request-context.js";

type ClauseExtractionStatus =
  | "COMPLETED"
  | "FAILED"
  | "NO_CLAUSES_FOUND"
  | "EXTRACTION_UNAVAILABLE"
  | "FALLBACK_MOCK_USED"
  | "NOT_STARTED";

type ExtractionSummaryInput = {
  documentId: string;
  status: ExtractionStatus | "FAILED";
  wordCount: number;
  characterCount: number;
  chunkCount: number;
  pageCount: number | null;
  fileName: string | null;
  mimeType: string | null;
  errorMessage: string | null;
};

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
  extractionMethod: ClauseExtractionMethod;
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

const maxHeadingClauseCount = 18;
const maxFallbackClauseCount = 10;
const maxSourceTextLength = 12_000;
const maxExcerptLength = 320;
const sentenceConnectorPattern =
  /\b(that|which|where|provided|including|without limitation|under this agreement|under this|pursuant to|subject to|whether|regardless|directly|indirectly)\b/i;
const boilerplatePattern =
  /automatically create polished|clone the document|learn more about|provided at all times|fillable and signable|--\s*\d+\s+of\s+\d+\s*--/i;

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
    .replace(/\bGdpr\b/g, "GDPR")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIv\b/g, "IV");
}

function stripHeadingPrefix(line: string) {
  return line
    .replace(/^\s*(section|article|clause)\s+[ivxlcdm\d]+(?:[.):\s-]+)?/i, "")
    .replace(/^\s*[ivxlcdm]+[.):\s-]+/i, "")
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
  if (boilerplatePattern.test(value)) return true;
  return false;
}

function normalizeExtractionText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => !isNoiseLine(line))
    .join("\n");
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
      confidence: 0.35,
      headingHits: 0,
      bodyHits: best.bodyHits
    };
  }

  return {
    category: best.category,
    label: best.label,
    confidence: Math.max(0.48, best.confidence),
    headingHits: best.headingHits,
    bodyHits: best.bodyHits
  };
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function endsLikeContinuation(value: string) {
  return /[,;:]$|\b(and|or|of|to|by|for|from|with|without|including|which|that|where|provided)$/i.test(value.trim());
}

function startsMidSentence(value: string) {
  return /^[a-z,;:)]/.test(value.trim());
}

function headingSignal(line: string) {
  const value = line.trim();
  const stripped = stripHeadingPrefix(value);
  const words = wordCount(stripped);
  const explicitPrefix = /^(section|article|clause)\s+[ivxlcdm\d]+/i.test(value);
  const numbered = /^\d+(?:\.\d+)*[.): -]\s+/.test(value) || /^[ivxlcdm]+[.): -]\s+/i.test(value);
  const letters = stripped.replace(/[^a-z]/gi, "");
  const upperRatio = letters.length > 0 ? stripped.replace(/[^A-Z]/g, "").length / letters.length : 0;
  const allCaps = letters.length >= 4 && upperRatio > 0.75;
  const shortLegal = value.length <= 80 && words <= 10 && categoryKeywords.some((candidate) => countKeywordHits(stripped, candidate.keywords) > 0);

  return {
    explicitPrefix,
    numbered,
    allCaps,
    shortLegal,
    stripped,
    words
  };
}

function isStrongHeading(line: string) {
  const value = line.trim();
  if (isNoiseLine(value) || value.length < 3) return false;
  const signal = headingSignal(value);
  const hasExplicitStructure = signal.explicitPrefix || signal.numbered;
  if (!hasExplicitStructure && value.length > 100) return false;
  if (!hasExplicitStructure && signal.words > 12) return false;
  if (!hasExplicitStructure && /[,;]$|\band$/i.test(value)) return false;
  if (!hasExplicitStructure && sentenceConnectorPattern.test(value)) return false;
  if (!hasExplicitStructure && startsMidSentence(value)) return false;
  if (/signature|in witness whereof|authorized representative/i.test(value)) return false;

  if (hasExplicitStructure) {
    if (signal.words > 12) return false;
    if (sentenceConnectorPattern.test(signal.stripped)) return false;
    if (/[,;]$|\band$/i.test(signal.stripped)) return false;
    return signal.stripped.length > 0 && signal.stripped.length <= 100;
  }

  if (signal.allCaps) {
    return value.length <= 80 && signal.words <= 10;
  }

  return signal.shortLegal;
}

function shouldMergeLines(current: string, next: string) {
  if (!current || !next) return false;
  if (isStrongHeading(current) || isStrongHeading(next)) return false;
  if (/[.!?]$/.test(current.trim())) return false;
  if (startsMidSentence(next)) return true;
  if (endsLikeContinuation(current)) return true;
  if (current.length < 90 && /^[a-z(]/.test(next.trim())) return true;
  return false;
}

function mergeWrappedLines(text: string) {
  const rawLines = normalizeExtractionText(text).split("\n");
  const lines: string[] = [];
  let current = "";

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) {
        lines.push(current);
        current = "";
      }
      continue;
    }

    if (!current) {
      current = line;
      continue;
    }

    if (shouldMergeLines(current, line)) {
      current = `${current} ${line}`;
    } else {
      lines.push(current);
      current = line;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
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

function buildPlainSummary(category: ClauseCategory, _title: string, text: string) {
  const categoryLabel = categoryKeywords.find((candidate) => candidate.category === category)?.label ?? titleCase(category);
  return `${categoryLabel} clause detected from the uploaded document: ${excerpt(text)}`;
}

function dedupeDrafts(drafts: ClauseDraft[], limit: number) {
  const seen = new Set<string>();
  const deduped: ClauseDraft[] = [];

  for (const draft of drafts) {
    const key = `${draft.category}:${normalizeWhitespace(draft.title).toLowerCase()}:${draft.startOffset ?? excerpt(draft.sourceText).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(draft);
  }

  return deduped.sort((left, right) => (left.startOffset ?? 0) - (right.startOffset ?? 0)).slice(0, limit);
}

function paragraphCandidates(lines: string[]) {
  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    if (isStrongHeading(line)) {
      if (current) {
        paragraphs.push(current);
        current = "";
      }
      continue;
    }

    current = current ? `${current} ${line}` : line;
    if (/[.!?]$/.test(line)) {
      paragraphs.push(current);
      current = "";
    }
  }

  if (current) {
    paragraphs.push(current);
  }

  return paragraphs.map(normalizeWhitespace).filter((paragraph) => paragraph.length >= 100 && paragraph.length <= 5000);
}

export function extractClauseDraftsFromText(text: string): ClauseDraft[] {
  const normalizedText = normalizeExtractionText(text);
  const lines = mergeWrappedLines(text);
  const headingIndexes: Array<{ index: number; title: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (isStrongHeading(line)) {
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
      if (sectionText.length < 60) continue;

      const classification = bestCategory(heading.title, sectionText);
      if (classification.category === "OTHER" && classification.confidence < 0.5) continue;
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
    const fallback = paragraphCandidates(lines)
      .map((paragraph) => {
        const classification = bestCategory("", paragraph);
        const totalKeywordHits = categoryKeywords.reduce((total, candidate) => total + countKeywordHits(paragraph, candidate.keywords), 0);
        return {
          paragraph,
          classification,
          score: totalKeywordHits / Math.max(1, wordCount(paragraph) / 80)
        };
      })
      .filter((candidate) => candidate.classification.category !== "OTHER" && candidate.classification.confidence >= 0.6 && candidate.score >= 0.5)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxFallbackClauseCount);

    for (const candidate of fallback) {
      const startOffset = findOffset(normalizedText, candidate.paragraph, cursor);
      const endOffset = startOffset === null ? null : startOffset + candidate.paragraph.length;
      cursor = endOffset ?? cursor;

      drafts.push({
        category: candidate.classification.category,
        title: candidate.classification.label,
        sourceText: candidate.paragraph.slice(0, maxSourceTextLength),
        plainLanguageSummary: buildPlainSummary(candidate.classification.category, candidate.classification.label, candidate.paragraph),
        confidence: candidate.classification.confidence,
        pageNumber: null,
        startOffset,
        endOffset
      });
    }
  }

  return dedupeDrafts(drafts, headingIndexes.length > 0 ? maxHeadingClauseCount : maxFallbackClauseCount);
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
  documentId: string,
  extractionInput?: ExtractionSummaryInput
): Promise<PreparedClauseExtraction> {
  await assertDocumentAccess(context, documentId);
  const extraction = extractionInput ?? (await ensureDocumentTextExtracted(context, documentId));

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

  const chunks = await prisma.documentTextChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    select: {
      text: true
    }
  });

  let text = chunks.map((chunk) => chunk.text).join("\n\n");
  if (normalizeWhitespace(text).length === 0) {
    const latestExtraction = await prisma.documentExtraction.findFirst({
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
    });
    text = latestExtraction?.extractedText ?? "";
  }

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
    extractionMethod: ClauseExtractionMethod;
    deleteMethods?: ClauseExtractionMethod[];
  }
) {
  if (input.deleteMethods) {
    await tx.clauseFinding.deleteMany({
      where: {
        documentId: input.documentId,
        extractionMethod: { in: input.deleteMethods }
      }
    });
  }

  if (input.drafts.length > 0) {
    await tx.clauseFinding.createMany({
      data: input.drafts.map((draft) => ({
        documentId: input.documentId,
        analysisJobId: input.analysisJobId,
        extractionMethod: input.extractionMethod,
        category: draft.category,
        title: draft.title,
        sourceText: draft.sourceText,
        plainLanguageSummary: draft.plainLanguageSummary,
        confidence: draft.confidence,
        pageNumber: draft.pageNumber,
        startOffset: draft.startOffset,
        endOffset: draft.endOffset
      }))
    });
  }

  return tx.clauseFinding.findMany({
    where: {
      documentId: input.documentId,
      analysisJobId: input.analysisJobId,
      extractionMethod: input.extractionMethod
    },
    orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
    select: {
      id: true
    }
  });
}

function serializeClause(clause: {
  id: string;
  title: string;
  category: ClauseCategory;
  extractionMethod: ClauseExtractionMethod;
  confidence: number;
  sourceText: string;
  pageNumber: number | null;
  startOffset: number | null;
}): StoredClause {
  return {
    id: clause.id,
    title: clause.title,
    category: clause.category,
    extractionMethod: clause.extractionMethod,
    confidence: clause.confidence,
    excerpt: excerpt(clause.sourceText),
    pageNumber: clause.pageNumber,
    startOffset: clause.startOffset
  };
}

export async function extractAndStoreClauses(context: RequestContext, documentId: string) {
  const prepared = await prepareClauseExtraction(context, documentId);
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
          realClauseCount: prepared.clauseCount,
          errorMessage: prepared.errorMessage
        }
      },
      select: {
        id: true
      }
    });

    await replaceClauseFindings(tx, {
      documentId,
      analysisJobId: job.id,
      drafts: prepared.drafts,
      extractionMethod: "RULE_BASED",
      deleteMethods: ["RULE_BASED"]
    });

    const clauses = await tx.clauseFinding.findMany({
      where: {
        documentId,
        analysisJobId: job.id,
        extractionMethod: "RULE_BASED"
      },
      orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        category: true,
        extractionMethod: true,
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
    realClauseCount: result.clauses.length,
    mockClauseCount: 0,
    storedClauseCount: result.clauses.length,
    categories: categoriesFor(result.clauses),
    clauses: result.clauses,
    errorMessage: prepared.errorMessage
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
      orderBy: [{ extractionMethod: "asc" }, { startOffset: "asc" }, { pageNumber: "asc" }, { createdAt: "asc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
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

function statusFromMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as Record<string, unknown>).clauseExtractionStatus;
  return typeof status === "string" ? status : null;
}

export async function getClauseExtractionSummary(documentId: string) {
  const [realClauses, mockClauses, groupedReal, recentClauseJobs, realClauseCount, mockClauseCount] = await Promise.all([
    prisma.clauseFinding.findMany({
      where: { documentId, extractionMethod: "RULE_BASED" },
      orderBy: [{ startOffset: "asc" }, { createdAt: "asc" }],
      take: 5,
      select: {
        title: true,
        category: true,
        extractionMethod: true,
        confidence: true,
        sourceText: true
      }
    }),
    prisma.clauseFinding.findMany({
      where: { documentId, extractionMethod: "MOCK" },
      orderBy: [{ createdAt: "asc" }],
      take: 5,
      select: {
        title: true,
        category: true,
        extractionMethod: true,
        confidence: true,
        sourceText: true
      }
    }),
    prisma.clauseFinding.groupBy({
      by: ["category"],
      where: { documentId, extractionMethod: "RULE_BASED" },
      _count: {
        category: true
      }
    }),
    prisma.analysisJob.findMany({
      where: {
        documentId
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        metadata: true
      }
    }),
    prisma.clauseFinding.count({ where: { documentId, extractionMethod: "RULE_BASED" } }),
    prisma.clauseFinding.count({ where: { documentId, extractionMethod: "MOCK" } })
  ]);

  const storedClauseCount = realClauseCount + mockClauseCount;
  const latestStatus = recentClauseJobs.map((job) => statusFromMetadata(job.metadata)).find((status): status is string => Boolean(status));
  const status: ClauseExtractionStatus =
    realClauseCount > 0
      ? "COMPLETED"
      : latestStatus === "FAILED"
        ? "FAILED"
        : mockClauseCount > 0 && (latestStatus === "NO_CLAUSES_FOUND" || latestStatus === "EXTRACTION_UNAVAILABLE")
          ? "FALLBACK_MOCK_USED"
          : latestStatus === "NO_CLAUSES_FOUND"
            ? "NO_CLAUSES_FOUND"
            : latestStatus === "EXTRACTION_UNAVAILABLE"
              ? "EXTRACTION_UNAVAILABLE"
              : "NOT_STARTED";

  const topClauseSource = realClauses.length > 0 ? realClauses : mockClauses;

  return {
    status,
    realClauseCount,
    mockClauseCount,
    storedClauseCount,
    categories: groupedReal.reduce<Record<string, number>>((summary, item) => {
      summary[item.category] = item._count.category;
      return summary;
    }, {}),
    topClauses: topClauseSource.map((clause) => ({
      title: clause.title,
      category: clause.category,
      extractionMethod: clause.extractionMethod,
      isFallbackMock: clause.extractionMethod === "MOCK",
      confidence: clause.confidence,
      excerpt: excerpt(clause.sourceText)
    }))
  };
}
