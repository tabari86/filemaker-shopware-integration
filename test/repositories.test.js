const test = require("node:test");
const assert = require("node:assert/strict");

const Product = require("../src/models/product.model");
const Order = require("../src/models/order.model");
const SyncLog = require("../src/models/sync-log.model");
const SyncRun = require("../src/models/sync-run.model");
const productRepository = require("../src/filemaker/product.repository");
const orderRepository = require("../src/filemaker/order.repository");
const syncLogRepository = require("../src/filemaker/sync-log.repository");
const syncRunRepository = require("../src/filemaker/sync-run.repository");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

function queryReturning(result, capture = {}) {
  return {
    sort(value) {
      capture.sort = value;
      return this;
    },
    skip(value) {
      capture.skip = value;
      return this;
    },
    limit(value) {
      capture.limit = value;
      return this;
    },
    lean() {
      capture.lean = true;
      return Promise.resolve(result);
    }
  };
}

test("product repository uses exact product numbers and escaped product names", async (t) => {
  const capture = {};
  let findFilter;
  let countFilter;
  let detailFilter;

  t.mock.method(Product, "find", (filter) => {
    findFilter = filter;
    return queryReturning([{ productNumber: "BOOK.*" }], capture);
  });
  t.mock.method(Product, "countDocuments", async (filter) => {
    countFilter = filter;
    return 41;
  });
  t.mock.method(Product, "findOne", (filter) => {
    detailFilter = filter;
    return queryReturning({ productNumber: filter.productNumber });
  });

  const result = await productRepository.readProducts({
    page: 3,
    limit: 10,
    productNumber: "BOOK.*",
    name: "API (Design)",
    isActive: false,
    minStock: 4,
    sort: { field: "stockQuantity", direction: 1 }
  });

  assert.deepEqual(findFilter, {
    productNumber: "BOOK.*",
    productName: { $regex: "API \\(Design\\)", $options: "i" },
    isActive: false,
    stockQuantity: { $gte: 4 }
  });
  assert.equal(findFilter.productNumber.$regex, undefined);
  const namePattern = new RegExp(
    findFilter.productName.$regex,
    findFilter.productName.$options
  );
  assert.equal(namePattern.test("Modern API (Design) Guide"), true);
  assert.equal(namePattern.test("API malicious Design"), false);
  assert.deepEqual(countFilter, findFilter);
  assert.deepEqual(capture.sort, { stockQuantity: 1, _id: 1 });
  assert.equal(capture.skip, 20);
  assert.equal(capture.limit, 10);
  assert.equal(capture.lean, true);
  assert.deepEqual(result, {
    items: [{ productNumber: "BOOK.*" }],
    total: 41
  });

  const detail = await productRepository.findProductByProductNumber("BOOK-001");
  assert.deepEqual(detailFilter, { productNumber: "BOOK-001" });
  assert.deepEqual(detail, { productNumber: "BOOK-001" });
});

test("partial product numbers do not match longer stored identifiers", async (t) => {
  const stored = [
    { productNumber: "BOOK-001" },
    { productNumber: "BOOK-002" }
  ];

  t.mock.method(Product, "find", (filter) =>
    queryReturning(
      stored.filter((product) => product.productNumber === filter.productNumber)
    )
  );
  t.mock.method(Product, "countDocuments", async (filter) =>
    stored.filter((product) => product.productNumber === filter.productNumber)
      .length
  );

  const exact = await productRepository.readProducts({
    productNumber: "BOOK-001"
  });
  const partial = await productRepository.readProducts({
    productNumber: "BOOK"
  });

  assert.deepEqual(exact.items, [{ productNumber: "BOOK-001" }]);
  assert.equal(exact.total, 1);
  assert.deepEqual(partial.items, []);
  assert.equal(partial.total, 0);
});

test("product upserts remain idempotent by Shopware ID", async (t) => {
  let bulkOperations;
  let bulkOptions;
  t.mock.method(Product, "bulkWrite", async (operations, options) => {
    bulkOperations = operations;
    bulkOptions = options;
  });

  const product = {
    shopwareId: "sw-product-1",
    productNumber: "BOOK-001",
    productName: "API Design",
    stockQuantity: 2,
    isActive: true,
    netPrice: 10,
    grossPrice: 11.9,
    syncedAt: new Date()
  };
  const savedCount = await productRepository.saveProducts([product]);

  assert.equal(savedCount, 1);
  assert.deepEqual(bulkOptions, { ordered: false });
  assert.deepEqual(bulkOperations, [
    {
      updateOne: {
        filter: { shopwareId: "sw-product-1" },
        update: { $set: product },
        upsert: true
      }
    }
  ]);
});

