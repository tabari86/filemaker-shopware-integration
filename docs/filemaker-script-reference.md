# FileMaker-style dashboard trigger

The historical integration used a FileMaker dashboard script. This reconstruction models that concept with protected `POST /api/v1/sync/all`; it does not connect to FileMaker.

Operational history is available from `/api/v1/sync/logs`, `/api/v1/sync/runs`, and `/api/v1/sync/status`. The full request creates one `all`-scope SyncRun. Product, order, and dashboard summary logs share that run's `runId` and the HTTP request ID. This is correlation metadata only and does not imply a live FileMaker connection.

Run detail returns related logs in `createdAt` ascending order with `_id` as the tie-breaker. The separate `startedAt` field continues to describe when each synchronization operation began.

Callers provide `x-api-key` and should also provide a non-secret `x-request-id` suitable for their own tracing. The response echoes a safe supplied ID or generates a UUID. API keys must never be exposed in public scripts or logs.

Local technical review can use `/api-docs` for Swagger UI and `/api-docs.json` for the complete contract. Swagger Authorize sends `x-api-key` to protected v1 operations, but scripts and documentation must never store or publish the key. The documentation does not imply a live FileMaker or Shopware connection or a completed Render deployment.
