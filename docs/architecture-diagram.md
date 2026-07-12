# Architecture diagrams

## Historical context

```text
FileMaker dashboard -> FileMaker scripts -> live Shopware API
```

This describes the source scenario only. It is separate from the running portfolio application.

## Integration service reconstruction

```text
Client
  |
  +--> GET /, /api/health, /api/ready -----------------+
  |                                                    |
  +--> /api-docs, /api-docs.json -> OpenAPI/Swagger ---+
  |                                                    |
  +--> /api/v1 routes -> request ID -> API key --------+-> Express on Render
                                                            |
Simulated Shopware products/orders -> mappers -> sync services
                                                            |
                                                            +-> MongoDB repositories -> MongoDB Atlas
                                                            +-> one top-level SyncRun per request
                                                            +-> correlated success/failure SyncLogs
```

Render hosts the proposed Node process and Atlas remains external durable storage. Static JSON samples are not runtime persistence. No component calls a live Shopware or FileMaker instance.

The FileMaker-style full endpoint runs the product and order flows sequentially. One `all`-scope run supplies the `runId` and HTTP `requestId` used by the product, order, and dashboard summary logs. Related logs are returned by persisted `createdAt` order while `startedAt` remains lifecycle timing. The newest run in each `products`, `orders`, and `all` scope drives dynamic synchronization status.
