# FileMaker-Shopware Integration

A production-oriented backend portfolio demo reconstructed from a real historical FileMaker-Shopware integration scenario. This public version uses a clearly simulated Shopware source, an Express API, and MongoDB Atlas durable storage. It is not connected to a live Shopware or FileMaker system and contains no real customer data.

## Features

| Capability | Implementation |
| --- | --- |
| Product and order import | Idempotent MongoDB upserts from fixed simulated Shopware data |
| Operational history | Persistent success/failure logs and dynamic per-entity status |
| API security | `x-api-key` protection with timing-safe comparison |
| Operations | Public liveness/readiness endpoints and graceful shutdown |
| Deployment preparation | Render Blueprint for Frankfurt Free; not deployed |
| Validation | Node test runner, Supertest, syntax checks, and GitHub Actions |

## Technology

Node.js 24, Express 5, CommonJS, Mongoose, MongoDB Atlas, Supertest, and Render Blueprint configuration.

## API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Public | Service metadata |
| GET | `/api/health` | Public | Process liveness |
| GET | `/api/ready` | Public | MongoDB ping readiness |
| GET | `/api/products?limit=25` | API key | Persisted products |
| POST | `/api/products/sync` | API key | Product synchronization |
| GET | `/api/orders?limit=25` | API key | Persisted orders |
| POST | `/api/orders/sync` | API key | Order synchronization |
| GET | `/api/sync/logs?limit=25` | API key | Newest synchronization logs |
| GET | `/api/sync-status` | API key | Latest products, orders, and dashboard status |
| POST | `/api/sync/all` | API key | FileMaker-style dashboard trigger |

Query limits must be integers from 1 to 100.

## Architecture

```text
Simulated Shopware source -> mapper -> synchronization service
                                           |
Express routes -> API-key middleware -------+-> MongoDB repositories -> MongoDB Atlas
                                           |
                                           +-> persistent sync logs
```

The JSON files under `data/` are static sample output for repository review. Synchronization never reads or modifies them; MongoDB is the runtime persistence layer. Unique indexes plus `bulkWrite` upserts make repeat synchronization idempotent.

## Project structure

```text
.github/workflows/ci.yml
data/{products,orders,logs}/
docs/
src/
  app.js        import-safe Express application
  server.js     startup and graceful shutdown
  config/       environment and MongoDB lifecycle
  filemaker/    MongoDB-backed repositories
  middleware/   API key, 404, and error handling
  models/       Mongoose schemas
  routes/       HTTP endpoints
  shopware/     simulated source services
  sync/         mapping and synchronization flows
test/app.test.js
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
Invoke-RestMethod http://localhost:3000/api/products -Headers $headers
Invoke-RestMethod http://localhost:3000/api/products/sync -Method Post -Headers $headers
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
