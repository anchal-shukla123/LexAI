import { Router } from "express";

import { authRouter } from "../modules/auth/auth.routes.js";
import { chatRouter } from "../modules/chat/chat.routes.js";
import { demoRouter } from "../modules/demo/demo.routes.js";
import { documentsRouter } from "../modules/documents/documents.routes.js";
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
apiRouter.use("/demo", demoRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/chat", chatRouter);
