const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://example.invalid/";
process.env.MONGODB_DB_NAME = "FilemakerShopwareIntegration";
process.env.API_KEY = "test-key-that-is-at-least-32-characters";

const API_KEY = process.env.API_KEY;
const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const LOG_ID = "507f1f77bcf86cd799439011";

const state = {
  productOptions: null,
  orderOptions: null,
  syncLogOptions: null,
  syncRunOptions: null,
  productReadError: null,
  productSyncRequestId: null,
  orderSyncRequestId: null,
  dashboardSyncRequestId: null
};

// Route collaborators are replaced before app loading so no test opens MongoDB.
const productRepository = require("../src/filemaker/product.repository");
productRepository.readProducts = async (options) => {
  state.productOptions = options;
  if (state.productReadError) throw state.productReadError;
  return {
    items: [{ productNumber: "BOOK-001", productName: "API Design" }],
    total: 31
  };
};
productRepository.findProductByProductNumber = async (productNumber) =>
  productNumber === "BOOK-001"
    ? { productNumber, productName: "API Design" }
    : null;

const orderRepository = require("../src/filemaker/order.repository");
orderRepository.readOrders = async (options) => {
  state.orderOptions = options;
  return {
    items: [{ orderNumber: "ORD-2026-001", status: "open" }],
    total: 12
  };
};
orderRepository.findOrderByOrderNumber = async (orderNumber) =>
  orderNumber === "ORD-2026-001"
    ? { orderNumber, status: "open" }
    : null;

const syncLogRepository = require("../src/filemaker/sync-log.repository");
syncLogRepository.readSyncLogs = async (options) => {
  state.syncLogOptions = options;
  return {
    items: [{ _id: LOG_ID, runId: RUN_ID, entity: "products" }],
    total: 26
  };
};
syncLogRepository.findSyncLogById = async (logId) =>
  logId === LOG_ID ? { _id: logId, runId: RUN_ID, entity: "products" } : null;
syncLogRepository.findSyncLogsByRunId = async (runId) => [
  {
    _id: LOG_ID,
    runId,
    entity: "products",
    startedAt: "2026-07-12T00:00:01.000Z",
    createdAt: "2026-07-12T00:00:02.000Z"
  },
  {
    _id: "507f1f77bcf86cd799439012",
    runId,
    entity: "orders",
    startedAt: "2026-07-12T00:00:02.000Z",
    createdAt: "2026-07-12T00:00:02.000Z"
  },
  {
    _id: "507f1f77bcf86cd799439013",
    runId,
    entity: "dashboard",
    startedAt: "2026-07-12T00:00:00.000Z",
    createdAt: "2026-07-12T00:00:04.000Z"
  }
];

const syncRunRepository = require("../src/filemaker/sync-run.repository");
syncRunRepository.readSyncRuns = async (options) => {
  state.syncRunOptions = options;
  return {
    items: [{ runId: RUN_ID, scope: "products", status: "success" }],
    total: 7
  };
};
syncRunRepository.findSyncRunByRunId = async (runId) =>
  runId === RUN_ID ? { runId, scope: "products", status: "success" } : null;
syncRunRepository.readLatestRunsByScope = async () => ({
  products: {
    runId: RUN_ID,
    scope: "products",
    status: "success",
    startedAt: "2026-07-12T00:00:00.000Z",
    durationMs: 15,
    summary: { products: 2, orders: 0, total: 2 }
  }
});

const productSync = require("../src/sync/product.sync");
productSync.runProductSync = async ({ requestId }) => {
  state.productSyncRequestId = requestId;
  return { runId: RUN_ID, requestId, scope: "products", status: "success" };
};

const orderSync = require("../src/sync/order.sync");
orderSync.runOrderSync = async ({ requestId }) => {
  state.orderSyncRequestId = requestId;
  return { runId: RUN_ID, requestId, scope: "orders", status: "success" };
};

const dashboardSync = require("../src/sync/dashboard.sync");
dashboardSync.runDashboardSync = async ({ requestId }) => {
  state.dashboardSyncRequestId = requestId;
  return { runId: RUN_ID, requestId, scope: "all", status: "success" };
};

const app = require("../src/app");

