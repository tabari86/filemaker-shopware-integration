const express = require("express");
const syncLogRepository = require("../filemaker/sync-log.repository");
const syncRunRepository = require("../filemaker/sync-run.repository");
const { runDashboardSync } = require("../sync/dashboard.sync");
const { ApiError } = require("../utils/api-error");
const {
  buildPagination,
  parseObjectIdIdentifier,
  parseSyncLogQuery,
  parseSyncRunQuery,
  parseUuidIdentifier
} = require("../utils/query-options");

const router = express.Router();

router.post("/sync/all", async (req, res) => {
  const result = await runDashboardSync({ requestId: req.requestId });
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: result
  });
});

router.get("/sync/status", async (req, res) => {
  const scopes = ["products", "orders", "all"];
  const latest = await syncRunRepository.readLatestRunsByScope(scopes);
  const data = Object.fromEntries(
    scopes.map((scope) => {
      const run = latest[scope];
      return [
        scope,
        run
          ? {
              status: run.status,
              lastRunAt: run.startedAt,
              runId: run.runId,
              durationMs: run.durationMs ?? null,
              summary: run.summary ?? null
            }
          : {
              status: "never-run",
              lastRunAt: null,
              runId: null,
              durationMs: null,
              summary: null
            }
      ];
    })
  );

  res.status(200).json({ success: true, requestId: req.requestId, data });
});

router.get("/sync/logs", async (req, res) => {
  const options = parseSyncLogQuery(req.query);
  const { items, total } = await syncLogRepository.readSyncLogs(options);
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: items,
    pagination: buildPagination(options.page, options.limit, total)
  });
});

router.get("/sync/logs/:logId", async (req, res) => {
  const logId = parseObjectIdIdentifier(req.params.logId);
  const log = await syncLogRepository.findSyncLogById(logId);
  if (!log) {
    throw new ApiError(404, "SYNC_LOG_NOT_FOUND", "Synchronization log not found");
  }
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: log
  });
});

router.get("/sync/runs", async (req, res) => {
  const options = parseSyncRunQuery(req.query);
  const { items, total } = await syncRunRepository.readSyncRuns(options);
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: items,
    pagination: buildPagination(options.page, options.limit, total)
  });
});

router.get("/sync/runs/:runId", async (req, res) => {
  const runId = parseUuidIdentifier(req.params.runId);
  const run = await syncRunRepository.findSyncRunByRunId(runId);
  if (!run) {
    throw new ApiError(404, "SYNC_RUN_NOT_FOUND", "Synchronization run not found");
  }
  const logs = await syncLogRepository.findSyncLogsByRunId(runId);
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: { run, logs }
  });
});

module.exports = router;
