# Architecture Diagram

This document explains the difference between the original production architecture and the simplified portfolio reconstruction.

---

## 1. Original Production Architecture

The original system was implemented with Claris FileMaker scripts that communicated directly with the Shopware 6 API.

```text
┌─────────────────────┐
│ FileMaker Dashboard │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  FileMaker Script   │
└──────────┬──────────┘
           │ HTTPS / REST / JSON
           ▼
┌─────────────────────┐
│   Shopware 6 API    │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Products │ Orders │ Inventory │ Shop Data│
└──────────────────────────────────────────┘
```

In this setup, FileMaker was the central business system. Synchronization was triggered manually from the FileMaker dashboard and exchanged data between FileMaker and Shopware 6.

---

## 2. Portfolio Reconstruction Architecture

This repository rebuilds the integration logic in Node.js and Express so the project can be reviewed and executed without requiring FileMaker or Shopware.

```text
┌─────────────────────┐
│     Express API     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│       Routes        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Shopware Services   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Mapping Layer     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Repository Layer    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ JSON File Storage   │
└─────────────────────┘
```

The repository uses local JSON files to simulate FileMaker tables while preserving the overall synchronization architecture.

---

## 3. Dashboard Synchronization Flow

The original project used a FileMaker dashboard script to trigger synchronization tasks.

The portfolio version simulates the same process through a dedicated synchronization endpoint.

```text
┌─────────────────────┐
│ POST /api/sync/all  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dashboard Sync Flow │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Product Sync      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Order Sync       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Data Mapping Layer  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FileMaker Simulation│
└─────────────────────┘
```

---

## Why this structure was chosen

The original project depended on FileMaker and Shopware credentials and could not be published publicly.

For a public GitHub portfolio project, this reconstruction keeps the same integration concepts while removing external dependencies.

Benefits:

* Easy to run locally
* Safe to publish publicly
* Easy for recruiters to review
* Demonstrates real integration architecture
* Can later be extended with real Shopware API connections
* Preserves the original synchronization workflow
