import { useState } from 'react';
import { api } from '../lib/api';

export const useIngest = () => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null);

  const ingestCSV = async (file) => {
    setLoading(true); setError(null);
    try {
      const data = await api.ingestCSV(file);
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const ingestJSON = async (transactions) => {
    setLoading(true); setError(null);
    try {
      const data = await api.ingestJSON(transactions);
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { ingestCSV, ingestJSON, loading, error, result };
};