# Transaction Anomaly Visualizer (TAV)

> npm-installable CLI + self-hostable dashboard for detecting anomalies in financial transaction data.

## ✨ Features
- Isolation Forest-based anomaly detection (pure JS)
- Interactive visualization dashboard
- CLI support: `npx tav --input transactions.csv`
- Supports CSV and JSON input

## 🚀 Quick Start
```bash
npm install -g transaction-anomaly-visualizer
tav --input transactions.csv
```

## 📦 Usage (as a library)
```js
const { detect } = require('transaction-anomaly-visualizer')
const results = detect(transactions)
```

## 🛠️ Tech Stack
Node.js · JavaScript · Recharts · Commander.js · Express

## 📸 Demo
_Coming soon_

## 📄 License
MIT
