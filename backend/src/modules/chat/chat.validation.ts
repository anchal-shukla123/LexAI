import { z } from "zod";

import { idParamSchema } from "../shared/validation.js";

export const chatSessionParamsSchema = z.object({
  sessionId: idParamSchema
});

