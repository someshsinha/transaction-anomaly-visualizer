// tests/algorithms.test.js
// Run with: node tests/algorithms.test.js
// No test framework needed — plain Node assertions.

const assert = require('assert');
const { findCycles }            = require('../src/algorithms/cycleDetection');
const { checkVelocity }         = require('../src/algorithms/velocityCheck');
const { checkThresholdProximity } = require('../src/algorithms/thresholdProximity');
const { checkTimestampDelta }   = require('../src/algorithms/timestampDelta');
const { runDetectionSuite }     = require('../src/algorithms/index');

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
};

// ─── Sample data helpers ───────────────────────────────────────────────────

const NOW = Date.now();
const ts = (offsetMs = 0) => new Date(NOW + offsetMs).toISOString();

// ─── cycleDetection ────────────────────────────────────────────────────────

console.log('\n📦 cycleDetection');

test('detects simple 3-node cycle A→B→C→A', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const edges = [
    { id: 'e1', from: 'A', to: 'B' },
    { id: 'e2', from: 'B', to: 'C' },
    { id: 'e3', from: 'C', to: 'A' },
  ];
  const result = findCycles(nodes, edges);
  assert.ok(result.length > 0, 'Expected at least 1 cycle');
  assert.strictEqual(result[0].type, 'CYCLE');
  assert.ok(result[0].cyclePath.includes('A'), 'Cycle path should include A');
});

test('returns empty array for a DAG (no cycles)', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const edges = [
    { id: 'e1', from: 'A', to: 'B' },
    { id: 'e2', from: 'B', to: 'C' },
  ];
  const result = findCycles(nodes, edges);
  assert.strictEqual(result.length, 0);
});

test('does not duplicate the same cycle', () => {
  const nodes = [{ id: 'X' }, { id: 'Y' }];
  const edges = [
    { id: 'e1', from: 'X', to: 'Y' },
    { id: 'e2', from: 'Y', to: 'X' },
  ];
  const result = findCycles(nodes, edges);
  assert.strictEqual(result.length, 1, 'Same cycle should appear once');
});

test('handles disconnected graph with one cycle', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];
  const edges = [
    { id: 'e1', from: 'A', to: 'B' },
    { id: 'e2', from: 'B', to: 'A' }, // cycle
    // D is isolated
  ];
  const result = findCycles(nodes, edges);
  assert.strictEqual(result.length, 1);
});

// ─── velocityCheck ─────────────────────────────────────────────────────────

console.log('\n📦 velocityCheck');

test('flags account with transfers exceeding threshold in window', () => {
  // 12 transfers from ACC1 within 10 minutes — threshold is 10
  const edges = Array.from({ length: 12 }, (_, i) => ({
    id: `e${i}`,
    from: 'ACC1',
    to: `ACC${i + 10}`,
    amount: 100,
    timestamp: ts(i * 60_000), // 1 minute apart, all within window
  }));
  const result = checkVelocity(edges, 10, 3_600_000);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'HIGH_VELOCITY');
  assert.strictEqual(result[0].node, 'ACC1');
  assert.ok(result[0].transferCount > 10);
});

test('does not flag account within threshold', () => {
  const edges = Array.from({ length: 5 }, (_, i) => ({
    id: `e${i}`,
    from: 'ACC2',
    to: `ACC${i + 20}`,
    amount: 200,
    timestamp: ts(i * 600_000), // spread over 50 minutes
  }));
  const result = checkVelocity(edges, 10, 3_600_000);
  assert.strictEqual(result.length, 0);
});

test('respects time window — old transfers do not count', () => {
  // 6 transfers from 2 hours ago, 6 from now — within a 1h window, max is 6 (ok)
  const edges = [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `old${i}`, from: 'ACC3', to: `T${i}`,
      amount: 100, timestamp: ts(-(7_200_000 + i * 1000)),
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `new${i}`, from: 'ACC3', to: `T${i + 6}`,
      amount: 100, timestamp: ts(i * 1000),
    })),
  ];
  const result = checkVelocity(edges, 10, 3_600_000);
  assert.strictEqual(result.length, 0, 'Should not flag when each window has only 6');
});

// ─── thresholdProximity ────────────────────────────────────────────────────

console.log('\n📦 thresholdProximity');

