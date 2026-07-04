import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { getWorkspaceDashboard } from "./dashboard.service.js";

export const getDashboard: RequestHandler = async (req, res) => {
  const context = await getRequestContext(req);
  const dashboard = await getWorkspaceDashboard(context);
  sendSuccess(res, dashboard);
};
