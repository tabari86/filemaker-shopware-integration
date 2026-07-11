# Architecture

## Historical system

The original private project used FileMaker dashboard scripts to exchange business data with a live Shopware installation. That production history motivates this repository's layering, but the public application does not connect to either system.

## Portfolio reconstruction

The portfolio service runs Express 5 on Node.js. Fixed simulated Shopware services provide products and orders, mappers translate them, synchronization services coordinate MongoDB-backed repositories, and every run records success or failure.

```text
Client or FileMaker-style trigger
  -> Render / Express
  -> API-key middleware and routes
  -> simulated Shopware source, mappers, sync services
  -> MongoDB repositories
  -> MongoDB Atlas
```

MongoDB Atlas supplies durable persistence. JSON files under `data/` are static review examples only; synchronization never reads or modifies them. Unique indexes and upserts make repeated product and order imports idempotent.

Public liveness and MongoDB readiness endpoints support operations. Protected endpoints require `x-api-key`. Startup validates configuration, connects, and initializes indexes before listening. Shutdown closes HTTP and MongoDB cleanly.

`POST /api/sync/all` models the trigger concept of the historical FileMaker dashboard. It runs product and order imports and persists a summary; it is not a live FileMaker connection. Failures attempt safe persistent logging and then propagate to centralized error handling without exposing stacks or credentials.
