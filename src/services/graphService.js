// src/services/graphService.js
const neo4jDriver = require('../db/neo4j');

/**
 * Fetches the 2-hop subgraph around an account from Neo4j.
 * Returns nodes and edges in a shape the React graph visualizer can consume directly.
 *
 * @param {string} accountId
 * @returns {{ accountId, nodes: Array, edges: Array }}
 */
const getSubgraph = async (accountId) => {
  const session = neo4jDriver.session();

  try {
    // 2-hop: get the account, all its direct neighbours, and their neighbours
    // DISTINCT prevents duplicate nodes/edges when multiple paths overlap
    const result = await session.run(
      `MATCH (center:Account { id: $accountId })
       MATCH path = (center)-[:TRANSFER*1..2]-(neighbor:Account)
       WITH nodes(path) AS ns, relationships(path) AS rs
       UNWIND ns AS n
       WITH collect(DISTINCT n) AS nodeList, rs
       UNWIND rs AS r
       WITH nodeList, collect(DISTINCT r) AS relList
       RETURN nodeList, relList`,
      { accountId }
    );

    if (result.records.length === 0) {
      return { accountId, nodes: [], edges: [] };
    }

    const record   = result.records[0];
    const rawNodes = record.get('nodeList');
    const rawRels  = record.get('relList');

    // Shape nodes for the visualizer: { id, label }
    const nodes = rawNodes.map(n => ({
      id:    n.properties.id,
      label: n.properties.id,
    }));

    // Shape edges for the visualizer: { id, from, to, amount, timestamp, merchant }
    const edges = rawRels.map(r => ({
      id:        r.properties.id,
      from:      r.startNodeElementId,   // Neo4j internal ref — resolved below
      to:        r.endNodeElementId,
      amount:    r.properties.amount,
      timestamp: r.properties.timestamp,
      merchant:  r.properties.merchant || null,
    }));

    // Resolve Neo4j internal IDs → account IDs for the edge from/to fields
    // Build a map: elementId → account id
    const idMap = {};
    rawNodes.forEach(n => { idMap[n.elementId] = n.properties.id; });

    edges.forEach(e => {
      e.from = idMap[e.from] || e.from;
      e.to   = idMap[e.to]   || e.to;
    });

    return { accountId, nodes, edges };

  } finally {
    await session.close();  // always release the session
  }
};

module.exports = { getSubgraph };