test('flags transfer just below threshold (structuring)', () => {
  const edges = [{ id: 'tx1', from: 'A', to: 'B', amount: 9800, timestamp: ts() }];
  const result = checkThresholdProximity(edges, 10_000, 500);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'THRESHOLD_PROXIMITY');
  assert.strictEqual(result[0].delta, 200);
});

test('does not flag transfer well below threshold', () => {
  const edges = [{ id: 'tx2', from: 'A', to: 'B', amount: 5000, timestamp: ts() }];
  const result = checkThresholdProximity(edges, 10_000, 500);
  assert.strictEqual(result.length, 0);
});

test('does not flag transfer AT or above threshold', () => {
  const edges = [
    { id: 'tx3', from: 'A', to: 'B', amount: 10000, timestamp: ts() },
    { id: 'tx4', from: 'A', to: 'B', amount: 10500, timestamp: ts() },
  ];
  const result = checkThresholdProximity(edges, 10_000, 500);
  assert.strictEqual(result.length, 0, 'At or above threshold should not be flagged');
});

test('flags multiple structuring transactions', () => {
  const edges = [
    { id: 't1', from: 'A', to: 'B', amount: 9600, timestamp: ts() },
    { id: 't2', from: 'C', to: 'D', amount: 9900, timestamp: ts() },
    { id: 't3', from: 'E', to: 'F', amount: 8000, timestamp: ts() }, // safe
  ];
  const result = checkThresholdProximity(edges, 10_000, 500);
  assert.strictEqual(result.length, 2);
});

// ─── timestampDelta ────────────────────────────────────────────────────────

console.log('\n📦 timestampDelta');

test('flags rapid successive transfers from same account', () => {
  const edges = [
    { id: 'e1', from: 'ACC5', to: 'X', amount: 100, timestamp: ts(0) },
    { id: 'e2', from: 'ACC5', to: 'Y', amount: 100, timestamp: ts(5_000) }, // 5s later
  ];
  const result = checkTimestampDelta(edges, 60_000); // min gap 60s
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'RAPID_SUCCESSION');
  assert.strictEqual(result[0].node, 'ACC5');
  assert.ok(result[0].deltaMs < 60_000);
});

test('does not flag transfers with sufficient gap', () => {
  const edges = [
    { id: 'e1', from: 'ACC6', to: 'X', amount: 100, timestamp: ts(0) },
    { id: 'e2', from: 'ACC6', to: 'Y', amount: 100, timestamp: ts(120_000) }, // 2 min
  ];
  const result = checkTimestampDelta(edges, 60_000);
  assert.strictEqual(result.length, 0);
});

test('handles single transfer (no pair to compare)', () => {
  const edges = [
    { id: 'e1', from: 'ACC7', to: 'X', amount: 100, timestamp: ts() },
  ];
  const result = checkTimestampDelta(edges, 60_000);
  assert.strictEqual(result.length, 0);
});

// ─── runDetectionSuite (integration) ──────────────────────────────────────

console.log('\n📦 runDetectionSuite (integration)');

test('returns combined anomalies from all 4 algorithms', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const edges = [
    // Cycle: A→B→C→A
    { id: 'e1', from: 'A', to: 'B', amount: 100,  timestamp: ts(0) },
    { id: 'e2', from: 'B', to: 'C', amount: 9850, timestamp: ts(5_000) },   // also threshold proximity
    { id: 'e3', from: 'C', to: 'A', amount: 200,  timestamp: ts(10_000) },
  ];
  const result = runDetectionSuite(nodes, edges);
  const types = result.map(r => r.type);
  assert.ok(types.includes('CYCLE'), 'Should detect cycle');
  assert.ok(types.includes('THRESHOLD_PROXIMITY'), 'Should detect threshold proximity');
});

test('returns empty array for a clean graph', () => {
  const nodes = [{ id: 'P' }, { id: 'Q' }];
  const edges = [
    { id: 'e1', from: 'P', to: 'Q', amount: 500, timestamp: ts() },
  ];
  const result = runDetectionSuite(nodes, edges);
  assert.strictEqual(result.length, 0);
});

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ Some tests failed.');
  process.exit(1);
} else {
  console.log('🎉 All tests passed!');
}