// All API calls in one place — change BASE_URL for production
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const req = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  return res.json();
};

export const api = {
  health: () => req('/health'),

  ingestJSON: (transactions) =>
    req('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    }),

  ingestCSV: (file) => {
    const form = new FormData();
    form.append('file', file);
    return req('/api/ingest', { method: 'POST', body: form });
  },

  getAnomalies: (jobId) => req(`/api/analyze/${jobId}`),

  getGraph: (accountId) => req(`/api/graph/${accountId}`),
};