# Render deployment

The Blueprint has not been deployed.

1. Create a MongoDB Atlas cluster and database named `FilemakerShopwareIntegration`.
2. Generate a cryptographically random API key of at least 32 characters, for example with a password manager or `openssl rand -hex 32`.
3. Create a Render Blueprint from this repository and confirm the Frankfurt Free web-service settings from `render.yaml`.
4. Enter `MONGODB_URI` and `API_KEY` as secret values in Render. The Blueprint supplies `NODE_ENV=production` and `MONGODB_DB_NAME=FilemakerShopwareIntegration`. Render supplies `PORT`.
5. Confirm the readiness health check uses `/api/ready` and becomes HTTP 200.
6. Verify `/api/health`, `/api-docs`, and `/api-docs.json` are public. Confirm Swagger UI loads its local assets and Authorize accepts an `x-api-key` without embedding it in the document.
7. Verify `/api/v1/products` returns 401 without a key and succeeds with the `x-api-key` header. Confirm every response includes `x-request-id`.

Render Free can cold-start. Atlas `0.0.0.0/0` is only a temporary broad connectivity rule. After validation, replace it with applicable current Render Frankfurt outbound CIDR ranges and the developer's current public IP. Do not hardcode ranges because they can change.

The required runtime variable names are `MONGODB_URI`, `MONGODB_DB_NAME`, and `API_KEY`; `NODE_ENV` and `PORT` control the runtime environment and listener. Atlas is the external durable store, so no Render database or disk is required. Never put secrets in source control, Swagger examples, commands saved to history, screenshots, or logs. Swagger has been validated locally but has not been publicly deployed.
