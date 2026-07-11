const dotenv = require("dotenv");
dotenv.config({ quiet: true });
const config = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { initializeIndexes } = require("./models");

async function startServer() {
  try {
    config.validateRuntimeConfig();
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase();
    await initializeIndexes();
  } catch {
    console.error("Startup failed: database connection or initialization failed");
    await disconnectDatabase().catch(() => {});
    process.exitCode = 1;
    return;
  }

  const app = require("./app");
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Service listening on 0.0.0.0:${config.port} (${config.nodeEnv})`);
  });

  server.on("error", async () => {
    console.error("Startup failed: HTTP server could not start");
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down`);
    server.close(async (error) => {
      try { await disconnectDatabase(); } finally { process.exit(error ? 1 : 0); }
    });
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(async () => {
  console.error("Startup failed: unexpected initialization error");
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
