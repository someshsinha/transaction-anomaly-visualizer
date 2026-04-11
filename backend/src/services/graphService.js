const neo4jDriver = require('../db/neo4j');
const pool = require('../db/postgres');

/**
 * Fetches the 2-hop subgraph around an account from Neo4j.
 * Returns nodes and edges in a shape the React graph visualizer can consume directly.
 *
 * Fix: the original Cypher had a variable scoping bug — after UNWIND + collect,
 * `rs` was used as a non-aggregated key which caused one fragmented nodeList per path
 * instead of one unified list. We now collect the 2-hop neighbourhood first, then
 * do a separate MATCH to find all edges that connect those nodes.
 *
 * @param {string} accountId
 * @returns {{ accountId, nodes: Array, edges: Array }}
 */
const getSubgraph = async (accountId) => {
  const session = neo4jDriver.session();

  try {
    const result = await session.run(
      `MATCH (center:Account { id: $accountId })
       OPTIONAL MATCH (center)-[:TRANSFER*1..2]-(neighbor:Account)
       WITH center, neighbor LIMIT 150
       WITH center, collect(DISTINCT neighbor) AS neighbors
       WITH [center] + neighbors AS allNodes
       UNWIND allNodes AS n
       WITH collect(DISTINCT n) AS nodeList
       MATCH (a:Account)-[r:TRANSFER]->(b:Account)
       WHERE a IN nodeList AND b IN nodeList
       RETURN nodeList, collect(DISTINCT r) AS relList`,
      { accountId }
    );

    if (result.records.length === 0) {
      return { accountId, nodes: [], edges: [] };
    }

    const record   = result.records[0];
    const rawNodes = record.get('nodeList');
    const rawRels  = record.get('relList');

    // Build elementId → account id map first (needed to resolve edge endpoints)
    const idMap = {};
    rawNodes.forEach(n => { idMap[n.elementId] = n.properties.id; });

    // Shape nodes for the visualizer: { id, label }
    const nodes = rawNodes.map(n => ({
      id:    n.properties.id,
      label: n.properties.id,
    }));

    const edgeMap = new Map();
    rawRels.forEach(r => {
      const from = idMap[r.startNodeElementId] || r.startNodeElementId;
      const to   = idMap[r.endNodeElementId]   || r.endNodeElementId;
      const pairKey = `${from}->${to}`;
      
      const tx = {
        id: r.properties.id,
        amount: r.properties.amount,
        timestamp: r.properties.timestamp,
        merchant: r.properties.merchant || null,
      };

      if (!edgeMap.has(pairKey)) {
        edgeMap.set(pairKey, {
          id: pairKey,
          from,
          to,
          amount: tx.amount,
          count: 1,
          originalIds: [tx.id],
          originalTxns: [tx]
        });
      } else {
        const bundle = edgeMap.get(pairKey);
        bundle.amount += tx.amount;
        bundle.count += 1;
        bundle.originalIds.push(tx.id);
        bundle.originalTxns.push(tx);
      }
    });

    const edges = Array.from(edgeMap.values());
    
    // Sort nested transactions descending by time for easy table reading
    edges.forEach(e => {
        e.originalTxns.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    });

    // Fetch related anomalies automatically from Postgres
    let autoAnomalies = [];
    if (nodes.length > 0) {
      const nodeIds = nodes.map(n => n.id);
      try {
        const { rows } = await pool.query(
          `SELECT id as anomaly_id, anomaly_type, details, detected_at 
           FROM anomalies 
           WHERE details->>'node' = ANY($1) 
              OR details->>'from' = ANY($1) 
              OR details->>'to'   = ANY($1)`,
          [nodeIds]
        );
        autoAnomalies = rows;
      } catch (err) {
        console.error('Error fetching auto anomalies:', err);
      }
    }

    return { accountId, nodes, edges, autoAnomalies };

  } finally {
    await session.close();
  }
};

module.exports = { getSubgraph };