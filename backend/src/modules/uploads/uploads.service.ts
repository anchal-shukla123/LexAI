import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Buffer } from "node:buffer";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { getDemoContext } from "../demo/demo-context.js";
import { isAllowedUpload } from "./uploads.validation.js";

type UploadDocumentFileInput = {
  documentId: string;
  file:
    | {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      }
    | undefined;
};

const storageRoot = path.resolve(process.cwd(), "storage", "uploads");

function extensionFor(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function safeFileName(extension: string) {
  return `${Date.now()}-${randomUUID()}${extension}`;
}

export async function uploadDocumentFileForMvp(input: UploadDocumentFileInput) {
  if (!input.file) {
    throw new AppError("UPLOAD_REJECTED", "A file is required.");
  }

  const { user, workspace } = await getDemoContext();
  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      workspaceId: workspace.id,
      deletedAt: null
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!document) {
    throw new AppError("NOT_FOUND", "Document not found.");
  }

  const extension = extensionFor(input.file.originalname);
  if (!isAllowedUpload(input.file.mimetype, extension)) {
    throw new AppError("UPLOAD_REJECTED", "Unsupported file type.");
  }

  const fileName = safeFileName(extension);
  const relativeStorageKey = path.posix.join(workspace.id, input.documentId, fileName);
  const uploadDirectory = path.join(storageRoot, workspace.id, input.documentId);
  const targetPath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(targetPath, input.file.buffer);

  const documentFile = await prisma.documentFile.create({
    data: {
      documentId: input.documentId,
      fileName,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      extension: extension.replace(".", ""),
      sizeBytes: input.file.size,
      storageKey: relativeStorageKey,
      uploadedById: user.id
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: input.documentId,
      metadata: {
        documentFileId: documentFile.id,
        originalName: documentFile.originalName,
        sizeBytes: documentFile.sizeBytes
      }
    }
  });

  return {
    file: documentFile,
    document: {
      id: document.id,
      status: document.status
    }
  };
}
