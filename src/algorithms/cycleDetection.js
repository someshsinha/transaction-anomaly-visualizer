// src/algorithms/cycleDetection.js
// DFS-based cycle detection on a directed graph.
// Input:  nodes = [{ id }], edges = [{ id, from, to, amount, timestamp }]
// Output: array of flagged anomalies, each with the full cycle path

/**
 * Finds all directed cycles in the subgraph.
 * Uses iterative DFS with a recursion stack to avoid call-stack overflow
 * on large graphs.
 */
const findCycles = (nodes, edges) => {
  // Build adjacency list: from -> [{ to, edgeId }]
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push({ to: e.to, edgeId: e.id });
  });

  const visited = new Set();
  const recStack = new Set();   // nodes on the current DFS path
  const parent = {};            // parent[node] = node we came from
  const cycles = [];
  const seenCycleKeys = new Set(); // deduplication

  const dfs = (startNode) => {
    const stack = [{ node: startNode, neighborIdx: 0 }];
    recStack.add(startNode);
    visited.add(startNode);
    parent[startNode] = null;

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const { node } = frame;
      const neighbors = adj[node] || [];

      if (frame.neighborIdx < neighbors.length) {
        const { to: neighbor, edgeId } = neighbors[frame.neighborIdx];
        frame.neighborIdx++;

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          recStack.add(neighbor);
          parent[neighbor] = node;
          stack.push({ node: neighbor, neighborIdx: 0 });
        } else if (recStack.has(neighbor)) {
          // Back edge found → reconstruct cycle path
          const cyclePath = [neighbor];
          let cur = node;
          while (cur !== neighbor && cur !== null) {
            cyclePath.unshift(cur);
            cur = parent[cur];
          }
          cyclePath.unshift(neighbor);

          // Deduplicate: canonical form = rotate path so smallest node is first
          const key = [...cyclePath].sort().join(',');
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key);
            cycles.push({
              type: 'CYCLE',
              cyclePath,
              involvedNodes: [...new Set(cyclePath)],
              edgeId,
            });
          }
        }
      } else {
        // All neighbors processed — pop frame and remove from recStack
        recStack.delete(node);
        stack.pop();
      }
    }
  };

  nodes.forEach(n => {
    if (!visited.has(n.id)) dfs(n.id);
  });

  return cycles;
};

module.exports = { findCycles };