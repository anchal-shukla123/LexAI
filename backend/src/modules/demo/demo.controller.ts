import type { RequestHandler } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getDemoDashboard } from "./demo.service.js";

export const getDashboard: RequestHandler = async (_req, res) => {
  const dashboard = await getDemoDashboard();
  sendSuccess(res, dashboard);
};

