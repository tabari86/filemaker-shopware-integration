const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const SYNC_LOG_FILE = path.join(
  __dirname,
  "../../data/logs/sync-log.json"
);

async function readSyncLogs() {
  const fileContent = await fs.readFile(SYNC_LOG_FILE, "utf-8");
  return JSON.parse(fileContent);
}

async function createSyncLog(entry) {
  const logs = await readSyncLogs();

  const logEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };

  logs.push(logEntry);

  await fs.writeFile(
    SYNC_LOG_FILE,
    JSON.stringify(logs, null, 2),
    "utf-8"
  );

  return logEntry;
}

module.exports = {
  readSyncLogs,
  createSyncLog
};