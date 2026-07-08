import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { createReportExport, getExportDownload, getExportJob } from "./exports.service.js";
import { createReportExportSchema, exportJobParamsSchema } from "./exports.validation.js";
import { reportParamsSchema } from "../reports/reports.validation.js";

export const postReportExport: RequestHandler = async (req, res) => {
  const params = parseOrThrow(reportParamsSchema, req.params);
  const body = parseOrThrow(createReportExportSchema, req.body ?? {});
  const context = await getRequestContext(req);
  const exportJob = await createReportExport(context, params.reportId, body.format ?? "PDF");
  sendSuccess(res, exportJob, 201);
};

export const getExport: RequestHandler = async (req, res) => {
  const params = parseOrThrow(exportJobParamsSchema, req.params);
  const context = await getRequestContext(req);
  const exportJob = await getExportJob(context, params.exportJobId);
  sendSuccess(res, exportJob);
};

export const downloadExport: RequestHandler = async (req, res) => {
  const params = parseOrThrow(exportJobParamsSchema, req.params);
  const context = await getRequestContext(req);
  const download = await getExportDownload(context, params.exportJobId);
  res.setHeader("Content-Type", download.contentType);
  res.download(download.absolutePath, download.fileName);
};
