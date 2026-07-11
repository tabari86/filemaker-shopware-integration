const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://example.invalid/";
process.env.MONGODB_DB_NAME = "FilemakerShopwareIntegration";
process.env.API_KEY = "test-key-that-is-at-least-32-characters";
const app = require("../src/app");

test("root endpoint returns metadata", async () => {
  const response = await request(app).get("/");
  assert.equal(response.status, 200);
  assert.equal(response.body.persistence, "MongoDB");
});

test("liveness endpoint returns 200", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
});

test("readiness returns 503 without a database", async () => {
  const response = await request(app).get("/api/ready");
  assert.equal(response.status, 503);
});

test("protected endpoint rejects missing API key", async () => {
  const response = await request(app).get("/api/products");
  assert.equal(response.status, 401);
});

test("protected endpoint rejects incorrect API key", async () => {
  const response = await request(app)
    .get("/api/products")
    .set("x-api-key", "incorrect");
  assert.equal(response.status, 401);
});

test("protected endpoint safely rejects a multibyte API key", async () => {
  const invalid = `${"x".repeat(process.env.API_KEY.length - 1)}\u00e9`;
  const response = await request(app)
    .get("/api/products")
    .set("x-api-key", invalid);
  assert.equal(response.status, 401);
});

test("unknown route returns JSON 404", async () => {
  const response = await request(app).get("/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    success: false,
    error: { message: "Route not found" }
  });
});

test("unknown API route returns JSON 404", async () => {
  const response = await request(app).get("/api/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    success: false,
    error: { message: "Route not found" }
  });
});

test("invalid limit returns 400 with a valid API key", async () => {
  const response = await request(app)
    .get("/api/products?limit=101")
    .set("x-api-key", process.env.API_KEY);
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});
