import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes.js";
import { chatRouter } from "../modules/chat/chat.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { documentsRouter } from "../modules/documents/documents.routes.js";
import { exportsRouter } from "../modules/exports/exports.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    name: "LexAI API",
    version: "v1",
    status: "ready"
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/exports", exportsRouter);
apiRouter.use("/chat", chatRouter);
