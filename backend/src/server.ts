import { env } from "./config/env";
import { initDatabase } from "./database/client";
import { createApp } from "./app";

async function bootstrap() {
  await initDatabase();
  const app = await createApp();
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`[ATS Server] running on http://0.0.0.0:${env.port}`);
    console.log("[ATS Server] database provider: PostgreSQL");
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start ATS server", error);
  process.exit(1);
});
