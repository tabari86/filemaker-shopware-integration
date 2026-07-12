const test = require("node:test");
const assert = require("node:assert/strict");

const productService = require("../src/shopware/product.service");
const orderService = require("../src/shopware/order.service");
const productMapper = require("../src/sync/product.mapper");
const orderMapper = require("../src/sync/order.mapper");
const productRepository = require("../src/filemaker/product.repository");
const orderRepository = require("../src/filemaker/order.repository");
const syncLogRepository = require("../src/filemaker/sync-log.repository");
const syncRunService = require("../src/sync/sync-run.service");
const productSync = require("../src/sync/product.sync");
const orderSync = require("../src/sync/order.sync");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

const scenarios = [
  {
    label: "products",
    entity: "products",
    scope: "products",
    trigger: "api-products",
    service: productService,
    fetchMethod: "fetchProducts",
    mapper: productMapper,
    mapMethod: "mapShopwareProductToFileMaker",
    repository: productRepository,
    saveMethod: "saveProducts",
    run: productSync.runProductSync
  },
  {
    label: "orders",
    entity: "orders",
    scope: "orders",
    trigger: "api-orders",
    service: orderService,
    fetchMethod: "fetchOrders",
    mapper: orderMapper,
    mapMethod: "mapShopwareOrderToFileMaker",
    repository: orderRepository,
    saveMethod: "saveOrders",
    run: orderSync.runOrderSync
  }
];

function runningRun(scenario, requestId) {
  return {
    runId: RUN_ID,
    requestId,
    scope: scenario.scope,
    trigger: scenario.trigger,
    status: "running",
    startedAt: new Date(Date.now() - 25),
    finishedAt: null,
    durationMs: null,
    summary: null,
    error: null
  };
}

for (const scenario of scenarios) {
  test(`${scenario.label} HTTP orchestration creates one run and one correlated log`, async (t) => {
    const starts = [];
    const completions = [];
    const failures = [];
    const logs = [];
    const requestId = `${scenario.label}-http-request`;

    t.mock.method(scenario.service, scenario.fetchMethod, async () => [
      { id: `${scenario.entity}-source-id` }
    ]);
    t.mock.method(scenario.mapper, scenario.mapMethod, () => ({
      shopwareId: `${scenario.entity}-mapped-id`
    }));
    t.mock.method(scenario.repository, scenario.saveMethod, async () => 2);
    t.mock.method(syncLogRepository, "createSyncLog", async (entry) => {
      logs.push(entry);
      return entry;
    });
    t.mock.method(syncRunService, "startRun", async (input) => {
      starts.push(input);
      return runningRun(scenario, input.requestId);
    });
    t.mock.method(syncRunService, "completeRun", async (run, summary) => {
      completions.push({ run, summary });
      return {
        ...run,
        status: "success",
        finishedAt: new Date(),
        durationMs: 25,
        summary
      };
    });
    t.mock.method(syncRunService, "failRun", async (run) => {
      failures.push(run);
      return { ...run, status: "failure", error: "SYNC_FAILED" };
    });

    const result = await scenario.run({ requestId });

    assert.deepEqual(starts, [
      {
        scope: scenario.scope,
        trigger: scenario.trigger,
        requestId
      }
    ]);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entity, scenario.entity);
    assert.equal(logs[0].status, "success");
    assert.equal(logs[0].runId, RUN_ID);
    assert.equal(logs[0].requestId, requestId);
    assert.equal(logs[0].trigger, scenario.trigger);
    assert.equal(logs[0].savedCount, 2);
    assert.ok(logs[0].durationMs >= 0);
    assert.equal(completions.length, 1);
    const expectedSummary = {
      products: scenario.entity === "products" ? 2 : 0,
      orders: scenario.entity === "orders" ? 2 : 0,
      total: 2
    };
    assert.deepEqual(completions[0].summary, expectedSummary);
    assert.equal(failures.length, 0);
    assert.equal(result.runId, RUN_ID);
    assert.equal(result.requestId, requestId);
    assert.equal(result.status, "success");
    assert.equal(result.result.savedCount, 2);
  });

  test(`${scenario.label} failure logs only a safe code and fails the same run`, async (t) => {
    const original = new Error(`private ${scenario.entity} source failure`);
    const starts = [];
    const failures = [];
    const logs = [];
    const requestId = `${scenario.label}-failed-request`;

    t.mock.method(scenario.service, scenario.fetchMethod, async () => {
      throw original;
    });
    t.mock.method(syncLogRepository, "createSyncLog", async (entry) => {
      logs.push(entry);
      return entry;
    });
    t.mock.method(syncRunService, "startRun", async (input) => {
      starts.push(input);
      return runningRun(scenario, input.requestId);
    });
    t.mock.method(syncRunService, "failRun", async (run) => {
      failures.push(run);
      return { ...run, status: "failure", error: "SYNC_FAILED" };
    });

    await assert.rejects(scenario.run({ requestId }), (error) => error === original);

    assert.equal(starts.length, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].entity, scenario.entity);
    assert.equal(logs[0].status, "failure");
    assert.equal(logs[0].runId, RUN_ID);
    assert.equal(logs[0].requestId, requestId);
    assert.equal(logs[0].trigger, scenario.trigger);
    assert.deepEqual(logs[0].details, { code: "SYNC_FAILED" });
    assert.doesNotMatch(JSON.stringify(logs[0]), /private|source failure/i);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].runId, RUN_ID);
  });
}
