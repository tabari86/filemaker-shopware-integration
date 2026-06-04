# FileMaker – Shopware 6 Integration

![Node.js](https://img.shields.io/badge/Node.js-Backend-green?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-REST_API-black?logo=express)
![Shopware 6](https://img.shields.io/badge/Shopware-6-blue)
![FileMaker](https://img.shields.io/badge/Claris-FileMaker-red)
![REST API](https://img.shields.io/badge/REST-API-red)
![JSON](https://img.shields.io/badge/Data-JSON-lightgrey)
![Integration](https://img.shields.io/badge/System-Integration-purple)

---

A backend integration project that reconstructs the core architecture of a real FileMaker and Shopware 6 synchronization system.

The original system connected a FileMaker-based business application with a Shopware 6 online shop and synchronized e-commerce data such as products, orders, inventory-related records and shop information.

This repository provides a simplified, runnable version of that integration for portfolio and review purposes.

---

## About the Project

This project demonstrates how data can be synchronized between two different business systems.

The current implementation uses a mock Shopware layer and local JSON files to simulate FileMaker tables. This makes the project easy to run without requiring a real Shopware or FileMaker installation.

The architecture is intentionally built in layers:

```text
Shopware Service
        ↓
Mapping Layer
        ↓
FileMaker Repository Simulation
        ↓
Dashboard Sync Flow
```

The project is designed to show integration thinking, not only basic CRUD endpoints.

---

## Features

| Feature                    | Description                                                                   |
| -------------------------- | ------------------------------------------------------------------------------|
| Health Endpoint            | Basic service availability check                                              |
| Sync Status Endpoint       | Shows current synchronization state                                           |
| Mock Authentication Flow   | Simulates Shopware authentication                                             |
| Product Synchronization    | Imports product data from Shopware-style source                               |
| Order Synchronization      | Imports order data including customer and line item information               |
| Data Mapping Layer         | Converts Shopware-style JSON into FileMaker-style records                     |
| FileMaker Simulation       | Stores synchronized data in local JSON files                                  |
| Dashboard Sync Flow        | Simulates a FileMaker dashboard script triggering synchronization             |
| Sync Logging               | Records synchronization history for products, orders and dashboard executions |
| Integration History API    | Provides access to synchronization logs through a dedicated endpoint          |
| Mock / Real Mode Structure | Prepared for later real Shopware API integration                              |

---

## Tech Stack

* Node.js
* Express.js
* Axios
* dotenv
* REST API
* JSON-based local storage
* Mock integration layer

---

## API Endpoints

| Method | Endpoint             | Description                                 |
| ------ | -------------------- | ------------------------------------------- |
| GET    | `/api/health`        | Check API health                            |
| GET    | `/api/sync-status`   | Check synchronization status                |
| GET    | `/api/auth/token`    | Get mock authentication token               |
| GET    | `/api/products`      | Fetch mock Shopware products                |
| POST   | `/api/products/sync` | Synchronize products into FileMaker storage |
| GET    | `/api/orders`        | Fetch mock Shopware orders                  |
| POST   | `/api/orders/sync`   | Synchronize orders into FileMaker storage   |
| POST   | `/api/sync/all`      | Run dashboard-style synchronization flow    |
| GET    | `/api/sync/logs`     | Retrieve synchronization history logs       |

---

## Project Structure

```text
filemaker-shopware-integration/
├── data/
│   ├── inventory/
│   ├── logs/
│   ├── orders/
│   └── products/
├── docs/
│   ├── api-flow.md
│   ├── architecture.md
│   └── filemaker-script-reference.md
├── src/
│   ├── config/
│   ├── filemaker/
│   ├── routes/
│   ├── shopware/
│   ├── sync/
│   └── utils/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Architecture Overview

The original FileMaker project used scripts to communicate with Shopware 6 through REST API calls. The synchronization was triggered from the FileMaker dashboard and updated business data between both systems.

This portfolio version follows the same idea:

```text
FileMaker Dashboard Script
            ↓
Synchronization Flow
            ↓
Shopware Service Layer
            ↓
Data Mapping Layer
            ↓
FileMaker Repository Simulation
```

The current version focuses on import flows from Shopware-style data into FileMaker-style storage. The structure is prepared to be extended with bidirectional update flows.

---

## Environment Variables

Create a local `.env` file based on `.env.example`.

```env
PORT=3000

USE_MOCK_DATA=true

SHOPWARE_BASE_URL=https://demo-shopware-instance.com

SHOPWARE_CLIENT_ID=your_client_id
SHOPWARE_CLIENT_SECRET=your_client_secret

SHOPWARE_ACCESS_KEY=your_sales_channel_access_key
```

`USE_MOCK_DATA=true` allows the project to run without real Shopware credentials.

---

## Installation

```bash
git clone https://github.com/tabari86/filemaker-shopware-integration.git
cd filemaker-shopware-integration
npm install
```

---

## Run the Application

```bash
npm run dev
```

Server:

```text
http://localhost:3000
```

---

## Example Requests

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Synchronize Products

```bash
curl -X POST http://localhost:3000/api/products/sync
```

### Synchronize Orders

```bash
curl -X POST http://localhost:3000/api/orders/sync
```

### Run Dashboard Sync

```bash
curl -X POST http://localhost:3000/api/sync/all
```

---

## Current Status

Implemented:

* Basic Express server
* Configuration layer
* Mock authentication flow
* Product synchronization
* Order synchronization
* Data mapping layer
* JSON-based FileMaker simulation
* Dashboard-style synchronization flow
* Synchronization history logging


Planned improvements:

* Inventory synchronization
* Bidirectional update flow
* Error and exception logging
* More detailed API flow documentation
* Optional real Shopware API mode

---

## Documentation

Additional project documentation can be found in the `docs` directory:

- [Architecture Overview](docs/architecture.md)
- [API Flow](docs/api-flow.md)
- [FileMaker Script Notes](docs/filemaker-script-reference.md)

---

## Why this project matters

This project is not meant to be a generic CRUD API.

It demonstrates practical backend integration concepts such as authentication handling, synchronization logic, integration monitoring, synchronization history tracking, mapping external API responses into internal business records, and separating system-specific concerns into clear layers.

The project is based on a real FileMaker and Shopware 6 integration scenario and has been rebuilt as a clean, reviewable portfolio project.

---

## Author

**Moj Tabari**

Website:
https://mtintelligence.ai

GitHub:
https://github.com/tabari86

LinkedIn:
https://www.linkedin.com/in/mojtaba-tabari
