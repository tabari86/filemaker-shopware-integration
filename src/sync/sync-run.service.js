const crypto = require("crypto");
const syncRunRepository = require("../filemaker/sync-run.repository");

const SAFE_FAILURE_CODE = "SYNC_FAILED";

function durationMs(startedAt, finishedAt) {
  const start = new Date(startedAt).getTime();
  const finish = new Date(finishedAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(finish)) return 0;
  return Math.max(0, finish - start);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function sanitizeRun(run, fallback) {
  const source = run || {};

  return {
    runId: firstDefined(source.runId, fallback.runId),
    requestId: firstDefined(source.requestId, fallback.requestId),
    scope: firstDefined(source.scope, fallback.scope),
    trigger: firstDefined(source.trigger, fallback.trigger),
    status: firstDefined(source.status, fallback.status),
    startedAt: firstDefined(source.startedAt, fallback.startedAt),
    finishedAt: firstDefined(source.finishedAt, fallback.finishedAt, null),
    durationMs: firstDefined(source.durationMs, fallback.durationMs, null),
    summary: firstDefined(source.summary, fallback.summary, null),
    error: firstDefined(source.error, fallback.error, null)
  };
}

function transitionError() {
  const error = new Error("Synchronization run state transition failed");
  error.code = "SYNC_RUN_TRANSITION_FAILED";
  return error;
}

async function startRun({ scope, trigger, requestId } = {}) {
  const effectiveRequestId = requestId || crypto.randomUUID();
  const created = await syncRunRepository.createSyncRun({
    scope,
    trigger,
    requestId: effectiveRequestId
  });

  return sanitizeRun(created, {
    scope,
    trigger,
    status: "running",
    requestId: effectiveRequestId,
    finishedAt: null,
    durationMs: null,
    summary: null,
    error: null
  });
}

async function completeRun(run, summary) {
  const finishedAt = new Date();
  const updates = {
    finishedAt,
    durationMs: durationMs(run.startedAt, finishedAt),
    summary
  };
  const completed = await syncRunRepository.completeSyncRun(
    run.runId,
    updates
  );
  if (!completed) throw transitionError();

  return sanitizeRun(completed, {
    ...run,
    ...updates,
    status: "success",
    error: null
  });
}

async function failRun(run) {
  const finishedAt = new Date();
  const updates = {
    finishedAt,
    durationMs: durationMs(run.startedAt, finishedAt),
    error: SAFE_FAILURE_CODE
  };

  try {
    const failed = await syncRunRepository.failSyncRun(run.runId, updates);
    if (!failed) throw transitionError();
    return sanitizeRun(failed, {
      ...run,
      ...updates,
      status: "failure"
    });
  } catch {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: run.requestId,
        runId: run.runId,
        code: "SYNC_RUN_TRANSITION_FAILED",
        message: "Failed to persist synchronization run failure state"
      })
    );
    return null;
  }
}

module.exports = {
  SAFE_FAILURE_CODE,
  durationMs,
  startRun,
  completeRun,
  failRun
};
