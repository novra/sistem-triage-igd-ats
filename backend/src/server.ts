import { env } from "./config/env";
import { initDatabase } from "./database/client";
import { createApp } from "./app";
import { logger } from "./logger";
import { ensureAdminBootstrap } from "./modules/users/users.repository";

async function bootstrap() {
  await initDatabase();
  await ensureAdminBootstrap();
  const app = await createApp();
  app.listen(env.port, "0.0.0.0", () => {
    logger.info({ port: env.port, database: "postgresql" }, "ATS server started");
  });
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "Failed to start ATS server");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});