test("order repository applies exact number and date filters", async (t) => {
  const capture = {};
  let findFilter;
  let countFilter;
  let detailFilter;
  const from = new Date("2026-07-01T00:00:00Z");
  const to = new Date("2026-07-12T23:59:59.999Z");

  t.mock.method(Order, "find", (filter) => {
    findFilter = filter;
    return queryReturning([{ orderNumber: "ORD-1" }], capture);
  });
  t.mock.method(Order, "countDocuments", async (filter) => {
    countFilter = filter;
    return 6;
  });
  t.mock.method(Order, "findOne", (filter) => {
    detailFilter = filter;
    return queryReturning({ orderNumber: filter.orderNumber });
  });

  const result = await orderRepository.readOrders({
    page: 2,
    limit: 5,
    orderNumber: "ORD.+",
    status: "open",
    from,
    to,
    sort: { field: "amountTotal", direction: -1 }
  });

  assert.deepEqual(findFilter, {
    orderNumber: "ORD.+",
    status: "open",
    orderDate: { $gte: from, $lte: to }
  });
  assert.equal(findFilter.orderNumber.$regex, undefined);
  assert.deepEqual(countFilter, findFilter);
  assert.deepEqual(capture.sort, { amountTotal: -1, _id: -1 });
  assert.equal(capture.skip, 5);
  assert.equal(capture.limit, 5);
  assert.deepEqual(result, {
    items: [{ orderNumber: "ORD-1" }],
    total: 6
  });

  const detail = await orderRepository.findOrderByOrderNumber("ORD-1");
  assert.deepEqual(detailFilter, { orderNumber: "ORD-1" });
  assert.deepEqual(detail, { orderNumber: "ORD-1" });
});

test("partial order numbers do not match longer stored identifiers", async (t) => {
  const stored = [{ orderNumber: "ORD-2026-001" }];

  t.mock.method(Order, "find", (filter) =>
    queryReturning(
      stored.filter((order) => order.orderNumber === filter.orderNumber)
    )
  );
  t.mock.method(Order, "countDocuments", async (filter) =>
    stored.filter((order) => order.orderNumber === filter.orderNumber).length
  );

  const exact = await orderRepository.readOrders({
    orderNumber: "ORD-2026-001"
  });
  const partial = await orderRepository.readOrders({ orderNumber: "ORD" });

  assert.deepEqual(exact.items, [{ orderNumber: "ORD-2026-001" }]);
  assert.equal(exact.total, 1);
  assert.deepEqual(partial.items, []);
  assert.equal(partial.total, 0);
});

test("order upserts remain idempotent by Shopware ID", async (t) => {
  let bulkOperations;
  t.mock.method(Order, "bulkWrite", async (operations) => {
    bulkOperations = operations;
  });

  const order = {
    shopwareId: "sw-order-1",
    orderNumber: "ORD-1",
    orderDate: new Date(),
    amountTotal: 11.9,
    amountNet: 10,
    status: "open",
    customerId: "customer-1",
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    lineItems: [
      {
        lineItemId: "line-1",
        productNumber: "BOOK-001",
        productName: "API Design",
        quantity: 1,
        unitPrice: 11.9,
        totalPrice: 11.9
      }
    ],
    syncedAt: new Date()
  };
  const savedCount = await orderRepository.saveOrders([order]);

  assert.equal(savedCount, 1);
  assert.deepEqual(bulkOperations, [
    {
      updateOne: {
        filter: { shopwareId: "sw-order-1" },
        update: { $set: order },
        upsert: true
      }
    }
  ]);
});

test("sync-log repository filters, paginates, and orders run detail logs", async (t) => {
  const listCapture = {};
  const detailCapture = {};
  let listFilter;
  let countFilter;
  let detailId;
  let runFilter;
  const from = new Date("2026-07-01T00:00:00Z");
  const to = new Date("2026-07-12T23:59:59.999Z");

  t.mock.method(SyncLog, "find", (filter) => {
    if (filter.runId && Object.keys(filter).length === 1) {
      runFilter = filter;
      return queryReturning([{ runId: RUN_ID }], detailCapture);
    }
    listFilter = filter;
    return queryReturning([{ runId: RUN_ID }], listCapture);
  });
  t.mock.method(SyncLog, "countDocuments", async (filter) => {
    countFilter = filter;
    return 28;
  });
  t.mock.method(SyncLog, "findById", (id) => {
    detailId = id;
    return queryReturning({ _id: id });
  });

  const result = await syncLogRepository.readSyncLogs({
    page: 2,
    limit: 20,
    entity: "products",
    status: "success",
    runId: RUN_ID,
    from,
    to,
    sort: { field: "durationMs", direction: -1 }
  });

  assert.deepEqual(listFilter, {
    entity: "products",
    status: "success",
    runId: RUN_ID,
    createdAt: { $gte: from, $lte: to }
  });
  assert.deepEqual(countFilter, listFilter);
  assert.deepEqual(listCapture.sort, { durationMs: -1, _id: -1 });
  assert.equal(listCapture.skip, 20);
  assert.equal(listCapture.limit, 20);
  assert.equal(result.total, 28);

  await syncLogRepository.findSyncLogById("507f1f77bcf86cd799439011");
  assert.equal(detailId, "507f1f77bcf86cd799439011");

  await syncLogRepository.findSyncLogsByRunId(RUN_ID);
  assert.deepEqual(runFilter, { runId: RUN_ID });
  assert.deepEqual(detailCapture.sort, { createdAt: 1, _id: 1 });
});

