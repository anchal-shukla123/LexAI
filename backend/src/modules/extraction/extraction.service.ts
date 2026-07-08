import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type { ExtractionStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { Pagination } from "../../utils/response.js";
import type { RequestContext } from "../shared/request-context.js";

type ExtractionSummary = {
  documentId: string;
  status: ExtractionStatus;
  wordCount: number;
  characterCount: number;
  chunkCount: number;
  pageCount: number | null;
  fileName: string;
  mimeType: string;
  errorMessage: string | null;
};

type ExtractedDocumentText = {
  text: string;
  pageCount?: number;
};

type ChunkDraft = {
  chunkIndex: number;
  text: string;
  characterStart: number;
  characterEnd: number;
  wordCount: number;
};

const storageRoot = path.resolve(process.cwd(), "storage", "uploads");
const imageUnsupportedMessage = "OCR extraction for image files is not implemented yet.";
const targetChunkCharacters = 5000;
const maxChunkCharacters = 6000;

function countWords(text: string) {
  const words = text.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPdf(mimeType: string, extension: string) {
  return mimeType === "application/pdf" || extension.toLowerCase() === "pdf";
}

function isDocx(mimeType: string, extension: string) {
  return (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension.toLowerCase() === "docx"
  );
}

function isImage(mimeType: string, extension: string) {
  return mimeType.startsWith("image/") || ["png", "jpg", "jpeg"].includes(extension.toLowerCase());
}

function splitOversizedParagraph(paragraph: string) {
  const parts: string[] = [];
  const words = paragraph.split(/\s+/).filter(Boolean);
  let current = "";

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length > maxChunkCharacters && current.length > 0) {
      parts.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

function splitIntoChunks(text: string): ChunkDraft[] {
  const chunks: string[] = [];
  let current = "";
  const paragraphs = text
    .split(/\n{2,}/)
    .flatMap((paragraph) =>
      paragraph.length > maxChunkCharacters ? splitOversizedParagraph(paragraph) : [paragraph]
    )
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const next = current.length === 0 ? paragraph : `${current}\n\n${paragraph}`;
    if (next.length > targetChunkCharacters && current.length > 0) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  let cursor = 0;
  return chunks.map((chunk, index) => {
    const characterStart = text.indexOf(chunk, cursor);
    const resolvedStart = characterStart >= 0 ? characterStart : cursor;
    const characterEnd = resolvedStart + chunk.length;
    cursor = characterEnd;

    return {
      chunkIndex: index,
      text: chunk,
      characterStart: resolvedStart,
      characterEnd,
      wordCount: countWords(chunk)
    };
  });
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocumentText> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      text: result.text,
      pageCount: result.total
    };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocumentText> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value
  };
}

async function getDocumentWithLatestFile(context: RequestContext, documentId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspaceId: context.workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      files: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          extension: true,
          storageKey: true
        }
      }
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  const latestFile = document.files[0];
  if (!latestFile) {
    throw new AppError("CONFLICT", "Upload a file before extracting document text.");
  }

  return {
    document,
    latestFile
  };
}

async function summarizeExtraction(documentId: string, extractionId: string): Promise<ExtractionSummary> {
  const [extraction, chunkCount] = await Promise.all([
    prisma.documentExtraction.findUniqueOrThrow({
      where: { id: extractionId },
      select: {
        documentId: true,
        status: true,
        wordCount: true,
        characterCount: true,
        pageCount: true,
        fileName: true,
        mimeType: true,
        errorMessage: true
      }
    }),
    prisma.documentTextChunk.count({ where: { documentId } })
  ]);

  return {
    ...extraction,
    chunkCount
  };
}

async function ensureChunksForCompletedExtraction(documentId: string, extractionId: string) {
  const chunkCount = await prisma.documentTextChunk.count({ where: { documentId } });
  if (chunkCount > 0) {
    return;
  }

  const extraction = await prisma.documentExtraction.findUnique({
    where: { id: extractionId },
    select: {
      extractedText: true
    }
  });

  const extractedText = extraction?.extractedText;
  if (!extractedText) {
    return;
  }

  const chunks = splitIntoChunks(extractedText);
  if (chunks.length === 0) {
    return;
  }

  await prisma.documentTextChunk.createMany({
    data: chunks.map((chunk) => ({
      documentId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      characterStart: chunk.characterStart,
      characterEnd: chunk.characterEnd,
      wordCount: chunk.wordCount
    })),
    skipDuplicates: true
  });
}

async function saveUnsupportedExtraction(documentId: string, file: Awaited<ReturnType<typeof getDocumentWithLatestFile>>["latestFile"]) {
  const extraction = await prisma.$transaction(async (tx) => {
    await tx.documentTextChunk.deleteMany({ where: { documentId } });
    return tx.documentExtraction.create({
      data: {
        documentId,
        fileId: file.id,
        status: "UNSUPPORTED",
        mimeType: file.mimeType,
        fileName: file.originalName,
        errorMessage: imageUnsupportedMessage
      },
      select: { id: true }
    });
  });

  return summarizeExtraction(documentId, extraction.id);
}

