import { existsSync } from "node:fs";
import { resolve } from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const envFile = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "backend", ".env")].find((candidate) =>
  existsSync(candidate)
);

dotenv.config(envFile ? { path: envFile } : undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  API_PREFIX: z.string().default("/api/v1"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000")
});

export const env = envSchema.parse(process.env);
