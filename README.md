# FileMaker-Shopware Integration

A production-oriented integration service reconstruction based on a real historical FileMaker-Shopware scenario. This public version is useful for technical and portfolio review, uses a clearly simulated Shopware source, an Express API, and MongoDB Atlas runtime persistence. It is not connected to a live Shopware or FileMaker system and contains no real customer data.

## Features

| Capability | Implementation |
| --- | --- |
| Product and order import | Idempotent MongoDB upserts from fixed simulated Shopware data |
| Operational history | Top-level sync runs, correlated success/failure logs, and dynamic scope status |
| Read APIs | Versioned detail, pagination, filtering, and deterministic sorting endpoints |
| API security | `x-api-key` protection with timing-safe comparison and request-ID correlation |
| API contract | OpenAPI 3.0.3 JSON, Swagger UI, security schemes, and contract validation |
| Operations | Public liveness/readiness endpoints and graceful shutdown |
| Deployment preparation | Render Blueprint for Frankfurt Free; not deployed |
| Validation | Node test runner, Supertest, syntax checks, and GitHub Actions |

## Technology

Node.js 24, Express 5, CommonJS, Mongoose, MongoDB Atlas, OpenAPI 3.0.3, Swagger UI, Supertest, and Render Blueprint configuration.

## API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Public | Service metadata |
| GET | `/api/health` | Public | Process liveness |
| GET | `/api/ready` | Public | MongoDB ping readiness |
| GET | `/api-docs` | Public | Interactive Swagger UI |
| GET | `/api-docs.json` | Public | Raw OpenAPI 3.0.3 document |
| GET | `/api/v1/products` | API key | Paginated and filterable products |
| GET | `/api/v1/products/:productNumber` | API key | Product detail by exact product number |
| GET | `/api/v1/orders` | API key | Paginated and filterable orders |
| GET | `/api/v1/orders/:orderNumber` | API key | Order detail by exact order number |
| POST | `/api/v1/sync/products` | API key | Product synchronization |
| POST | `/api/v1/sync/orders` | API key | Order synchronization |
| POST | `/api/v1/sync/all` | API key | Sequential FileMaker-style full trigger |
| GET | `/api/v1/sync/status` | API key | Latest products, orders, and all-scope runs |
| GET | `/api/v1/sync/logs` | API key | Paginated and filterable synchronization logs |
| GET | `/api/v1/sync/logs/:logId` | API key | Synchronization-log detail |
| GET | `/api/v1/sync/runs` | API key | Paginated and filterable top-level runs |
| GET | `/api/v1/sync/runs/:runId` | API key | Run detail with correlated logs ordered by creation time |

List endpoints use `page` (default `1`) and `limit` (default `25`, maximum `100`). `productNumber` and `orderNumber` use exact stored-value equality; product `name` uses an escaped, case-insensitive contains search. Products also filter by `isActive` and `minStock`; orders by normalized exact `status`, `from`, and `to`; logs by `entity`, `status`, `runId`, `from`, and `to`; and runs by `scope`, `status`, `from`, and `to`. Each list accepts only its documented `sort` values. Invalid or repeated parameters return a stable `INVALID_QUERY` response.

Every response has an `x-request-id` header. A safe caller-supplied ID is echoed; otherwise the service generates a UUID. Service and operational success envelopes expose `requestId` at the top level, while errors expose it in the `error` object. The raw OpenAPI response is intentionally the exact contract document and carries correlation through its response header.

Open `/api-docs` for Swagger UI or `/api-docs.json` for the source contract. Swagger Authorize accepts the same `x-api-key` used by protected `/api/v1` operations; no key is embedded in the specification.

## Architecture

```text
Simulated Shopware source -> mapper -> synchronization service
                                           |
Express routes -> API-key middleware -------+-> MongoDB repositories -> MongoDB Atlas
                                           |
                                           +-> top-level sync runs and correlated logs
```

Each synchronization request creates one top-level `SyncRun`. Product and order requests write their entity log against that run. Full sync passes one shared `runId` and `requestId` through product, order, and dashboard logs instead of creating child runs. Run detail returns correlated logs by `createdAt` ascending with `_id` as a stable tie-breaker; `startedAt` remains the execution lifecycle timestamp. Legacy logs remain readable in general log lists but cannot be correlated to a SyncRun when they predate `runId`. The JSON files under `data/` are static samples for repository review. Synchronization never reads or modifies them; MongoDB Atlas is the runtime persistence layer. Unique indexes plus `bulkWrite` upserts make repeat synchronization idempotent.

## Project structure

```text
.github/workflows/ci.yml
data/{products,orders,logs}/
docs/
  openapi.json  central OpenAPI 3.0.3 contract
src/
  app.js        import-safe Express application
  server.js     startup and graceful shutdown
  config/       environment and MongoDB lifecycle
  filemaker/    MongoDB-backed repositories
  middleware/   request ID, API key, 404, and safe error handling
  models/       Mongoose schemas
  routes/       HTTP endpoints
  shopware/     simulated source services
  sync/         mapping and synchronization flows
test/            focused HTTP, validation, model, repository, and sync tests
render.yaml
```

## Configuration and local setup

Copy `.env.example` to `.env` and replace the placeholders. Never commit `.env`.

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/
MONGODB_DB_NAME=FilemakerShopwareIntegration
API_KEY=replace_with_a_long_random_value
```

`MONGODB_URI`, `MONGODB_DB_NAME`, and `API_KEY` are required. The API key must be at least 32 characters.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd start
```

Example protected requests:

```powershell
$headers = @{ "x-api-key" = $env:API_KEY }
Invoke-RestMethod http://localhost:3000/api/v1/products -Headers $headers
Invoke-RestMethod http://localhost:3000/api/v1/sync/products -Method Post -Headers $headers
Start-Process http://localhost:3000/api-docs
```

Startup connects to MongoDB and initializes indexes before accepting traffic. `SIGINT` and `SIGTERM` stop new requests, close the HTTP server, and disconnect MongoDB.

## Deployment and limitations

`render.yaml` prepares a Frankfurt Render Free web service, but it has not been deployed and there is no live URL. Configure Atlas and Render secrets using [the deployment guide](docs/deployment.md). Render Free services can cold-start after inactivity, so readiness may take time.

The Shopware source remains fixed simulated data. There is no live Shopware authentication or API, inventory synchronization, bidirectional flow, order status write-back, scheduler, webhook, frontend, or live FileMaker connection.

## Status and documentation

Implementation, automated HTTP tests, CI, and deployment configuration are complete. Live MongoDB Atlas and Render validation require private credentials and deployment infrastructure.

- [Architecture](docs/architecture.md)
- [Architecture diagram](docs/architecture-diagram.md)
- [API flows](docs/api-flow.md)
- [FileMaker-style trigger](docs/filemaker-script-reference.md)
- [Render deployment](docs/deployment.md)

## Author

Moj Tabari — [website](https://mtintelligence.ai), [GitHub](https://github.com/tabari86), [LinkedIn](https://www.linkedin.com/in/mojtaba-tabari)
