const SyncLog = require("../models/sync-log.model");

async function createSyncLog(entry) {
  return SyncLog.create(entry);
}

function buildSyncLogFilter(options) {
  const filter = {};

  if (options.entity !== undefined) filter.entity = options.entity;
  if (options.status !== undefined) filter.status = options.status;
  if (options.runId !== undefined) filter.runId = options.runId;
  if (options.from !== undefined || options.to !== undefined) {
    filter.createdAt = {};
    if (options.from !== undefined) filter.createdAt.$gte = options.from;
    if (options.to !== undefined) filter.createdAt.$lte = options.to;
  }

  return filter;
}

function buildSort(sort) {
  const selected = sort || { field: "createdAt", direction: -1 };
  return { [selected.field]: selected.direction, _id: selected.direction };
}

async function readSyncLogs(options = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const filter = buildSyncLogFilter(options);

  const [items, total] = await Promise.all([
    SyncLog.find(filter)
      .sort(buildSort(options.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SyncLog.countDocuments(filter)
  ]);

  return { items, total };
}

async function findSyncLogById(logId) {
  return SyncLog.findById(logId).lean();
}

async function findSyncLogsByRunId(runId) {
  return SyncLog.find({ runId }).sort({ createdAt: 1, _id: 1 }).lean();
}

module.exports = {
  createSyncLog,
  findSyncLogById,
  findSyncLogsByRunId,
  readSyncLogs
};
