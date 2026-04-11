const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { TAVEngine } = require('../src/engine');

async function run() {
  const fileContent = fs.readFileSync('./transactions.csv', 'utf8');
  const transactions = parse(fileContent, { columns: true, cast: true, skip_empty_lines: true });

  const engine = new TAVEngine({
    velocityThreshold: 20,
    velocityWindowMs: 3600000,
    reportingLimit: 10000,
    proximityPercent: 0.15,
    timestampDeltaMs: 30000
  });

  console.log(`Analyzing ${transactions.length} transactions...`);
  const anomalies = engine.analyzeTransactions(transactions);
  console.log(`Detected ${anomalies.length} anomalies!`);
  console.log(anomalies);
}

run().catch(console.error);
