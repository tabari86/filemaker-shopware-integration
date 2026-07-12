const test = require("node:test");
const assert = require("node:assert/strict");
const { isDeepStrictEqual } = require("node:util");

const models = require("../src/models");
const SyncLog = require("../src/models/sync-log.model");
const SyncRun = require("../src/models/sync-run.model");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

function findIndex(model, expectedFields) {
  return model.schema
    .indexes()
    .find(([fields]) => isDeepStrictEqual(fields, expectedFields));
}

test("SyncRun applies defaults and validates its lifecycle fields", async () => {
  const run = new SyncRun({
    requestId: "http-request-1",
    scope: "products",
    trigger: "api-products"
  });

  await run.validate();
  assert.match(
    run.runId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  assert.equal(run.status, "running");
  assert.ok(run.startedAt instanceof Date);
  assert.equal(run.finishedAt, null);
  assert.equal(run.durationMs, null);
  assert.equal(run.summary, null);
  assert.equal(run.error, null);
});

test("SyncRun rejects invalid scope, status, request ID, and summary", async () => {
  const run = new SyncRun({
    runId: "not-a-uuid",
    requestId: "",
    scope: "dashboard",
    trigger: "api-all",
    status: "cancelled",
    summary: { products: -1, orders: 0, total: -1 }
  });

  await assert.rejects(run.validate(), (error) => {
    assert.ok(error.errors.runId);
    assert.ok(error.errors.requestId);
    assert.ok(error.errors.scope);
    assert.ok(error.errors.status);
    assert.ok(error.errors["summary.products"]);
    assert.ok(error.errors["summary.total"]);
    return true;
  });
});

test("SyncLog validates shared run and request metadata", async () => {
  const log = new SyncLog({
    entity: "products",
    direction: "shopware-to-filemaker-simulation",
    status: "success",
    savedCount: 2,
    runId: RUN_ID,
    requestId: "http-request-1",
    trigger: "api-products",
    startedAt: new Date("2026-07-12T00:00:00Z"),
    finishedAt: new Date("2026-07-12T00:00:01Z"),
    durationMs: 1000,
    mode: "mock"
  });

  await log.validate();
  assert.equal(log.runId, RUN_ID);
  assert.equal(log.requestId, "http-request-1");
  assert.ok(log.startedAt instanceof Date);
  assert.ok(log.finishedAt instanceof Date);
  assert.equal(log.durationMs, 1000);
});

test("legacy SyncLogs remain readable without correlation metadata", () => {
  const legacy = SyncLog.hydrate({
    _id: "507f1f77bcf86cd799439011",
    entity: "products",
    direction: "shopware-to-filemaker-simulation",
    status: "success",
    savedCount: 2,
    startedAt: new Date("2026-06-04T06:00:00.000Z"),
    finishedAt: new Date("2026-06-04T06:00:01.000Z"),
    mode: "mock",
    createdAt: new Date("2026-06-04T06:00:01.000Z"),
    updatedAt: new Date("2026-06-04T06:00:01.000Z")
  });

  assert.equal(legacy.runId, undefined);
  assert.equal(legacy.requestId, undefined);
  assert.equal(legacy.trigger, undefined);
  assert.equal(legacy.durationMs, undefined);
  assert.ok(legacy.startedAt instanceof Date);
  assert.ok(legacy.createdAt instanceof Date);
});

test("SyncLog rejects missing correlation fields and unsafe values", async () => {
  const log = new SyncLog({
    entity: "all",
    direction: "simulation",
    status: "running",
    savedCount: -1,
    runId: "not-a-uuid",
    requestId: "",
    trigger: "",
    startedAt: new Date(),
    finishedAt: new Date(),
    durationMs: -1,
    mode: "mock"
  });

  await assert.rejects(log.validate(), (error) => {
    assert.ok(error.errors.entity);
    assert.ok(error.errors.status);
    assert.ok(error.errors.savedCount);
    assert.ok(error.errors.runId);
    assert.ok(error.errors.requestId);
    assert.ok(error.errors.trigger);
    assert.ok(error.errors.durationMs);
    return true;
  });
});

test("SyncRun and SyncLog expose the required query indexes", () => {
  assert.ok(findIndex(SyncRun, { runId: 1 }));
  assert.ok(findIndex(SyncRun, { scope: 1, startedAt: -1 }));
  assert.ok(findIndex(SyncRun, { status: 1, startedAt: -1 }));
  assert.ok(findIndex(SyncRun, { startedAt: -1 }));

  assert.ok(findIndex(SyncLog, { createdAt: -1 }));
  assert.ok(findIndex(SyncLog, { entity: 1, createdAt: -1 }));
  assert.ok(findIndex(SyncLog, { status: 1, createdAt: -1 }));
  assert.ok(findIndex(SyncLog, { entity: 1, status: 1, createdAt: -1 }));
  assert.ok(findIndex(SyncLog, { runId: 1, createdAt: 1 }));
  assert.equal(findIndex(SyncLog, { runId: 1, startedAt: 1 }), undefined);
});

test("model index initialization includes SyncRun", async (t) => {
  const initialized = [];

  for (const name of ["Product", "Order", "SyncLog", "SyncRun"]) {
    t.mock.method(models[name], "init", async () => {
      initialized.push(name);
    });
  }

  await models.initializeIndexes();
  assert.deepEqual(initialized.sort(), ["Order", "Product", "SyncLog", "SyncRun"]);
});