function authorized(supertestRequest, requestId = "route-test-request") {
  return supertestRequest
    .set("x-api-key", API_KEY)
    .set("x-request-id", requestId);
}

function assertSuccess(response, requestId = "route-test-request") {
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.headers["x-request-id"], requestId);
  assert.equal(response.body.requestId, requestId);
}

function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
  assert.equal(
    response.body.error.requestId,
    response.headers["x-request-id"]
  );
}

test("product listing forwards validated filters and returns pagination", async () => {
  const response = await authorized(
    request(app).get(
      "/api/v1/products?page=2&limit=10&productNumber=BOOK-001&name=API&isActive=true&minStock=3&sort=-stockQuantity"
    )
  );

  assertSuccess(response);
  assert.deepEqual(state.productOptions, {
    page: 2,
    limit: 10,
    productNumber: "BOOK-001",
    name: "API",
    isActive: true,
    minStock: 3,
    sort: { field: "stockQuantity", direction: -1 }
  });
  assert.deepEqual(response.body.pagination, {
    page: 2,
    limit: 10,
    total: 31,
    totalPages: 4
  });
});

test("product detail returns data and PRODUCT_NOT_FOUND", async (t) => {
  const found = await authorized(
    request(app).get("/api/v1/products/BOOK-001"),
    "product-found"
  );
  assertSuccess(found, "product-found");
  assert.equal(found.body.data.productNumber, "BOOK-001");

  t.mock.method(console, "error", () => {});
  const missing = await authorized(
    request(app).get("/api/v1/products/BOOK-404"),
    "product-missing"
  );
  assertError(missing, 404, "PRODUCT_NOT_FOUND");
});

