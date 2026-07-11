# Architecture diagrams

## Historical context

```text
FileMaker dashboard -> FileMaker scripts -> live Shopware API
```

This describes the source scenario only. It is separate from the running portfolio application.

## Portfolio reconstruction

```text
Client
  |
  +--> GET /, /api/health, /api/ready -----------------+
  |                                                    |
  +--> protected routes -> API-key middleware ---------+-> Express on Render
                                                            |
Simulated Shopware products/orders -> mappers -> sync services
                                                            |
                                                            +-> MongoDB repositories -> MongoDB Atlas
                                                            +-> persistent success/failure logs
```

Render hosts the proposed Node process and Atlas remains external durable storage. Static JSON samples are not runtime persistence. No component calls a live Shopware or FileMaker instance.

The FileMaker-style dashboard endpoint runs the product and order flows sequentially and stores its own summary log. Stored history drives the dynamic synchronization status endpoint.
