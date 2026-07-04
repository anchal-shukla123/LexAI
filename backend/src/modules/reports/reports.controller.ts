import type { RequestHandler } from "express";

import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { parseOrThrow } from "../shared/validation.js";
import { getReportDetail, listReports } from "./reports.service.js";
import { reportParamsSchema, reportsQuerySchema } from "./reports.validation.js";

export const getReports: RequestHandler = async (req, res) => {
  const query = parseOrThrow(reportsQuerySchema, req.query);
  const context = await getRequestContext(req);
  const result = await listReports(context, {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    status: query.status
  });
  sendPaginated(res, result.reports, result.pagination);
};

export const getReport: RequestHandler = async (req, res) => {
  const params = parseOrThrow(reportParamsSchema, req.params);
  const context = await getRequestContext(req);
  const report = await getReportDetail(context, params.reportId);
  sendSuccess(res, report);
};
