const express = require("express");
const { runDashboardSync } = require("../sync/dashboard.sync");
const { readSyncLogs } = require("../filemaker/sync-log.repository");

const router = express.Router();

router.post("/sync/all", async (req, res) => {
  const result = await runDashboardSync();

  res.status(200).json({
    success: true,
    message: "Dashboard synchronization completed",
    data: result
  });
});

router.get("/sync/logs", async (req, res) => {
  const logs = await readSyncLogs();

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

module.exports = router;