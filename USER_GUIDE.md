# Transaction Anomaly Visualizer (TAV) - User Guide

The Transaction Anomaly Visualizer is an advanced, high-performance monitoring platform designed to ingest financial transaction logs, securely run heuristic anomaly detection via an automated queueing system, and display flagged entities in a dynamic React-based dashboard. 

## 1. System Architecture
The repository operates under a strict **NPM Workspaces** monorepo pattern:
- `backend/`: The primary Express server running the API, Database mappings (PostgreSQL & Neo4j), and the generic BullMQ workers.
- `dashboard/`: A highly reactive interface styled with tailwind running under Vite, rendering huge graphs natively via Cytoscape.js.
- `packages/tav-detection-engine/`: The core standalone detection engine running our cycle, velocity, proximity, and timestamp differential logic.

## 2. Bootstrapping
You must verify that your database containers are operational. The entire system is packaged in a Docker Compose suite.

```bash
# 1. Spin up PostgreSQL, Neo4j, and Redis
docker-compose up -d postgres neo4j redis

# 2. Open the root workspace and simply install
npm install

# 3. Standard Local Development Start (Boots both backend & dashboard natively)
npm run dev
```

## 3. Operations & Usage

### 3.1. Ingesting Data
You trigger analysis by pushing transaction JSON matching our engine's schema to the backend ingestion queue. The TAV engine will passively consume this payload via Redis.
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"batchId": "TEST-1", "transactions": [{"id": "...", "account_from": "A", "account_to": "B", "amount": 1000, "timestamp": "..."}]}'
```

### 3.2. Visual Review
Navigate to `http://localhost:5173` in a Chromium-based browser to open the TAV Dashboard.
1. The **Anomaly Feed** will be securely docked on the right side of the canvas. You can toggle this explicitly via `Escape` or the onboard UI toggles.
2. Clicking any edge **Bundle** dynamically routes you into a direct nested table showing exactly what structural elements were aggregated out of view.
3. Our **Gravity Engine** pulls the most dangerous accounts dynamically into the layout's center. Click a red-flagged node in the center to instantly filter the Anomaly Feed strictly down to that account.

### 3.3. Detection Engine Modifications
If you need to tighten Anti-Money Laundering constraints or scale velocity sizes, modify `packages/tav-detection-engine/src/engine.js`. Because we bind through workspaces, modifications to the engine package immediately inherit into your `backend` runtime environments upon reboot.
