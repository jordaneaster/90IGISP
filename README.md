# 90IGISP Backend

## 🔍 Overview

**90IGISP** (Interactive Geographic Information Service Platform) is a secure, high-performance backend platform designed to ingest, manage, and serve geospatial tip data for national crime detection systems like **Osiris / Smol Detective**.

It is a critical layer in the Osiris crime analysis ecosystem, acting as the real-time geospatial data gateway. The system is built for extensibility, scalability, and security—powering both real-time and analytical crime data workflows.

---

## 🧩 Key Components

| Component        | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| **90Auth**       | API Gateway and authentication layer (JWT-based)                           |
| **90IGISP Core** | Business logic and service layer for interacting with GIS data              |
| **PostgreSQL + PostGIS** | Stores geospatial tip data with advanced querying capabilities         |
| **Redis Cache**  | Caches frequently requested data to reduce DB load and improve performance |
| **Kafka**        | Asynchronous message system used to unlock geospatial data dynamically     |
| **GraphQL API**  | Query layer for frontend and AI clients to fetch structured geospatial data |

---

## 📦 Features

- 🔐 **JWT Authentication** via `90Auth` for secure API access
- 🗺️ **Geospatial Storage** using PostgreSQL with PostGIS for precise location data
- ⚡ **Redis Caching** to reduce redundant queries and speed up data delivery
- 📣 **Kafka Messaging** to asynchronously unlock and stream GIS tip data
- 📊 **GraphQL Support** for efficient frontend data querying
- 🔄 **Pluggable Design** that integrates with larger systems like Osiris / Smol Detective

---

## ⚙️ Technologies Used

- Node.js / Express
- PostgreSQL + PostGIS
- Redis
- Kafka (KafkaJS)
- GraphQL (Apollo Server)
- Supabase (optional alternative for hosting/auth)

---

## 🚀 Use Cases

- Submit and store citizen tips with geographic coordinates
- Authenticate requests and manage role-based access
- Cache and query crime data for real-time AI-powered analysis
- Trigger data unlock events via Kafka for Smol Detective analysis pipeline
- Visualize geospatial tips via an interactive map frontend

---

## 🏁 Getting Started

### 📂 Prerequisites

- Node.js (v18+)
- PostgreSQL with PostGIS enabled
- Redis (local or cloud)
- Kafka (local broker or Confluent Cloud)
- Supabase (optional)

### 📥 Clone the Repo

```bash
git clone https://github.com/yourusername/90igisp.git
cd 90igisp
