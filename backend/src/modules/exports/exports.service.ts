import type { ExportFormat, Prisma } from "@prisma/client";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

type ReportContent = {
  executiveSummary?: string;
  summary?: string;
  riskScore?: number;
  riskLevel?: string;
  riskScoreExplanation?: string;
  topRisks?: Array<{
    title?: string;
    severity?: string;
    finding?: string;
    evidence?: string;
    impact?: string;
    action?: string;
    ruleId?: string | null;
    detectionMethod?: string;
    linkedClauseTitle?: string | null;
  }>;
  affectedClauses?: Array<{
    title?: string;
    category?: string;
    summary?: string;
    excerpt?: string;
    extractionMethod?: string;
    linkedRiskTitles?: string[];
  }>;
  recommendedActions?: Array<{
    title?: string;
    description?: string;
    priority?: number;
    linkedRiskTitle?: string | null;
    linkedClauseTitle?: string | null;
  }>;
  recommendedRedlines?: Array<{
    title?: string;
    change?: string;
    why?: string;
    priority?: string;
    linkedRiskTitle?: string | null;
    linkedClauseTitle?: string | null;
  }>;
  negotiationChecklist?: string[];
  legalDisclaimer?: string;
};

const exportRoot = path.resolve(process.cwd(), "storage", "exports");
const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const bodyFontSize = 10;
const lineHeight = 14;

function asContent(value: Prisma.JsonValue): ReportContent {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ReportContent) : {};
}