test("unfiltered sync-log lists keep legacy records readable", async (t) => {
  const legacyLog = {
    _id: "507f1f77bcf86cd799439011",
    entity: "products",
    status: "success",
    startedAt: new Date("2026-06-04T06:00:00.000Z"),
    finishedAt: new Date("2026-06-04T06:00:01.000Z"),
    createdAt: new Date("2026-06-04T06:00:01.000Z")
  };
  let listFilter;

  t.mock.method(SyncLog, "find", (filter) => {
    listFilter = filter;
    return queryReturning([legacyLog]);
  });
  t.mock.method(SyncLog, "countDocuments", async () => 1);

  const result = await syncLogRepository.readSyncLogs({});

  assert.deepEqual(listFilter, {});
  assert.deepEqual(result.items, [legacyLog]);
  assert.equal(result.items[0].runId, undefined);
  assert.equal(result.total, 1);
});

test("sync-run repository filters lists and uses atomic running transitions", async (t) => {
  const listCapture = {};
  const updateCaptures = [];
  let listFilter;
  let countFilter;
  let detailFilter;
  const from = new Date("2026-07-01T00:00:00Z");
  const to = new Date("2026-07-12T23:59:59.999Z");

  t.mock.method(SyncRun, "find", (filter) => {
    listFilter = filter;
    return queryReturning([{ runId: RUN_ID }], listCapture);
  });
  t.mock.method(SyncRun, "countDocuments", async (filter) => {
    countFilter = filter;
    return 3;
  });
  t.mock.method(SyncRun, "findOne", (filter) => {
    detailFilter = filter;
    return queryReturning({ runId: filter.runId });
  });
  t.mock.method(SyncRun, "findOneAndUpdate", (filter, update, options) => {
    updateCaptures.push({ filter, update, options });
    return queryReturning({ runId: filter.runId });
  });

  const result = await syncRunRepository.readSyncRuns({
    page: 2,
    limit: 2,
    scope: "all",
    status: "failure",
    from,
    to,
    sort: { field: "durationMs", direction: 1 }
  });

  assert.deepEqual(listFilter, {
    scope: "all",
    status: "failure",
    startedAt: { $gte: from, $lte: to }
  });
  assert.deepEqual(countFilter, listFilter);
  assert.deepEqual(listCapture.sort, { durationMs: 1, _id: 1 });
  assert.equal(listCapture.skip, 2);
  assert.equal(listCapture.limit, 2);
  assert.equal(result.total, 3);

  await syncRunRepository.findSyncRunByRunId(RUN_ID);
  assert.deepEqual(detailFilter, { runId: RUN_ID });

  const finishedAt = new Date();
  await syncRunRepository.completeSyncRun(RUN_ID, {
    finishedAt,
    durationMs: 25,
    summary: { products: 2, orders: 1, total: 3 }
  });
  await syncRunRepository.failSyncRun(RUN_ID, {
    finishedAt,
    durationMs: 25,
    error: "SYNC_FAILED"
  });

  assert.deepEqual(updateCaptures[0].filter, {
    runId: RUN_ID,
    status: "running"
  });
  assert.equal(updateCaptures[0].update.$set.status, "success");
  assert.equal(updateCaptures[0].update.$set.error, null);
  assert.deepEqual(updateCaptures[0].options, {
    new: true,
    runValidators: true
  });
  assert.deepEqual(updateCaptures[1].filter, {
    runId: RUN_ID,
    status: "running"
  });
  assert.equal(updateCaptures[1].update.$set.status, "failure");
  assert.equal(updateCaptures[1].update.$set.error, "SYNC_FAILED");
});

test("latest SyncRun status is grouped dynamically by requested scope", async (t) => {
  let pipeline;
  t.mock.method(SyncRun, "aggregate", async (input) => {
    pipeline = input;
    return [
      { _id: "products", run: { runId: RUN_ID, scope: "products" } },
      { _id: "all", run: { runId: "all-run", scope: "all" } }
    ];
  });

  const result = await syncRunRepository.readLatestRunsByScope([
    "products",
    "orders",
    "all"
  ]);

  assert.deepEqual(pipeline, [
    { $match: { scope: { $in: ["products", "orders", "all"] } } },
    { $sort: { startedAt: -1, _id: -1 } },
    { $group: { _id: "$scope", run: { $first: "$$ROOT" } } }
  ]);
  assert.equal(result.products.scope, "products");
  assert.equal(result.all.scope, "all");
  assert.equal(result.orders, undefined);
  assert.deepEqual(await syncRunRepository.readLatestRunsByScope([]), {});
});
