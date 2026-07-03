import { env } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`LexAI API listening on port ${env.PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Closing LexAI API.`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
