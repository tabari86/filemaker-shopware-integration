const test = require("node:test");
const assert = require("node:assert/strict");

const syncRunRepository = require("../src/filemaker/sync-run.repository");
const syncRunService = require("../src/sync/sync-run.service");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const STARTED_AT = new Date(Date.now() - 50);

function runningRun(overrides = {}) {
  return {
    runId: RUN_ID,
    requestId: "http-request-1",
    scope: "products",
    trigger: "api-products",
    status: "running",
    startedAt: STARTED_AT,
    finishedAt: null,
    durationMs: null,
    summary: null,
    error: null,
    ...overrides
  };
}

test("durationMs is safe for valid, reversed, and invalid dates", () => {
  assert.equal(
    syncRunService.durationMs(
      "2026-07-12T00:00:00.000Z",
      "2026-07-12T00:00:00.250Z"
    ),
    250
  );
  assert.equal(
    syncRunService.durationMs(
      "2026-07-12T00:00:01.000Z",
      "2026-07-12T00:00:00.000Z"
    ),
    0
  );
  assert.equal(syncRunService.durationMs("invalid", "also-invalid"), 0);
});

test("startRun creates one running run with the caller request ID", async (t) => {
  let createInput;
  t.mock.method(syncRunRepository, "createSyncRun", async (input) => {
    createInput = input;
    return runningRun({
      requestId: input.requestId,
      scope: input.scope,
      trigger: input.trigger
    });
  });

  const result = await syncRunService.startRun({
    scope: "products",
    trigger: "api-products",
    requestId: "caller-request-id"
  });

  assert.deepEqual(createInput, {
    scope: "products",
    trigger: "api-products",
    requestId: "caller-request-id"
  });
  assert.equal(result.runId, RUN_ID);
  assert.equal(result.requestId, "caller-request-id");
  assert.equal(result.status, "running");
});

test("startRun generates a UUID request ID when called outside HTTP", async (t) => {
  let createInput;
  t.mock.method(syncRunRepository, "createSyncRun", async (input) => {
    createInput = input;
    return runningRun({ requestId: input.requestId });
  });

  const result = await syncRunService.startRun({
    scope: "orders",
    trigger: "manual-test"
  });

  assert.match(
    createInput.requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  assert.equal(result.requestId, createInput.requestId);
});

test("completeRun persists a success summary", async (t) => {
  const run = runningRun();
  const summary = { products: 2, orders: 0, total: 2 };
  let updateCall;

  t.mock.method(
    syncRunRepository,
    "completeSyncRun",
    async (runId, updates) => {
      updateCall = { runId, updates };
      return {
        ...run,
        status: "success",
        finishedAt: updates.finishedAt,
        durationMs: updates.durationMs,
        summary
      };
    }
  );

  const result = await syncRunService.completeRun(run, summary);

  assert.equal(updateCall.runId, RUN_ID);
  assert.ok(updateCall.updates.finishedAt instanceof Date);
  assert.ok(updateCall.updates.durationMs >= 0);
  assert.deepEqual(updateCall.updates.summary, summary);
  assert.equal(result.status, "success");
  assert.deepEqual(result.summary, summary);
  assert.equal(result.error, null);
});

test("completeRun throws a fixed transition error when atomic update misses", async (t) => {
  t.mock.method(syncRunRepository, "completeSyncRun", async () => null);

  await assert.rejects(
    syncRunService.completeRun(runningRun(), {
      products: 2,
      orders: 0,
      total: 2
    }),
    (error) => {
      assert.equal(error.code, "SYNC_RUN_TRANSITION_FAILED");
      assert.equal(error.message, "Synchronization run state transition failed");
      return true;
    }
  );
});

test("failRun persists only the fixed safe failure code", async (t) => {
  const run = runningRun();
  let updateCall;
  t.mock.method(syncRunRepository, "failSyncRun", async (runId, updates) => {
    updateCall = { runId, updates };
    return {
      ...run,
      status: "failure",
      finishedAt: updates.finishedAt,
      durationMs: updates.durationMs,
      error: updates.error
    };
  });

  const result = await syncRunService.failRun(run);

  assert.equal(updateCall.runId, RUN_ID);
  assert.equal(updateCall.updates.error, "SYNC_FAILED");
  assert.equal(result.status, "failure");
  assert.equal(result.error, "SYNC_FAILED");
});

test("failRun logs a fixed transition error and returns null on update miss", async (t) => {
  const logged = [];
  t.mock.method(syncRunRepository, "failSyncRun", async () => null);
  t.mock.method(console, "error", (entry) => logged.push(JSON.parse(entry)));

  const result = await syncRunService.failRun(runningRun());

  assert.equal(result, null);
  assert.equal(logged.length, 1);
  assert.deepEqual(
    {
      requestId: logged[0].requestId,
      runId: logged[0].runId,
      code: logged[0].code,
      message: logged[0].message
    },
    {
      requestId: "http-request-1",
      runId: RUN_ID,
      code: "SYNC_RUN_TRANSITION_FAILED",
      message: "Failed to persist synchronization run failure state"
    }
  );
});

test("failRun also contains repository exceptions", async (t) => {
  const logged = [];
  t.mock.method(syncRunRepository, "failSyncRun", async () => {
    throw new Error("secret database failure");
  });
  t.mock.method(console, "error", (entry) => logged.push(entry));

  const result = await syncRunService.failRun(runningRun());

  assert.equal(result, null);
  assert.equal(logged.length, 1);
  assert.doesNotMatch(logged[0], /secret|database/i);
  assert.match(logged[0], /SYNC_RUN_TRANSITION_FAILED/);
});
