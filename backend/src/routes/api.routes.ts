import { Router } from "express";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    name: "LexAI API",
    version: "v1",
    status: "ready"
  });
});