test("order listing forwards date filters and returns pagination", async () => {
  const response = await authorized(
    request(app).get(
      "/api/v1/orders?page=3&limit=5&orderNumber=ORD-2026-001&status=OPEN&from=2026-07-01&to=2026-07-12&sort=amountTotal"
    )
  );

  assertSuccess(response);
  assert.equal(state.orderOptions.page, 3);
  assert.equal(state.orderOptions.limit, 5);
  assert.equal(state.orderOptions.orderNumber, "ORD-2026-001");
  assert.equal(state.orderOptions.status, "open");
  assert.equal(state.orderOptions.from.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(state.orderOptions.to.toISOString(), "2026-07-12T23:59:59.999Z");
  assert.deepEqual(state.orderOptions.sort, {
    field: "amountTotal",
    direction: 1
  });
  assert.deepEqual(response.body.pagination, {
    page: 3,
    limit: 5,
    total: 12,
    totalPages: 3
  });
});

test("order detail returns data and ORDER_NOT_FOUND", async (t) => {
  const found = await authorized(
    request(app).get("/api/v1/orders/ORD-2026-001"),
    "order-found"
  );
  assertSuccess(found, "order-found");
  assert.equal(found.body.data.orderNumber, "ORD-2026-001");

  t.mock.method(console, "error", () => {});
  const missing = await authorized(
    request(app).get("/api/v1/orders/ORD-404"),
    "order-missing"
  );
  assertError(missing, 404, "ORDER_NOT_FOUND");
});

test("sync-log listing forwards filters and detail returns one log", async () => {
  const response = await authorized(
    request(app).get(
      `/api/v1/sync/logs?page=2&limit=20&entity=products&status=success&runId=${RUN_ID}&from=2026-07-01&to=2026-07-12&sort=-durationMs`
    )
  );

  assertSuccess(response);
  assert.equal(state.syncLogOptions.entity, "products");
  assert.equal(state.syncLogOptions.status, "success");
  assert.equal(state.syncLogOptions.runId, RUN_ID);
  assert.equal(state.syncLogOptions.from.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(state.syncLogOptions.to.toISOString(), "2026-07-12T23:59:59.999Z");
  assert.deepEqual(state.syncLogOptions.sort, {
    field: "durationMs",
    direction: -1
  });
  assert.deepEqual(response.body.pagination, {
    page: 2,
    limit: 20,
    total: 26,
    totalPages: 2
  });

  const detail = await authorized(
    request(app).get(`/api/v1/sync/logs/${LOG_ID}`),
    "log-detail"
  );
  assertSuccess(detail, "log-detail");
  assert.equal(detail.body.data._id, LOG_ID);
});

test("sync-run listing, detail, and status use SyncRun scopes", async () => {
  const response = await authorized(
    request(app).get(
      "/api/v1/sync/runs?page=1&limit=10&scope=products&status=success&from=2026-07-01&to=2026-07-12&sort=-startedAt"
    )
  );

  assertSuccess(response);
  assert.equal(state.syncRunOptions.scope, "products");
  assert.equal(state.syncRunOptions.status, "success");
  assert.equal(state.syncRunOptions.from.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(state.syncRunOptions.to.toISOString(), "2026-07-12T23:59:59.999Z");
  assert.deepEqual(response.body.pagination, {
    page: 1,
    limit: 10,
    total: 7,
    totalPages: 1
  });

  const detail = await authorized(
    request(app).get(`/api/v1/sync/runs/${RUN_ID}`),
    "run-detail"
  );
  assertSuccess(detail, "run-detail");
  assert.equal(detail.body.data.run.runId, RUN_ID);
  assert.deepEqual(
    detail.body.data.logs.map((log) => log.entity),
    ["products", "orders", "dashboard"]
  );
  assert.ok(
    detail.body.data.logs.every((log) => log.runId === RUN_ID)
  );
  assert.equal(
    detail.body.data.logs[2].startedAt,
    "2026-07-12T00:00:00.000Z"
  );
  assert.deepEqual(
    detail.body.data.logs.map((log) => log.createdAt),
    [
      "2026-07-12T00:00:02.000Z",
      "2026-07-12T00:00:02.000Z",
      "2026-07-12T00:00:04.000Z"
    ]
  );

  const status = await authorized(
    request(app).get("/api/v1/sync/status"),
    "sync-status"
  );
  assertSuccess(status, "sync-status");
  assert.equal(status.body.data.products.status, "success");
  assert.equal(status.body.data.products.runId, RUN_ID);
  assert.equal(status.body.data.orders.status, "never-run");
  assert.equal(status.body.data.all.status, "never-run");
});

test("sync routes pass the HTTP request ID to their orchestrators", async () => {
  const products = await authorized(
    request(app).post("/api/v1/sync/products"),
    "sync-products-request"
  );
  assertSuccess(products, "sync-products-request");
  assert.equal(state.productSyncRequestId, "sync-products-request");

  const orders = await authorized(
    request(app).post("/api/v1/sync/orders"),
    "sync-orders-request"
  );
  assertSuccess(orders, "sync-orders-request");
  assert.equal(state.orderSyncRequestId, "sync-orders-request");

  const full = await authorized(
    request(app).post("/api/v1/sync/all"),
    "sync-all-request"
  );
  assertSuccess(full, "sync-all-request");
  assert.equal(state.dashboardSyncRequestId, "sync-all-request");
});

test("detail identifier validation and missing resources use stable codes", async (t) => {
  t.mock.method(console, "error", () => {});

  const invalidLog = await authorized(
    request(app).get("/api/v1/sync/logs/not-an-object-id")
  );
  assertError(invalidLog, 400, "INVALID_IDENTIFIER");

  const invalidRun = await authorized(
    request(app).get("/api/v1/sync/runs/not-a-uuid")
  );
  assertError(invalidRun, 400, "INVALID_IDENTIFIER");

  const missingLog = await authorized(
    request(app).get("/api/v1/sync/logs/507f1f77bcf86cd799439099")
  );
  assertError(missingLog, 404, "SYNC_LOG_NOT_FOUND");

  const missingRun = await authorized(
    request(app).get("/api/v1/sync/runs/123e4567-e89b-42d3-a456-426614174099")
  );
  assertError(missingRun, 404, "SYNC_RUN_NOT_FOUND");
});

test("unexpected repository failures are production-safe", async (t) => {
  t.mock.method(console, "error", () => {});
  state.productReadError = new Error(
    "mongodb://user:secret@example.invalid/private"
  );

  const response = await authorized(
    request(app).get("/api/v1/products"),
    "internal-error"
  );
  state.productReadError = null;

  assertError(response, 500, "INTERNAL_ERROR");
  assert.equal(response.body.error.message, "Internal server error");
  assert.doesNotMatch(JSON.stringify(response.body), /secret|mongodb/i);
});
