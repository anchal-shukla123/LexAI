import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestContext } from "../shared/request-context.js";
import { getDemoDashboard } from "./demo.service.js";

export const getDashboard: RequestHandler = async (req, res) => {
  const context = await getRequestContext(req);
  const dashboard = await getDemoDashboard(context);
  sendSuccess(res, dashboard);
};
