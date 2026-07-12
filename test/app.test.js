const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://example.invalid/";
process.env.MONGODB_DB_NAME = "FilemakerShopwareIntegration";
process.env.API_KEY = "test-key-that-is-at-least-32-characters";
const app = require("../src/app");

const API_KEY = process.env.API_KEY;

function withApiKey(supertestRequest) {
  return supertestRequest.set("x-api-key", API_KEY);
}

function assertGeneratedRequestId(response) {
  assert.match(
    response.headers["x-request-id"],
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
}

function assertSuccessRequestId(response) {
  assert.equal(response.body.success, true);
  assert.equal(response.body.requestId, response.headers["x-request-id"]);
}

function assertError(response, code) {
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, code);
  assert.equal(
    response.body.error.requestId,
    response.headers["x-request-id"]
  );
}

test("root endpoint returns versioned metadata and a generated request ID", async () => {
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assertSuccessRequestId(response);
  assertGeneratedRequestId(response);
  assert.equal(response.body.data.persistence, "mongodb");
  assert.equal(response.body.data.apiVersion, "v1");
});

test("liveness preserves a safe caller request ID", async () => {
  const response = await request(app)
    .get("/api/health")
    .set("x-request-id", "fm-dashboard:health-42");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-request-id"], "fm-dashboard:health-42");
  assert.equal(response.body.requestId, "fm-dashboard:health-42");
  assert.equal(response.body.data.status, "healthy");
});

test("unsafe caller request IDs are replaced", async () => {
  const response = await request(app)
    .get("/")
    .set("x-request-id", "unsafe/request/id");

  assert.equal(response.status, 200);
  assert.notEqual(response.headers["x-request-id"], "unsafe/request/id");
  assertSuccessRequestId(response);
  assertGeneratedRequestId(response);
});

test("readiness returns a safe 503 with the request ID", async (t) => {
  t.mock.method(console, "error", () => {});
  const response = await request(app)
    .get("/api/ready")
    .set("x-request-id", "readiness-request");

  assert.equal(response.status, 503);
  assertError(response, "SERVICE_NOT_READY");
  assert.equal(response.body.error.requestId, "readiness-request");
});

test("protected endpoint rejects missing API key", async () => {
  const response = await request(app)
    .get("/api/v1/products")
    .set("x-request-id", "missing-key");

  assert.equal(response.status, 401);
  assertError(response, "UNAUTHORIZED");
});

test("protected endpoint rejects incorrect API key", async () => {
  const response = await request(app)
    .get("/api/v1/products")
    .set("x-api-key", "incorrect")
    .set("x-request-id", "incorrect-key");

  assert.equal(response.status, 401);
  assertError(response, "UNAUTHORIZED");
});

test("protected endpoint safely rejects a multibyte API key", async () => {
  const invalid = `${"x".repeat(API_KEY.length - 1)}\u00e9`;
  const response = await request(app)
    .get("/api/v1/products")
    .set("x-api-key", invalid);

  assert.equal(response.status, 401);
  assertError(response, "UNAUTHORIZED");
});

test("unknown route returns JSON 404", async () => {
  const response = await request(app)
    .get("/missing")
    .set("x-request-id", "missing-route");

  assert.equal(response.status, 404);
  assertError(response, "ROUTE_NOT_FOUND");
  assert.equal(response.body.error.requestId, "missing-route");
});

test("unknown authorized v1 route returns JSON 404", async () => {
  const response = await withApiKey(request(app).get("/api/v1/missing"));

  assert.equal(response.status, 404);
  assertError(response, "ROUTE_NOT_FOUND");
});

test("invalid limit returns 400 with a valid API key", async () => {
  const response = await withApiKey(
    request(app).get("/api/v1/products?limit=101")
  );

  assert.equal(response.status, 400);
  assertError(response, "INVALID_QUERY");
});

test("repeated query parameters return INVALID_QUERY", async (t) => {
  t.mock.method(console, "error", () => {});
  const response = await withApiKey(
    request(app).get("/api/v1/products?page=1&page=2")
  );

  assert.equal(response.status, 400);
  assertError(response, "INVALID_QUERY");
});

test("malformed and oversized JSON bodies return stable errors", async (t) => {
  t.mock.method(console, "error", () => {});

  const malformed = await withApiKey(
    request(app)
      .post("/api/v1/sync/all")
      .set("content-type", "application/json")
      .set("x-request-id", "malformed-json")
      .send('{"broken"')
  );
  assert.equal(malformed.status, 400);
  assertError(malformed, "INVALID_QUERY");
  assert.equal(malformed.body.error.requestId, "malformed-json");

  const oversized = await withApiKey(
    request(app)
      .post("/api/v1/sync/all")
      .set("x-request-id", "oversized-json")
      .send({ payload: "x".repeat(103_000) })
  );
  assert.equal(oversized.status, 413);
  assertError(oversized, "PAYLOAD_TOO_LARGE");
  assert.equal(oversized.body.error.requestId, "oversized-json");
});

test("malformed paths and unsupported request encodings return stable errors", async (t) => {
  t.mock.method(console, "error", () => {});

  const malformedPath = await withApiKey(
    request(app)
      .get("/api/v1/products/%E0%A4%A")
      .set("x-request-id", "malformed-path")
  );
  assert.equal(malformedPath.status, 400);
  assertError(malformedPath, "INVALID_IDENTIFIER");
  assert.equal(malformedPath.body.error.requestId, "malformed-path");

  const unsupportedCharset = await withApiKey(
    request(app)
      .post("/api/v1/sync/all")
      .set("content-type", "application/json; charset=iso-8859-1")
      .set("x-request-id", "unsupported-charset")
      .send("{}")
  );
  assert.equal(unsupportedCharset.status, 415);
  assertError(unsupportedCharset, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal(
    unsupportedCharset.body.error.requestId,
    "unsupported-charset"
  );

  const invalidGzip = await withApiKey(
    request(app)
      .post("/api/v1/sync/all")
      .set("content-type", "application/json")
      .set("content-encoding", "gzip")
      .set("x-request-id", "invalid-gzip")
      .send("not-a-gzip-stream")
  );
  assert.equal(invalidGzip.status, 400);
  assertError(invalidGzip, "INVALID_REQUEST");
  assert.equal(invalidGzip.body.error.requestId, "invalid-gzip");
});

test("obsolete unversioned operational routes are inactive", async () => {
  const routes = [
    ["get", "/api/products"],
    ["post", "/api/products/sync"],
    ["get", "/api/orders"],
    ["post", "/api/orders/sync"],
    ["get", "/api/sync/logs"],
    ["get", "/api/sync-status"],
    ["post", "/api/sync/all"]
  ];

  for (const [method, path] of routes) {
    const response = await request(app)
      [method](path)
      .set("x-api-key", API_KEY);
    assert.equal(response.status, 404, `${method.toUpperCase()} ${path}`);
    assertError(response, "ROUTE_NOT_FOUND");
  }
});
