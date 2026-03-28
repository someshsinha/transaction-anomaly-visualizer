import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export const useGraph = () => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [graphData, setGraphData] = useState(null);

  const fetch = useCallback(async (accountId) => {
    if (!accountId) return;
    setLoading(true); setError(null);
    try {
      const result = await api.getGraph(accountId);
      setGraphData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, loading, error, graphData };
};