function normalize(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function safeFileName(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9._ -]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .toLowerCase() || "lexai-report";
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars: number) {
  const words = normalize(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function riskScoreLine(score: number | null | undefined, level: string | undefined) {
  if (typeof score !== "number") return "Risk score: Not available";
  return `Risk score: ${score}/100${level ? ` (${level} risk)` : ""}`;
}

function contentLines(report: {
  title: string;
  summarySnapshot: string | null;
  riskScoreSnapshot: number | null;
  createdAt: Date;
  document: {
    title: string;
    description: string | null;
    status: string;
    riskScore: number | null;
    summary: string | null;
  };
  content: Prisma.JsonValue;
}) {
  const content = asContent(report.content);
  const topRisks = content.topRisks ?? [];
  const affectedClauses = content.affectedClauses ?? [];
  const actions = content.recommendedActions ?? content.recommendedRedlines?.map((item, index) => ({
    title: item.title,
    description: item.change,
    priority: index + 1,
    linkedRiskTitle: item.linkedRiskTitle,
    linkedClauseTitle: item.linkedClauseTitle
  })) ?? [];
  const checklist = content.negotiationChecklist ?? [];
  const lines: Array<{ text: string; kind?: "title" | "heading" | "subheading" | "body" | "muted" }> = [];

  lines.push({ text: "LexAI / ApexGroup", kind: "muted" });
  lines.push({ text: report.title, kind: "title" });
  lines.push({ text: `Document: ${report.document.title}`, kind: "body" });
  lines.push({ text: `Generated: ${report.createdAt.toISOString().slice(0, 10)}`, kind: "body" });
  lines.push({ text: riskScoreLine(content.riskScore ?? report.riskScoreSnapshot ?? report.document.riskScore, content.riskLevel), kind: "subheading" });
  lines.push({ text: "", kind: "body" });

  lines.push({ text: "Executive Summary", kind: "heading" });
  lines.push({ text: content.executiveSummary ?? content.summary ?? report.summarySnapshot ?? report.document.summary ?? "No summary is available for this report.", kind: "body" });

  lines.push({ text: "Risk Score Explanation", kind: "heading" });
  lines.push({ text: content.riskScoreExplanation ?? "The score is based on stored LexAI findings for this report.", kind: "body" });

  lines.push({ text: "Top Risks", kind: "heading" });
  if (topRisks.length > 0) {
    topRisks.slice(0, 8).forEach((risk, index) => {
      lines.push({ text: `${index + 1}. ${risk.title ?? "Risk"}${risk.severity ? ` - ${risk.severity}` : ""}${risk.ruleId ? ` (${risk.ruleId})` : ""}`, kind: "subheading" });
      lines.push({ text: risk.finding ?? risk.impact ?? risk.evidence ?? "No risk detail is available.", kind: "body" });
      if (risk.action) lines.push({ text: `Action: ${risk.action}`, kind: "body" });
      if (risk.linkedClauseTitle) lines.push({ text: `Linked clause: ${risk.linkedClauseTitle}`, kind: "muted" });
    });
  } else {
    lines.push({ text: "No top risks were stored in this report.", kind: "body" });
  }

  lines.push({ text: "Affected Clauses", kind: "heading" });
  if (affectedClauses.length > 0) {
    affectedClauses.slice(0, 10).forEach((clause, index) => {
      lines.push({ text: `${index + 1}. ${clause.title ?? "Clause"}${clause.category ? ` - ${clause.category}` : ""}`, kind: "subheading" });
      lines.push({ text: clause.summary ?? clause.excerpt ?? "No clause summary is available.", kind: "body" });
      if (clause.linkedRiskTitles?.length) lines.push({ text: `Linked risks: ${clause.linkedRiskTitles.join(", ")}`, kind: "muted" });
    });
  } else {
    lines.push({ text: "No affected clauses were stored in this report.", kind: "body" });
  }

  lines.push({ text: "Recommended Actions", kind: "heading" });
  if (actions.length > 0) {
    actions.slice(0, 10).forEach((action, index) => {
      lines.push({ text: `${index + 1}. ${action.title ?? "Recommended action"}`, kind: "subheading" });
      lines.push({ text: action.description ?? "No recommendation detail is available.", kind: "body" });
      if (action.linkedRiskTitle || action.linkedClauseTitle) {
        lines.push({ text: [action.linkedRiskTitle ? `Risk: ${action.linkedRiskTitle}` : "", action.linkedClauseTitle ? `Clause: ${action.linkedClauseTitle}` : ""].filter(Boolean).join(" | "), kind: "muted" });
      }
    });
  } else {
    lines.push({ text: "No recommendations were stored in this report.", kind: "body" });
  }

  lines.push({ text: "Negotiation Checklist", kind: "heading" });
  if (checklist.length > 0) {
    checklist.slice(0, 12).forEach((item) => lines.push({ text: `- ${item}`, kind: "body" }));
  } else {
    lines.push({ text: "No negotiation checklist was stored in this report.", kind: "body" });
  }

  lines.push({ text: "Legal Review Disclaimer", kind: "heading" });
  lines.push({ text: content.legalDisclaimer ?? "LexAI review output does not replace professional legal advice.", kind: "body" });

  return lines;
}

function lineStyle(kind: string | undefined) {
  if (kind === "title") return { size: 20, leading: 26 };
  if (kind === "heading") return { size: 15, leading: 22 };
  if (kind === "subheading") return { size: 11, leading: 16 };
  if (kind === "muted") return { size: 9, leading: 13 };
  return { size: bodyFontSize, leading: lineHeight };
}

function paginate(lines: ReturnType<typeof contentLines>) {
  const pages: string[][] = [[]];
  let y = pageHeight - margin;

  function addLine(line: string, leading: number) {
    if (y < margin + leading) {
      pages.push([]);
      y = pageHeight - margin;
    }
    pages[pages.length - 1]?.push(line);
    y -= leading;
  }

  for (const item of lines) {
    const style = lineStyle(item.kind);
    const maxChars = item.kind === "title" ? 46 : item.kind === "heading" ? 58 : 88;
    const wrapped = item.text ? wrapText(item.text, maxChars) : [""];

    if (item.kind === "heading") addLine(JSON.stringify({ text: "", kind: item.kind, size: style.size }), style.leading / 2);
    for (const line of wrapped) {
      addLine(JSON.stringify({ text: line, kind: item.kind, size: style.size }), style.leading);
    }
  }

  return pages;
}

function pageStream(encodedLines: string[], pageNumber: number) {
  let y = pageHeight - margin;
  const stream: string[] = ["BT"];

  for (const encoded of encodedLines) {
    const item = JSON.parse(encoded) as { text: string; kind?: string; size: number };
    const style = lineStyle(item.kind);
    if (!item.text) {
      y -= style.leading / 2;
      continue;
    }
    const x = item.kind === "title" || item.kind === "heading" ? margin : margin + 8;
    stream.push(`/F1 ${item.size} Tf`);
    stream.push(`${x} ${y} Td (${escapePdfText(item.text)}) Tj`);
    stream.push(`${-x} ${-y} Td`);
    y -= style.leading;
  }

  stream.push(`/F1 8 Tf`);
  stream.push(`${margin} 28 Td (${escapePdfText(`LexAI report - Page ${pageNumber}`)}) Tj`);
  stream.push("ET");
  return stream.join("\n");
}

function buildPdfBuffer(pages: string[][]) {
  const objects: string[] = [];
  const add = (value: string) => {
    objects.push(value);
    return objects.length;
  };

  const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  void catalogId;
  void fontId;

  const pageIds: number[] = [];
  const contentIds: number[] = [];
  pages.forEach((page, index) => {
    const stream = pageStream(page, index + 1);
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    contentIds.push(contentId);
    pageIds.push(pageId);
  });
  void contentIds;

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

async function writePdfExport(report: Awaited<ReturnType<typeof loadReportForExport>>, exportJobId: string) {
  const fileName = `${safeFileName(report.document.title)}-${exportJobId}.pdf`;
  const relativePath = path.join("exports", report.workspaceId, fileName);
  const absolutePath = path.join(exportRoot, report.workspaceId, fileName);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const pages = paginate(contentLines(report));
  await fs.writeFile(absolutePath, buildPdfBuffer(pages));
  return {
    fileName,
    storageKey: relativePath,
    absolutePath
  };
}

async function loadReportForExport(context: RequestContext, reportId: string) {
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      workspaceId: context.workspace.id
    },
    select: {
      id: true,
      workspaceId: true,
      documentId: true,
      title: true,
      summarySnapshot: true,
      riskScoreSnapshot: true,
      content: true,
      createdAt: true,
      document: {
        select: {
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true
        }
      }
    }
  });

  if (!report) {
    throw new AppError("NOT_FOUND", "Report not found.");
  }

  return report;
}