async function saveFailedExtraction(
  documentId: string,
  file: Awaited<ReturnType<typeof getDocumentWithLatestFile>>["latestFile"],
  message: string
) {
  const extraction = await prisma.documentExtraction.create({
    data: {
      documentId,
      fileId: file.id,
      status: "FAILED",
      mimeType: file.mimeType,
      fileName: file.originalName,
      errorMessage: message
    },
    select: { id: true }
  });

  return summarizeExtraction(documentId, extraction.id);
}

export async function extractDocumentText(context: RequestContext, documentId: string): Promise<ExtractionSummary> {
  const { latestFile } = await getDocumentWithLatestFile(context, documentId);
  const extension = latestFile.extension.toLowerCase();

  if (isImage(latestFile.mimeType, extension)) {
    return saveUnsupportedExtraction(documentId, latestFile);
  }

  if (!isPdf(latestFile.mimeType, extension) && !isDocx(latestFile.mimeType, extension)) {
    return saveFailedExtraction(documentId, latestFile, "Unsupported file type for text extraction.");
  }

  const pendingExtraction = await prisma.documentExtraction.create({
    data: {
      documentId,
      fileId: latestFile.id,
      status: "PENDING",
      mimeType: latestFile.mimeType,
      fileName: latestFile.originalName
    },
    select: { id: true }
  });

  try {
    const filePath = path.resolve(storageRoot, latestFile.storageKey);
    const relativePath = path.relative(storageRoot, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error("Invalid storage key.");
    }

    const buffer = await readFile(filePath);
    const extracted = isPdf(latestFile.mimeType, extension) ? await extractPdf(buffer) : await extractDocx(buffer);
    const normalizedText = normalizeText(extracted.text);

    if (normalizedText.length === 0) {
      throw new Error("No extractable text was found in this document.");
    }

    const chunks = splitIntoChunks(normalizedText);
    await prisma.$transaction(async (tx) => {
      await tx.documentTextChunk.deleteMany({ where: { documentId } });
      if (chunks.length > 0) {
        await tx.documentTextChunk.createMany({
          data: chunks.map((chunk) => ({
            documentId,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            characterStart: chunk.characterStart,
            characterEnd: chunk.characterEnd,
            wordCount: chunk.wordCount
          }))
        });
      }

      await tx.documentExtraction.update({
        where: { id: pendingExtraction.id },
        data: {
          status: "COMPLETED",
          extractedText: normalizedText,
          wordCount: countWords(normalizedText),
          characterCount: normalizedText.length,
          pageCount: extracted.pageCount ?? null
        }
      });
    });

    return summarizeExtraction(documentId, pendingExtraction.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document text extraction failed.";
    await prisma.documentExtraction.update({
      where: { id: pendingExtraction.id },
      data: {
        status: "FAILED",
        errorMessage: message
      }
    });

    return summarizeExtraction(documentId, pendingExtraction.id);
  }
}

export async function ensureDocumentTextExtracted(context: RequestContext, documentId: string) {
  const { latestFile } = await getDocumentWithLatestFile(context, documentId);
  const existingExtraction = await prisma.documentExtraction.findFirst({
    where: {
      documentId,
      fileId: latestFile.id,
      status: "COMPLETED"
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (existingExtraction) {
    await ensureChunksForCompletedExtraction(documentId, existingExtraction.id);
    return summarizeExtraction(documentId, existingExtraction.id);
  }

  return extractDocumentText(context, documentId);
}

export async function getExtractionMetadata(context: RequestContext, documentId: string) {
  await getDocumentWithLatestFile(context, documentId);

  const extraction = await prisma.documentExtraction.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentId: true,
      status: true,
      wordCount: true,
      characterCount: true,
      pageCount: true,
      mimeType: true,
      fileName: true,
      errorMessage: true,
      extractedText: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!extraction) {
    throw new AppError("NOT_FOUND", "Document text extraction has not been run yet.");
  }

  const chunkCount = await prisma.documentTextChunk.count({ where: { documentId } });
  const { extractedText, ...metadata } = extraction;

  return {
    ...metadata,
    chunkCount,
    preview: extractedText?.slice(0, 1000) ?? null
  };
}

export async function getDocumentExtractionSummary(documentId: string) {
  const extraction = await prisma.documentExtraction.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      wordCount: true,
      characterCount: true,
      pageCount: true,
      mimeType: true,
      fileName: true,
      errorMessage: true,
      extractedText: true
    }
  });

  if (!extraction) {
    return null;
  }

  const chunkCount = await prisma.documentTextChunk.count({ where: { documentId } });
  return {
    status: extraction.status,
    wordCount: extraction.wordCount,
    characterCount: extraction.characterCount,
    pageCount: extraction.pageCount,
    chunkCount,
    fileName: extraction.fileName,
    mimeType: extraction.mimeType,
    errorMessage: extraction.errorMessage,
    preview: extraction.extractedText?.slice(0, 1000) ?? null
  };
}

export async function getDocumentTextChunks(
  context: RequestContext,
  documentId: string,
  input: { page: number; limit: number }
) {
  await getDocumentWithLatestFile(context, documentId);

  const where: Prisma.DocumentTextChunkWhereInput = { documentId };
  const [total, chunks] = await Promise.all([
    prisma.documentTextChunk.count({ where }),
    prisma.documentTextChunk.findMany({
      where,
      orderBy: { chunkIndex: "asc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        documentId: true,
        chunkIndex: true,
        text: true,
        characterStart: true,
        characterEnd: true,
        wordCount: true,
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
    chunks,
    pagination
  };
}
