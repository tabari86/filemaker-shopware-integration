const express = require("express");
const { runDashboardSync } = require("../sync/dashboard.sync");
const { readSyncLogs, readLatestByEntity } = require("../filemaker/sync-log.repository");
const apiKey = require("../middleware/api-key.middleware");

function parseLimit(value) {
  if (value === undefined) return 25;

  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) {
    const error = new Error("limit must be an integer from 1 to 100");
    error.status = 400;
    throw error;
  }

  return Number(value);
}

const router = express.Router();

router.post("/sync/all", apiKey, async (req, res) => {
  const result = await runDashboardSync();

  res.status(200).json({
    success: true,
    message: "Dashboard synchronization completed",
    data: result
  });
});

router.get("/sync/logs", apiKey, async (req, res) => {
  const logs = await readSyncLogs(parseLimit(req.query.limit));

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

router.get("/sync-status", apiKey, async (req, res) => {
  const entities = ["products", "orders", "dashboard"];
  const latest = await readLatestByEntity(entities);
  const data = Object.fromEntries(
    entities.map((entity) => [
      entity,
      latest[entity]
        ? {
            status: latest[entity].status,
            lastRunAt: latest[entity].finishedAt,
            savedCount: latest[entity].savedCount
          }
        : { status: "never-run", lastRunAt: null, savedCount: 0 }
    ])
  );

  res.json({ success: true, data });
});

module.exports = router;
