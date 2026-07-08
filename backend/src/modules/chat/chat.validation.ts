import { z } from "zod";

import { idParamSchema } from "../shared/validation.js";

export const chatSessionParamsSchema = z.object({
  sessionId: idParamSchema
});

export const documentChatParamsSchema = z.object({
  documentId: idParamSchema
});

export const createChatSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional()
  })
  .strict();

export const createChatMessageSchema = z
  .object({
    content: z.string().trim().min(1, "Message content is required.").max(4000)
  })
  .strict();
