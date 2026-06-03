# FileMaker – Shopware 6 Integration Architecture

## Project Background

This repository is a simplified reconstruction of a real-world integration project implemented between Claris FileMaker and Shopware 6.

The original production system synchronized multiple business entities between both platforms, including:

* Products
* Orders
* Inventory and stock updates
* Sales channel data
* Related e-commerce information

The goal of this repository is to demonstrate the core integration architecture without requiring a FileMaker or Shopware installation.

---

## High-Level Architecture

FileMaker (Business System)

↓

Authentication Layer

↓

Shopware 6 REST API

↓

Data Mapping & Transformation Layer

↓

FileMaker Data Storage

---

## Authentication

Two authentication methods were used in the original project:

### Product Endpoints

* sw-access-key

### Administrative Endpoints

* OAuth2 Client Credentials
* Bearer Token

---

## MVP Scope

The portfolio version focuses on:

* Product synchronization
* Order synchronization
* Inventory synchronization
* Error logging
* Data mapping

The implementation uses local JSON files to simulate FileMaker tables.
