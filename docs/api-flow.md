# API flows

Public liveness returns 200 independently of MongoDB. Readiness performs a real database ping and returns 200 or safe 503 JSON. Swagger UI at `/api-docs` and the exact OpenAPI 3.0.3 document at `/api-docs.json` are also public. Operational endpoints are active under `/api/v1` only and require `x-api-key`; missing or invalid keys return 401.

Request-ID middleware accepts `x-request-id` values containing 1 to 100 safe alphanumeric or `_.:-` characters. Missing or unsafe values are replaced with a UUID. The chosen value is returned in every response header. Service and operational success envelopes use `{ success, requestId, data }`; errors use `{ success: false, error: { code, message, requestId } }`. `/api-docs.json` remains the unwrapped source contract and uses the header for correlation.

## OpenAPI and Swagger

`docs/openapi.json` is the single OpenAPI source. It documents exactly 17 operations: five public service/health/documentation operations and twelve protected API v1 operations. The contract defines `ApiKeyAuth` as the `x-api-key` header, the reusable request-ID request/response contract, all query/path constraints, serialized MongoDB fields, nullable run/status fields, and optional legacy SyncLog correlation fields. Swagger UI exposes Authorize without storing or supplying a real key.

## Synchronization

Product and order syncs read fixed simulated Shopware arrays, map records, and use MongoDB `bulkWrite` upserts. Repeating a sync updates records instead of duplicating them; an empty source processes zero records.

Each HTTP sync request first creates one running `SyncRun`. Single-entity flows write a correlated product or order log and then complete the run with a summary. Full sync creates one `all` run, passes its `runId`, `requestId`, and trigger through both low-level entity flows, writes a dashboard summary log, and completes that same run. Full sync never creates product or order child runs.

Run detail returns correlated logs in persisted `createdAt` ascending order with `_id` as a deterministic tie-breaker. `startedAt`, `finishedAt`, and `durationMs` retain their separate execution-lifecycle meanings. Legacy pre-run-tracking logs remain readable in general log list and detail responses but cannot be associated with a SyncRun when they have no `runId`.

Failures write only the safe `SYNC_FAILED` code where logging remains available, attempt to mark the run as failed, and propagate to centralized error handling. No raw source or database message is included in API responses or persisted failure details. `GET /api/v1/sync/status` reads the newest SyncRun for `products`, `orders`, and `all`; an absent scope returns `never-run`.

## Pagination, filters, and sorting

All lists accept `page` as a positive integer and `limit` from 1 through 100. Defaults are page 1 and limit 25. Responses include `page`, `limit`, `total`, and `totalPages`. Results use the requested allowlisted sort followed by `_id` in the same direction for deterministic pagination.

| Endpoint | Filters | Sort values |
| --- | --- | --- |
| `/api/v1/products` | `productNumber`, `name`, `isActive=true|false`, `minStock` | `productName`, `stockQuantity`, `syncedAt` and `-` variants |
| `/api/v1/orders` | `orderNumber`, `status`, `from`, `to` | `orderDate`, `amountTotal`, `syncedAt` and `-` variants |
| `/api/v1/sync/logs` | `entity=products|orders|dashboard`, `status=success|failure`, `runId`, `from`, `to` | `createdAt`, `durationMs` and `-` variants |
| `/api/v1/sync/runs` | `scope=products|orders|all`, `status=running|success|failure`, `from`, `to` | `startedAt`, `durationMs` and `-` variants |

Product and order number list filters use exact stored-value equality. Product-name filtering remains an escaped, case-insensitive contains search. Order status is normalized to lowercase and matched exactly. `from` and `to` filter order date, log creation time, or run start time according to the endpoint. They accept `YYYY-MM-DD` or an ISO datetime; a date-only `to` includes the full UTC day.

Unknown, repeated, malformed, or disallowed query parameters return `400 INVALID_QUERY`. Invalid detail identifiers return `400 INVALID_IDENTIFIER`; missing product, order, log, and run records have resource-specific 404 codes. Malformed JSON, oversized bodies, unsupported encodings, unknown routes, readiness failures, unauthorized requests, and unexpected failures also use stable safe codes. Centralized error handling never returns stacks or internal exception text.
