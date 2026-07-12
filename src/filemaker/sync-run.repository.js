const crypto = require("crypto");
const SyncRun = require("../models/sync-run.model");

function toPlainObject(document) {
  return typeof document?.toObject === "function"
    ? document.toObject()
    : document;
}

function buildDateRange(from, to) {
  const range = {};
  if (from !== undefined) range.$gte = from;
  if (to !== undefined) range.$lte = to;
  return range;
}

function buildSort(sort) {
  const selected = sort || { field: "startedAt", direction: -1 };
  return { [selected.field]: selected.direction, _id: selected.direction };
}

async function createSyncRun({ scope, trigger, requestId }) {
  const created = await SyncRun.create({
    runId: crypto.randomUUID(),
    requestId,
    scope,
    trigger,
    status: "running",
    startedAt: new Date()
  });

  return toPlainObject(created);
}

async function completeSyncRun(runId, updates) {
  return SyncRun.findOneAndUpdate(
    { runId, status: "running" },
    {
      $set: {
        status: "success",
        finishedAt: updates.finishedAt,
        durationMs: updates.durationMs,
        summary: updates.summary,
        error: null
      }
    },
    { new: true, runValidators: true }
  ).lean();
}

async function failSyncRun(runId, updates) {
  return SyncRun.findOneAndUpdate(
    { runId, status: "running" },
    {
      $set: {
        status: "failure",
        finishedAt: updates.finishedAt,
        durationMs: updates.durationMs,
        error: updates.error
      }
    },
    { new: true, runValidators: true }
  ).lean();
}

async function readSyncRuns(options = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const filter = {};

  if (options.scope !== undefined) filter.scope = options.scope;
  if (options.status !== undefined) filter.status = options.status;
  if (options.from !== undefined || options.to !== undefined) {
    filter.startedAt = buildDateRange(options.from, options.to);
  }

  const [items, total] = await Promise.all([
    SyncRun.find(filter)
      .sort(buildSort(options.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SyncRun.countDocuments(filter)
  ]);

  return { items, total };
}

async function findSyncRunByRunId(runId) {
  return SyncRun.findOne({ runId }).lean();
}

async function readLatestRunsByScope(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) return {};

  const rows = await SyncRun.aggregate([
    { $match: { scope: { $in: scopes } } },
    { $sort: { startedAt: -1, _id: -1 } },
    { $group: { _id: "$scope", run: { $first: "$$ROOT" } } }
  ]);

  return Object.fromEntries(rows.map(({ _id, run }) => [_id, run]));
}

module.exports = {
  completeSyncRun,
  createSyncRun,
  failSyncRun,
  findSyncRunByRunId,
  readLatestRunsByScope,
  readSyncRuns
};
