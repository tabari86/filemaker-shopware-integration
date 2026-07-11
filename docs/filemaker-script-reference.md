# FileMaker-style dashboard trigger

The historical integration used a FileMaker dashboard script. This reconstruction models that concept with protected `POST /api/sync/all`; it does not connect to FileMaker.

Operational history is available from `/api/sync/logs` and `/api/sync-status`. Product and order flows persist individual success or failure records, and the dashboard flow persists a summary. Callers provide `x-api-key` and must never expose it in public scripts or logs.
