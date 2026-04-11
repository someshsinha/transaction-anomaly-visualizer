import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export const useGraph = () => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [graphData, setGraphData] = useState(null);

  const fetch = useCallback(async (accountId, append = false) => {
    if (!accountId) return;
    setLoading(true); setError(null);
    try {
      const result = await api.getGraph(accountId);
      if (append) {
        setGraphData(prev => {
          if (!prev) return result;
          const mergedNodes = [...prev.nodes];
          const mergedEdges = [...prev.edges];
          const nodeIds = new Set(prev.nodes.map(n => n.id));
          const edgeIds = new Set(prev.edges.map(e => e.id));
          
          result.nodes.forEach(n => {
             if (!nodeIds.has(n.id)) mergedNodes.push(n);
          });
          result.edges.forEach(e => {
             if (!edgeIds.has(e.id)) mergedEdges.push(e);
          });
          return { ...prev, nodes: mergedNodes, edges: mergedEdges };
        });
      } else {
        setGraphData(result);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, loading, error, graphData };
};