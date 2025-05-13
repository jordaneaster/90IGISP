# 90Express Backend Platform

## 🔍 Overview

**90Express Backend Platform** is a modular, geospatial infrastructure designed to serve as the backend for applications requiring secure, real-time location-based data processing and querying.

This backend powers a variety of systems including:

- **90IGISP** – Geospatial data backend for law enforcement and public safety tools like **Osiris / Smol Detective**
- **90 Express Logistics** – Real-time package and courier tracking
- **79 Express Courier** – Delivery route optimization and geographic data services

It is optimized for high performance, security, and easy integration with modern frontend frameworks and AI services.

---

## 🧩 Core Capabilities

| Component        | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **API Gateway (90Auth)**  | Authentication and request routing using JWTs                        |
| **GIS Service Layer (90IGISP)** | Central geospatial business logic (querying, filtering, unlocking)   |
| **PostGIS Database**      | Spatial data storage for tips, packages, delivery zones, etc.         |
| **Redis Cache (90Scan)**  | Improves performance with caching for API and Kafka responses        |
| **Kafka Integration**     | Supports event-based communication (e.g., tip unlocking, route updates)|
| **GraphQL API**           | Provides structured data access for frontend dashboards or AI clients |

---

## 📦 Use Cases

- 📍 Geospatial crime tip mapping (e.g., Osiris / Smol Detective)
- 🚚 Real-time courier package tracking and dispatch visibility
- 🗺️ Delivery route optimization and proximity-based queries
- ⚡ Caching and streaming data pipelines for mobile or web apps
- 🔐 Secure, role-based access to sensitive geographic data

---

## ⚙️ Technology Stack

- **Node.js / Express** – Core API and middleware
- **PostgreSQL + PostGIS** – Relational and spatial database
- **Redis** – Caching layer
- **KafkaJS** – Message streaming engine
- **Apollo GraphQL** – Modern query interface
- **Optional: Supabase** – Managed hosting, Auth, and APIs

---

## 🏁 Getting Started

### 📂 Prerequisites

- Node.js (v18+)
- PostgreSQL with PostGIS enabled
- Redis (local or cloud)
- Kafka (local broker or cloud, e.g., Confluent)
- Supabase (optional)

### 📥 Clone the Repo

```bash
git clone https://github.com/yourorg/90express-backend.git
cd 90express-backend
