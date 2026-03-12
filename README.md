# Transaction Anomaly Visualizer (TAV)

> Distributed pipeline for detecting fraudulent patterns in financial transaction networks.  
> Accounts and transfers are modelled as a property graph in Neo4j, enabling traversal-based 
> detection over dynamic, high-volume data.

## ✨ Features
- 4 graph algorithms implemented from scratch — DFS cycle detection, BFS velocity checking, 
  threshold proximity analysis, timestamp delta computation
- Neo4j property graph model for account/transfer traversal
- BullMQ + Redis for async, non-blocking job queue processing
- PostgreSQL for raw transaction storage
- React dashboard visualizing flagged subgraphs and traversal paths
- Core detection engine decoupled as a standalone npm package

## 🏗️ Architecture
CSV/JSON Input
    → PostgreSQL (raw storage)
    → Neo4j (graph model)
    → BullMQ/Redis (async job queue)
    → Graph Algorithms (anomaly detection)
    → REST API
    → React Dashboard

## 🚀 Quick Start
# Prerequisites: Docker

git clone https://github.com/<your-username>/transaction-anomaly-visualizer
cd transaction-anomaly-visualizer
docker compose up

## 📦 Use as a standalone package
npm install transaction-anomaly-visualizer

const { detectCycles, velocityCheck } = require('transaction-anomaly-visualizer')

## 🛠️ Tech Stack
Node.js · PostgreSQL · Neo4j · BullMQ · Redis · Express · React

## 📸 Demo
Coming soon

## 📄 License
MIT

