const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://example.invalid/";
process.env.MONGODB_DB_NAME = "FilemakerShopwareIntegration";
process.env.API_KEY = "test-key-that-is-at-least-32-characters";

const openapiDocument = require("../docs/openapi.json");
const app = require("../src/app");

test("Swagger UI is public, titled, and resolves assets under /api-docs", async () => {
  const requestId = "swagger-ui-request";
  const response = await request(app)
    .get("/api-docs")
    .set("x-request-id", requestId);

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /^text\/html/);
  assert.equal(response.headers["x-request-id"], requestId);
  assert.match(response.text, /<title>FileMaker-Shopware Integration API<\/title>/);
  assert.match(response.text, /<base href="\/api-docs\/">/);
  assert.match(response.text, /swagger-ui-bundle\.js/);

  const css = await request(app)
    .get("/api-docs/swagger-ui.css")
    .set("x-request-id", "swagger-css-request");
  assert.equal(css.status, 200);
  assert.match(css.headers["content-type"], /^text\/css/);
  assert.equal(css.headers["x-request-id"], "swagger-css-request");

  const init = await request(app)
    .get("/api-docs/swagger-ui-init.js")
    .set("x-request-id", "swagger-init-request");
  assert.equal(init.status, 200);
  assert.match(init.headers["content-type"], /javascript/);
  assert.equal(init.headers["x-request-id"], "swagger-init-request");
  assert.match(init.text, /ApiKeyAuth/);
});

test("raw OpenAPI JSON is public, exact, and request-ID correlated", async () => {
  const requestId = "openapi-json-request";
  const response = await request(app)
    .get("/api-docs.json")
    .set("x-request-id", requestId);

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /^application\/json/);
  assert.equal(response.headers["x-request-id"], requestId);
  assert.deepEqual(response.body, openapiDocument);
  assert.equal(response.body.openapi, "3.0.3");
});

test("unknown documentation subpaths use the normal JSON 404", async () => {
  const requestId = "missing-docs-request";
  const response = await request(app)
    .get("/api-docs/not-a-real-asset")
    .set("x-request-id", requestId);

  assert.equal(response.status, 404);
  assert.equal(response.headers["x-request-id"], requestId);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      requestId
    }
  });
});
