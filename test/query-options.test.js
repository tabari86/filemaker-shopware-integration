const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPagination,
  escapeRegex,
  parseIdentifier,
  parseObjectIdIdentifier,
  parseOrderQuery,
  parseProductQuery,
  parseSyncLogQuery,
  parseSyncRunQuery,
  parseUuidIdentifier
} = require("../src/utils/query-options");

const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";

function assertApiError(fn, code, messagePattern) {
  assert.throws(fn, (error) => {
    assert.equal(error.status, 400);
    assert.equal(error.code, code);
    if (messagePattern) assert.match(error.message, messagePattern);
    return true;
  });
}

test("product query defaults and filters are deterministic", () => {
  assert.deepEqual(parseProductQuery({}), {
    page: 1,
    limit: 25,
    productNumber: undefined,
    name: undefined,
    isActive: undefined,
    minStock: undefined,
    sort: { field: "syncedAt", direction: -1 }
  });

  assert.deepEqual(
    parseProductQuery({
      page: "2",
      limit: "100",
      productNumber: " BOOK ",
      name: " API Design ",
      isActive: "false",
      minStock: "0",
      sort: "productName"
    }),
    {
      page: 2,
      limit: 100,
      productNumber: "BOOK",
      name: "API Design",
      isActive: false,
      minStock: 0,
      sort: { field: "productName", direction: 1 }
    }
  );
});

test("product query rejects unsupported, repeated, and out-of-range values", () => {
  assertApiError(
    () => parseProductQuery({ unknown: "value" }),
    "INVALID_QUERY",
    /Unsupported query parameter/
  );
  assertApiError(
    () => parseProductQuery({ page: ["1", "2"] }),
    "INVALID_QUERY",
    /exactly once/
  );
  assertApiError(
    () => parseProductQuery({ page: "0" }),
    "INVALID_QUERY",
    /at least 1/
  );
  assertApiError(
    () => parseProductQuery({ limit: "101" }),
    "INVALID_QUERY",
    /1 to 100/
  );
  assertApiError(
    () => parseProductQuery({ isActive: "TRUE" }),
    "INVALID_QUERY",
    /true, false/
  );
  assertApiError(
    () => parseProductQuery({ minStock: "-1" }),
    "INVALID_QUERY",
    /integer/
  );
  assertApiError(
    () => parseProductQuery({ sort: "netPrice" }),
    "INVALID_QUERY",
    /sort must be one of/
  );
});

test("order query normalizes status and validates ISO date ranges", () => {
  const options = parseOrderQuery({
    orderNumber: " ORD ",
    status: "OPEN",
    from: "2024-02-29",
    to: "2026-07-12",
    sort: "-amountTotal"
  });

  assert.equal(options.orderNumber, "ORD");
  assert.equal(options.status, "open");
  assert.equal(options.from.toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(options.to.toISOString(), "2026-07-12T23:59:59.999Z");
  assert.deepEqual(options.sort, { field: "amountTotal", direction: -1 });

  assertApiError(
    () => parseOrderQuery({ from: "2026-02-29" }),
    "INVALID_QUERY",
    /valid ISO date/
  );
  assertApiError(
    () => parseOrderQuery({ from: "2026-07-13", to: "2026-07-12" }),
    "INVALID_QUERY",
    /must not be later/
  );
  assertApiError(
    () => parseOrderQuery({ from: "2026-07-12T12:00" }),
    "INVALID_QUERY",
    /valid ISO date/
  );
});

test("sync-log query validates filters, UUIDs, and sorting", () => {
  const options = parseSyncLogQuery({
    entity: "dashboard",
    status: "failure",
    runId: RUN_ID,
    from: "2026-07-12T12:00:00Z",
    sort: "durationMs"
  });

  assert.equal(options.entity, "dashboard");
  assert.equal(options.status, "failure");
  assert.equal(options.runId, RUN_ID);
  assert.equal(options.from.toISOString(), "2026-07-12T12:00:00.000Z");
  assert.deepEqual(options.sort, { field: "durationMs", direction: 1 });

  assertApiError(
    () => parseSyncLogQuery({ entity: "all" }),
    "INVALID_QUERY",
    /products, orders, dashboard/
  );
  assertApiError(
    () => parseSyncLogQuery({ status: "running" }),
    "INVALID_QUERY",
    /success, failure/
  );
  assertApiError(
    () => parseSyncLogQuery({ runId: "not-a-uuid" }),
    "INVALID_QUERY",
    /valid UUID/
  );
});

test("sync-run query validates scopes and statuses", () => {
  assert.deepEqual(
    parseSyncRunQuery({ scope: "all", status: "running", sort: "startedAt" }),
    {
      page: 1,
      limit: 25,
      scope: "all",
      status: "running",
      from: undefined,
      to: undefined,
      sort: { field: "startedAt", direction: 1 }
    }
  );

  assertApiError(
    () => parseSyncRunQuery({ scope: "dashboard" }),
    "INVALID_QUERY",
    /products, orders, all/
  );
  assertApiError(
    () => parseSyncRunQuery({ status: "cancelled" }),
    "INVALID_QUERY",
    /running, success, failure/
  );
});

test("detail identifiers use stable INVALID_IDENTIFIER errors", () => {
  assert.equal(parseIdentifier(" BOOK-001 ", "productNumber"), "BOOK-001");
  assert.equal(parseUuidIdentifier(RUN_ID), RUN_ID);
  assert.equal(
    parseObjectIdIdentifier("507f1f77bcf86cd799439011"),
    "507f1f77bcf86cd799439011"
  );

  assertApiError(
    () => parseIdentifier("   ", "productNumber"),
    "INVALID_IDENTIFIER",
    /productNumber/
  );
  assertApiError(
    () => parseUuidIdentifier("not-a-uuid"),
    "INVALID_IDENTIFIER",
    /runId/
  );
  assertApiError(
    () => parseObjectIdIdentifier("not-an-object-id"),
    "INVALID_IDENTIFIER",
    /logId/
  );
});

test("pagination metadata and regex escaping are stable", () => {
  assert.deepEqual(buildPagination(1, 25, 0), {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  });
  assert.deepEqual(buildPagination(3, 10, 21), {
    page: 3,
    limit: 10,
    total: 21,
    totalPages: 3
  });
  assert.equal(escapeRegex("BOOK.*(1)"), "BOOK\\.\\*\\(1\\)");
});
