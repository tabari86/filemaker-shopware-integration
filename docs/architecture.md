# Architecture

## Historical system

The original private project used FileMaker dashboard scripts to exchange business data with a live Shopware installation. That production history motivates this repository's layering, but the public application does not connect to either system.

## Integration service reconstruction

This production-oriented service reconstruction runs Express 5 on Node.js and is useful for technical and portfolio review. Fixed simulated Shopware services provide products and orders, mappers translate them, synchronization services coordinate MongoDB Atlas-backed repositories, and every run records success or failure. It has no live Shopware or FileMaker connection and has not been deployed to Render.

```text
Client or FileMaker-style trigger
  -> Render / Express
  -> request-ID and API-key middleware
  -> public Swagger UI and central OpenAPI JSON
  -> versioned operational routes
  -> simulated Shopware source, mappers, sync services
  -> MongoDB repositories
  -> MongoDB Atlas
```

MongoDB Atlas supplies durable persistence. JSON files under `data/` are static review examples only; synchronization never reads or modifies them. Unique indexes and upserts make repeated product and order imports idempotent.

Public liveness and MongoDB readiness endpoints support operations. Public `/api-docs` serves Swagger UI and `/api-docs.json` serves the exact central `docs/openapi.json` contract; both are mounted before API-key, 404, and error routing. Protected operational endpoints live only under `/api/v1` and require `x-api-key`; the former unversioned operational routes are inactive. Request-ID middleware runs before parsing and routing, so every response carries an `x-request-id` header. Startup validates configuration, connects, and initializes all Product, Order, SyncLog, and SyncRun indexes before listening. Shutdown closes HTTP and MongoDB cleanly.

The OpenAPI 3.0.3 document explicitly inventories all 17 operations and reuses component parameters, response headers, error responses, and data schemas. `swagger-ui-express` renders the document, while `@apidevtools/swagger-parser` validates syntax, references, endpoint coverage, security, parameters, and response contracts during tests. No annotation-based `swagger-jsdoc` generation is used.

## Run and log lifecycle

Each `POST /api/v1/sync/products`, `POST /api/v1/sync/orders`, or `POST /api/v1/sync/all` request creates exactly one top-level `SyncRun`. A run has a public UUID `runId`, the HTTP `requestId`, a `products`, `orders`, or `all` scope, a running/success/failure state, timing fields, and a terminal summary or safe `SYNC_FAILED` code.

Entity work writes `SyncLog` records. A single-entity request writes one correlated entity log. Full sync invokes the low-level product and order flows sequentially with the same context and then writes a dashboard summary log, so all three records share the top-level run's `runId`, `requestId`, and trigger. It does not call the child HTTP-level wrappers and therefore does not create child runs.

Run detail orders correlated logs by persisted `createdAt` ascending, then `_id` ascending when creation timestamps are equal. Lifecycle fields such as `startedAt`, `finishedAt`, and `durationMs` remain unchanged and describe execution rather than document insertion order. Legacy SyncLogs without correlation metadata remain readable through general log list/detail queries but do not appear beneath a SyncRun.

`POST /api/v1/sync/all` models the trigger concept of the historical FileMaker dashboard. It is not a live FileMaker connection. Failures attempt safe persistent logging and a terminal run transition before propagating to centralized error handling; raw source or database errors, stacks, and credentials are not returned.

List repositories build bounded pagination, allowlisted filters and sorts, exact product/order number predicates, an escaped case-insensitive product-name search, and deterministic `_id` tie-breaks. Detail routes use the unique business number for products and orders, MongoDB ObjectId for logs, and UUID `runId` for runs. Synchronization status is calculated from the newest `SyncRun` in the `products`, `orders`, and `all` scopes, with `never-run` when a scope has no run.