function serializeExportJob(job: {
  id: string;
  reportId: string;
  workspaceId: string;
  requestedById: string;
  format: ExportFormat;
  status: string;
  storageKey: string | null;
  expiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...job,
    fileName: job.storageKey ? path.basename(job.storageKey) : null,
    downloadUrl: job.status === "COMPLETED" ? `/api/v1/exports/${job.id}/download` : null
  };
}

export async function createReportExport(context: RequestContext, reportId: string, format: ExportFormat) {
  if (format !== "PDF") {
    throw new AppError("BAD_REQUEST", "DOCX export is not available in this phase. Please export PDF.");
  }

  const report = await loadReportForExport(context, reportId);
  const exportJob = await prisma.exportJob.create({
    data: {
      reportId,
      workspaceId: context.workspace.id,
      requestedById: context.user.id,
      format,
      status: "PROCESSING",
      startedAt: new Date()
    }
  });

  try {
    const file = await writePdfExport(report, exportJob.id);
    const completed = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "COMPLETED",
        storageKey: file.storageKey,
        completedAt: new Date()
      }
    });
    return serializeExportJob(completed);
  } catch (error) {
    const failed = await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Export generation failed."
      }
    });
    return serializeExportJob(failed);
  }
}

export async function getExportJob(context: RequestContext, exportJobId: string) {
  const job = await prisma.exportJob.findFirst({
    where: {
      id: exportJobId,
      workspaceId: context.workspace.id
    }
  });

  if (!job) {
    throw new AppError("NOT_FOUND", "Export job not found.");
  }

  return serializeExportJob(job);
}

export async function getExportDownload(context: RequestContext, exportJobId: string) {
  const job = await prisma.exportJob.findFirst({
    where: {
      id: exportJobId,
      workspaceId: context.workspace.id
    },
    include: {
      report: {
        select: {
          title: true
        }
      }
    }
  });

  if (!job) {
    throw new AppError("NOT_FOUND", "Export job not found.");
  }

  if (job.status !== "COMPLETED" || !job.storageKey) {
    throw new AppError("CONFLICT", "Export is not ready for download.");
  }

  const absolutePath = path.resolve(process.cwd(), "storage", job.storageKey);
  if (!absolutePath.startsWith(path.resolve(process.cwd(), "storage"))) {
    throw new AppError("FORBIDDEN", "Invalid export storage path.");
  }

  await fs.access(absolutePath).catch(() => {
    throw new AppError("NOT_FOUND", "Export file is missing.");
  });

  return {
    absolutePath,
    fileName: path.basename(job.storageKey),
    contentType: job.format === "PDF" ? "application/pdf" : "application/octet-stream"
  };
}
