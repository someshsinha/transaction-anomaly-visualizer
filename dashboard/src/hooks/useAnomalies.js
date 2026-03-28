import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export const useAnomalies = () => {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [data, setData]           = useState(null);

  const fetch = useCallback(async (jobId) => {
    if (!jobId) return;
    setLoading(true); setError(null);
    try {
      const result = await api.getAnomalies(jobId);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, loading, error, data };
};