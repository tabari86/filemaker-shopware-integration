const SyncLog = require("../models/sync-log.model");

async function createSyncLog(entry) {
  return SyncLog.create(entry);
}

async function readSyncLogs(limit = 25) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return SyncLog.find().sort({ createdAt: -1 }).limit(boundedLimit).lean();
}

async function readLatestByEntity(entities) {
  const rows = await SyncLog.aggregate([
    { $match: { entity: { $in: entities } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$entity", log: { $first: "$$ROOT" } } }
  ]);

  return Object.fromEntries(rows.map(({ _id, log }) => [_id, log]));
}

module.exports = { createSyncLog, readSyncLogs, readLatestByEntity };
