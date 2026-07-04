import type { RequestHandler } from "express";
import multer from "multer";
import path from "node:path";

import { AppError } from "../../utils/app-error.js";
import { sendSuccess } from "../../utils/response.js";
import { parseOrThrow } from "../shared/validation.js";
import { documentParamsSchema } from "../documents/documents.validation.js";
import { uploadDocumentFileForMvp } from "./uploads.service.js";
import { isAllowedUpload, maxUploadSizeBytes } from "./uploads.validation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadSizeBytes,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!isAllowedUpload(file.mimetype, extension)) {
      callback(new AppError("UPLOAD_REJECTED", "Unsupported file type."));
      return;
    }

    callback(null, true);
  }
}).single("file");

export const uploadSingleFile: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE" ? "File too large." : "Upload rejected.";
      next(new AppError("UPLOAD_REJECTED", message));
      return;
    }

    if (error) {
      next(new AppError("UPLOAD_REJECTED", "Upload rejected."));
      return;
    }

    next();
  });
};

export const uploadDocumentFile: RequestHandler = async (req, res) => {
  const params = parseOrThrow(documentParamsSchema, req.params);
  const result = await uploadDocumentFileForMvp({
    documentId: params.documentId,
    file: req.file
  });
  sendSuccess(res, result, 201);
};
