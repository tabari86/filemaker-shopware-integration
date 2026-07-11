# API flows

Public liveness returns 200 independently of MongoDB. Readiness performs a real database ping and returns 200 or safe 503 JSON. Operational endpoints require `x-api-key`; missing or invalid keys return 401.

Product and order syncs read fixed simulated Shopware arrays, map records, and use MongoDB `bulkWrite` upserts. They store success or safe failure logs. Repeating a sync updates records instead of duplicating them; an empty source processes zero records.

The dashboard flow runs both entities and writes its own success or failure summary. Sync status reads the newest MongoDB log for products, orders, and dashboard, returning `never-run` when absent. Read endpoints accept `limit` values from 1 through 100; invalid values return 400. Unknown routes return a consistent JSON 404, and centralized error middleware hides internal failure details.
