const test = require("node:test");
const assert = require("node:assert/strict");

const productSync = require("../src/sync/product.sync");
const orderSync = require("../src/sync/order.sync");
const syncLogRepository = require("../src/filemaker/sync-log.repository");
const syncRunService = require("../src/sync/sync-run.service");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const RUN = {
  runId: RUN_ID,
  requestId: "full-http-request",
  scope: "all",
  trigger: "api-all",
  status: "running",
  startedAt: new Date(Date.now() - 100)
};

const calls = {
  starts: [],
  productContexts: [],
  orderContexts: [],
  logs: [],
  completions: [],
  failures: []
};

const behavior = {
  productError: null,
  orderError: null,
  completeError: null
};

function reset() {
  calls.starts.length = 0;
  calls.productContexts.length = 0;
  calls.orderContexts.length = 0;
  calls.logs.length = 0;
  calls.completions.length = 0;
  calls.failures.length = 0;
  behavior.productError = null;
  behavior.orderError = null;
  behavior.completeError = null;
}

// Install stable wrappers before dashboard.sync captures any collaborators.
syncRunService.startRun = async (input) => {
  calls.starts.push(input);
  return { ...RUN, requestId: input.requestId || RUN.requestId };
};
productSync.syncProducts = async (context) => {
  calls.productContexts.push(context);
  if (behavior.productError) throw behavior.productError;
  return { entity: "products", savedCount: 2 };
};
orderSync.syncOrders = async (context) => {
  calls.orderContexts.push(context);
  if (behavior.orderError) throw behavior.orderError;
  return { entity: "orders", savedCount: 1 };
};
syncLogRepository.createSyncLog = async (entry) => {
  calls.logs.push(entry);
  return entry;
};
syncRunService.completeRun = async (run, summary) => {
  calls.completions.push({ run, summary });
  if (behavior.completeError) throw behavior.completeError;
  return {
    ...run,
    status: "success",
    finishedAt: new Date(),
    durationMs: 100,
    summary,
    error: null
  };
};
syncRunService.failRun = async (run) => {
  calls.failures.push(run);
  return { ...run, status: "failure", error: "SYNC_FAILED" };
};

const { runDashboardSync } = require("../src/sync/dashboard.sync");

test("full sync creates one top-level run and shares its correlation context", async () => {
  reset();

  const result = await runDashboardSync({ requestId: "full-http-request" });

  assert.deepEqual(calls.starts, [
    {
      scope: "all",
      trigger: "api-all",
      requestId: "full-http-request"
    }
  ]);
  const expectedContext = {
    runId: RUN_ID,
    requestId: "full-http-request",
    trigger: "api-all"
  };
  assert.deepEqual(calls.productContexts, [expectedContext]);
  assert.deepEqual(calls.orderContexts, [expectedContext]);
  assert.equal(calls.logs.length, 1);
  assert.equal(calls.logs[0].entity, "dashboard");
  assert.equal(calls.logs[0].status, "success");
  assert.equal(calls.logs[0].runId, RUN_ID);
  assert.equal(calls.logs[0].requestId, "full-http-request");
  assert.equal(calls.logs[0].trigger, "api-all");
  assert.deepEqual(calls.logs[0].details, {
    products: 2,
    orders: 1,
    total: 3
  });
  assert.equal(calls.completions.length, 1);
  assert.deepEqual(calls.completions[0].summary, {
    products: 2,
    orders: 1,
    total: 3
  });
  assert.equal(calls.failures.length, 0);
  assert.equal(result.runId, RUN_ID);
  assert.equal(result.requestId, "full-http-request");
  assert.equal(result.scope, "all");
  assert.equal(result.status, "success");
  assert.equal(result.results.products.savedCount, 2);
  assert.equal(result.results.orders.savedCount, 1);
});

test("child failure writes a safe dashboard failure log and fails the same run", async () => {
  reset();
  const original = new Error("private order service detail");
  behavior.orderError = original;

  await assert.rejects(
    runDashboardSync({ requestId: "full-http-request" }),
    (error) => error === original
  );

  assert.equal(calls.starts.length, 1);
  assert.equal(calls.productContexts.length, 1);
  assert.equal(calls.orderContexts.length, 1);
  assert.equal(calls.logs.length, 1);
  assert.equal(calls.logs[0].status, "failure");
  assert.equal(calls.logs[0].runId, RUN_ID);
  assert.equal(calls.logs[0].requestId, "full-http-request");
  assert.deepEqual(calls.logs[0].details, { code: "SYNC_FAILED" });
  assert.doesNotMatch(JSON.stringify(calls.logs[0]), /private|service detail/i);
  assert.equal(calls.completions.length, 0);
  assert.equal(calls.failures.length, 1);
  assert.equal(calls.failures[0].runId, RUN_ID);
});

test("completion transition failure does not append a contradictory failure log", async () => {
  reset();
  const transitionError = new Error("Synchronization run state transition failed");
  transitionError.code = "SYNC_RUN_TRANSITION_FAILED";
  behavior.completeError = transitionError;

  await assert.rejects(
    runDashboardSync({ requestId: "full-http-request" }),
    (error) => error === transitionError
  );

  assert.equal(calls.logs.length, 1);
  assert.equal(calls.logs[0].status, "success");
  assert.equal(calls.completions.length, 1);
  assert.equal(calls.failures.length, 1);
});
