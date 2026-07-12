const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const SwaggerParser = require("@apidevtools/swagger-parser");

const document = require("../docs/openapi.json");
const documentPath = path.resolve(__dirname, "../docs/openapi.json");
const METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);
const EXPECTED_OPERATIONS = [
  "GET /",
  "GET /api/health",
  "GET /api/ready",
  "GET /api-docs",
  "GET /api-docs.json",
  "GET /api/v1/products",
  "GET /api/v1/products/{productNumber}",
  "POST /api/v1/sync/products",
  "GET /api/v1/orders",
  "GET /api/v1/orders/{orderNumber}",
  "POST /api/v1/sync/orders",
  "POST /api/v1/sync/all",
  "GET /api/v1/sync/status",
  "GET /api/v1/sync/logs",
  "GET /api/v1/sync/logs/{logId}",
  "GET /api/v1/sync/runs",
  "GET /api/v1/sync/runs/{runId}"
].sort();

function operations() {
  return Object.entries(document.paths).flatMap(([route, pathItem]) =>
    Object.entries(pathItem)
      .filter(([method]) => METHODS.has(method))
      .map(([method, operation]) => ({
        key: `${method.toUpperCase()} ${route}`,
        route,
        method,
        operation
      }))
  );
}

function resolveRef(value) {
  if (!value?.$ref) return value;
  assert.match(value.$ref, /^#\//, `non-local ref ${value.$ref}`);
  return value.$ref
    .slice(2)
    .split("/")
    .reduce(
      (current, segment) => current[segment.replace(/~1/g, "/").replace(/~0/g, "~")],
      document
    );
}

function parameter(route, method, name, location) {
  const operation = document.paths[route][method];
  const found = operation.parameters
    .map(resolveRef)
    .find((entry) => entry.name === name && entry.in === location);
  assert.ok(found, `${method.toUpperCase()} ${route} missing ${location} ${name}`);
  return found;
}

function queryNames(route, method) {
  return document.paths[route][method].parameters
    .map(resolveRef)
    .filter((entry) => entry.in === "query")
    .map((entry) => entry.name)
    .sort();
}

test("the exact OpenAPI file is valid OpenAPI 3.0.3 with resolvable refs", async () => {
  const validated = await SwaggerParser.validate(documentPath);
  assert.equal(validated.openapi, "3.0.3");
  assert.equal(document.openapi, "3.0.3");
  assert.equal(document.info.title, "FileMaker–Shopware Integration API");
  assert.equal(document.info.version, "1.0.0");
  assert.deepEqual(document.servers, [{ url: "/", description: "Current host" }]);
  for (const phrase of [
    /production-oriented/i,
    /simulated/i,
    /MongoDB Atlas/i,
    /no live Shopware/i,
    /no live FileMaker/i,
    /request IDs/i,
    /synchronously/i,
    /no real customer data/i
  ]) assert.match(document.info.description, phrase);
});

test("the document contains exactly the approved 17 operations", () => {
  const actual = operations().map(({ key }) => key).sort();
  assert.equal(actual.length, 17);
  assert.deepEqual(actual, EXPECTED_OPERATIONS);
  for (const obsolete of [
    "/api/products",
    "/api/orders",
    "/api/sync/all",
    "/api/sync-status"
  ]) assert.equal(document.paths[obsolete], undefined);
  assert.deepEqual(
    document.tags.map(({ name }) => name),
    ["Service", "Health", "Documentation", "Products", "Orders", "Synchronization"]
  );
});

test("ApiKeyAuth protects every v1 operation and no public operation", () => {
  assert.deepEqual(document.components.securitySchemes.ApiKeyAuth, {
    type: "apiKey",
    in: "header",
    name: "x-api-key",
    description: document.components.securitySchemes.ApiKeyAuth.description
  });

  for (const { key, route, operation } of operations()) {
    if (route.startsWith("/api/v1")) {
      assert.deepEqual(operation.security, [{ ApiKeyAuth: [] }], key);
      assert.ok(operation.responses["401"], `${key} missing 401 response`);
    } else {
      assert.ok(
        operation.security === undefined || operation.security.length === 0,
        `${key} must be public`
      );
    }
  }

  const serialized = JSON.stringify(document);
  assert.doesNotMatch(serialized, /test-key-that-is-at-least-32-characters/i);
  assert.doesNotMatch(serialized, /mongodb\+srv:\/\//i);
  assert.doesNotMatch(serialized, /apiKeyValue|preauthorizeApiKey/i);
  assert.equal(document.components.securitySchemes.ApiKeyAuth.example, undefined);
  assert.equal(document.components.securitySchemes.ApiKeyAuth.default, undefined);
});

test("every operation and response documents the reusable request ID contract", () => {
  const requestParameter = document.components.parameters.RequestId;
  assert.equal(requestParameter.name, "x-request-id");
  assert.equal(requestParameter.in, "header");
  assert.equal(requestParameter.required, false);
  assert.equal(resolveRef(requestParameter.schema).minLength, 1);
  assert.equal(resolveRef(requestParameter.schema).maxLength, 100);
  assert.equal(resolveRef(requestParameter.schema).pattern, "^[A-Za-z0-9_.:-]+$");
  assert.match(requestParameter.description, /replaced by a generated UUID/i);

  for (const { key, operation } of operations()) {
    assert.ok(
      operation.parameters.some(
        (entry) => entry.$ref === "#/components/parameters/RequestId"
      ),
      `${key} missing reusable request header`
    );
    for (const [status, rawResponse] of Object.entries(operation.responses)) {
      const response = resolveRef(rawResponse);
      assert.equal(
        response.headers?.["X-Request-Id"]?.$ref,
        "#/components/headers/X-Request-Id",
        `${key} ${status} missing reusable response header`
      );
    }
  }

  const errorDetail = document.components.schemas.ErrorDetail;
  assert.ok(errorDetail.required.includes("requestId"));
  assert.equal(
    errorDetail.properties.requestId.$ref,
    "#/components/schemas/RequestId"
  );
});

test("product query parameters match exact runtime constraints", () => {
  const route = "/api/v1/products";
  assert.deepEqual(queryNames(route, "get"), [
    "isActive",
    "limit",
    "minStock",
    "name",
    "page",
    "productNumber",
    "sort"
  ]);
  const page = parameter(route, "get", "page", "query").schema;
  const limit = parameter(route, "get", "limit", "query").schema;
  assert.deepEqual(
    { minimum: page.minimum, default: page.default },
    { minimum: 1, default: 1 }
  );
  assert.deepEqual(
    { minimum: limit.minimum, maximum: limit.maximum, default: limit.default },
    { minimum: 1, maximum: 100, default: 25 }
  );

  const number = parameter(route, "get", "productNumber", "query");
  assert.equal(number.schema.maxLength, 100);
  assert.match(number.description, /exact/i);
  assert.match(number.description, /partial values do not match/i);
  const name = parameter(route, "get", "name", "query");
  assert.equal(name.schema.maxLength, 100);
  assert.match(name.description, /escaped/i);
  assert.match(name.description, /case-insensitive/i);
  assert.match(name.description, /partial|contains/i);
  assert.equal(parameter(route, "get", "isActive", "query").schema.type, "boolean");
  assert.equal(parameter(route, "get", "minStock", "query").schema.minimum, 0);
  assert.deepEqual(parameter(route, "get", "sort", "query").schema, {
    type: "string",
    enum: [
      "productName",
      "-productName",
      "stockQuantity",
      "-stockQuantity",
      "syncedAt",
      "-syncedAt"
    ],
    default: "-syncedAt"
  });
});

test("order query parameters match exact runtime constraints", () => {
  const route = "/api/v1/orders";
  assert.deepEqual(queryNames(route, "get"), [
    "from",
    "limit",
    "orderNumber",
    "page",
    "sort",
    "status",
    "to"
  ]);
  const number = parameter(route, "get", "orderNumber", "query");
  assert.equal(number.schema.maxLength, 100);
  assert.match(number.description, /exact/i);
  assert.match(number.description, /partial values do not match/i);
  const status = parameter(route, "get", "status", "query");
  assert.equal(status.schema.maxLength, 50);
  assert.match(status.description, /lowercase-normalized exact/i);
  const from = parameter(route, "get", "from", "query");
  assert.match(from.description, /ISO date or datetime/i);
  assert.match(from.description, /must not be later/i);
  assert.deepEqual(from.schema.oneOf, [
    { type: "string", format: "date" },
    { type: "string", format: "date-time" }
  ]);
  assert.match(parameter(route, "get", "to", "query").description, /full UTC day/i);
  assert.deepEqual(parameter(route, "get", "sort", "query").schema, {
    type: "string",
    enum: [
      "orderDate",
      "-orderDate",
      "amountTotal",
      "-amountTotal",
      "syncedAt",
      "-syncedAt"
    ],
    default: "-orderDate"
  });
});

test("log and run list parameters preserve their distinct time contracts", () => {
  assert.deepEqual(queryNames("/api/v1/sync/logs", "get"), [
    "entity", "from", "limit", "page", "runId", "sort", "status", "to"
  ]);
  assert.deepEqual(
    parameter("/api/v1/sync/logs", "get", "entity", "query").schema.enum,
    ["products", "orders", "dashboard"]
  );
  assert.deepEqual(
    parameter("/api/v1/sync/logs", "get", "status", "query").schema.enum,
    ["success", "failure"]
  );
  assert.equal(
    parameter("/api/v1/sync/logs", "get", "runId", "query").schema.format,
    "uuid"
  );
  assert.deepEqual(
    parameter("/api/v1/sync/logs", "get", "sort", "query").schema,
    {
      type: "string",
      enum: ["createdAt", "-createdAt", "durationMs", "-durationMs"],
      default: "-createdAt"
    }
  );

  assert.deepEqual(queryNames("/api/v1/sync/runs", "get"), [
    "from", "limit", "page", "scope", "sort", "status", "to"
  ]);
  assert.deepEqual(
    parameter("/api/v1/sync/runs", "get", "scope", "query").schema.enum,
    ["products", "orders", "all"]
  );
  assert.deepEqual(
    parameter("/api/v1/sync/runs", "get", "status", "query").schema.enum,
    ["running", "success", "failure"]
  );
  const runSort = parameter("/api/v1/sync/runs", "get", "sort", "query");
  assert.deepEqual(runSort.schema, {
    type: "string",
    enum: ["startedAt", "-startedAt", "durationMs", "-durationMs"],
    default: "-startedAt"
  });
  assert.match(runSort.description, /startedAt remains the lifecycle/i);
});

test("path parameters and run-detail ordering are explicit", () => {
  const productNumber = parameter(
    "/api/v1/products/{productNumber}",
    "get",
    "productNumber",
    "path"
  );
  const orderNumber = parameter(
    "/api/v1/orders/{orderNumber}",
    "get",
    "orderNumber",
    "path"
  );
  assert.equal(productNumber.required, true);
  assert.equal(productNumber.schema.minLength, 1);
  assert.equal(productNumber.schema.maxLength, 100);
  assert.equal(orderNumber.required, true);
  assert.equal(orderNumber.schema.maxLength, 100);
  assert.equal(
    parameter("/api/v1/sync/logs/{logId}", "get", "logId", "path").schema.pattern,
    "^[0-9a-fA-F]{24}$"
  );
  assert.equal(
    parameter("/api/v1/sync/runs/{runId}", "get", "runId", "path").schema.format,
    "uuid"
  );
  const description = document.paths["/api/v1/sync/runs/{runId}"].get.description;
  assert.match(description, /createdAt ascending/i);
  assert.match(description, /_id ascending/i);
  assert.match(description, /startedAt remains execution lifecycle/i);
});

test("component schemas match exposed Mongo and synchronization shapes", () => {
  const required = [
    "ServiceMetadata", "HealthResponse", "ReadyResponse", "ErrorDetail",
    "ErrorResponse", "Pagination", "Product", "ProductListResponse",
    "ProductDetailResponse", "OrderLineItem", "Order", "OrderListResponse",
    "OrderDetailResponse", "SyncRunSummary", "SyncRun", "SyncLog",
    "SyncStatusEntry", "SyncStatusResponse", "SyncLogListResponse",
    "SyncLogDetailResponse", "SyncRunListResponse", "SyncRunDetailResponse",
    "SynchronizationResponse"
  ];
  for (const name of required) assert.ok(document.components.schemas[name], name);

  for (const name of ["Product", "Order", "SyncRun", "SyncLog"]) {
    const schema = document.components.schemas[name];
    for (const field of ["_id", "createdAt", "updatedAt"]) {
      assert.ok(schema.properties[field], `${name}.${field}`);
    }
    assert.equal(schema.properties.__v, undefined, `${name} must not expose __v`);
  }

  const syncLog = document.components.schemas.SyncLog;
  for (const optional of ["runId", "requestId", "trigger", "durationMs"]) {
    assert.ok(syncLog.properties[optional]);
    assert.ok(!syncLog.required.includes(optional), `legacy ${optional} must be optional`);
  }
  for (const lifecycle of ["startedAt", "finishedAt"]) {
    assert.ok(syncLog.required.includes(lifecycle));
  }

  const syncRun = document.components.schemas.SyncRun;
  assert.equal(syncRun.properties.finishedAt.nullable, true);
  assert.equal(syncRun.properties.durationMs.nullable, true);
  assert.equal(syncRun.properties.summary.nullable, true);
  const status = document.components.schemas.SyncStatusEntry;
  assert.equal(status.properties.lastRunAt.nullable, true);
  assert.equal(status.properties.runId.nullable, true);

  const execution = document.components.schemas.SyncExecution;
  assert.equal(execution.properties._id, undefined);
  assert.equal(execution.properties.createdAt, undefined);
  assert.equal(execution.properties.updatedAt, undefined);
});

test("success responses reference the documented runtime response schemas", () => {
  const expected = new Map([
    ["GET /", "#/components/schemas/ServiceMetadata"],
    ["GET /api/health", "#/components/schemas/HealthResponse"],
    ["GET /api/ready", "#/components/schemas/ReadyResponse"],
    ["GET /api/v1/products", "#/components/schemas/ProductListResponse"],
    ["GET /api/v1/products/{productNumber}", "#/components/schemas/ProductDetailResponse"],
    ["GET /api/v1/orders", "#/components/schemas/OrderListResponse"],
    ["GET /api/v1/orders/{orderNumber}", "#/components/schemas/OrderDetailResponse"],
    ["POST /api/v1/sync/products", "#/components/schemas/SynchronizationResponse"],
    ["POST /api/v1/sync/orders", "#/components/schemas/SynchronizationResponse"],
    ["POST /api/v1/sync/all", "#/components/schemas/SynchronizationResponse"],
    ["GET /api/v1/sync/status", "#/components/schemas/SyncStatusResponse"],
    ["GET /api/v1/sync/logs", "#/components/schemas/SyncLogListResponse"],
    ["GET /api/v1/sync/logs/{logId}", "#/components/schemas/SyncLogDetailResponse"],
    ["GET /api/v1/sync/runs", "#/components/schemas/SyncRunListResponse"],
    ["GET /api/v1/sync/runs/{runId}", "#/components/schemas/SyncRunDetailResponse"]
  ]);

  for (const { key, operation } of operations()) {
    if (!expected.has(key)) continue;
    const response = resolveRef(operation.responses["200"]);
    assert.equal(
      response.content["application/json"].schema.$ref,
      expected.get(key),
      key
    );
  }
  for (const route of [
    "/api/v1/sync/products",
    "/api/v1/sync/orders",
    "/api/v1/sync/all"
  ]) {
    assert.ok(document.paths[route].post.responses["200"]);
    assert.equal(document.paths[route].post.responses["202"], undefined);
  }
  assert.ok(document.paths["/api/ready"].get.responses["503"]);
});
