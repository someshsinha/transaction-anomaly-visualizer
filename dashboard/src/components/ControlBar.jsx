import { useRef } from 'react';
import { Search, Upload, Loader2 } from 'lucide-react';

export const ControlBar = ({
  accountId, setAccountId, onFetchGraph, graphLoading,
  jobId, setJobId, onFetchAnomalies, anomalyLoading,
  onIngestCSV, ingestLoading,
}) => {
  const fileRef = useRef(null);

  return (
    <div style={{
      height: '4.5rem',
      background: 'var(--bg-panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '1.25rem',
      padding: '0 1.75rem',
      flexShrink: 0,
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          ACCOUNT
        </span>
        <input
          className="tav-input"
          style={{ width: 'clamp(10rem, 15vw, 16rem)', flex: 'none' }}
          placeholder="e.g. ACC001"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onFetchGraph()}
        />
        <button className="tav-btn primary" onClick={onFetchGraph} disabled={graphLoading || !accountId}>
          {graphLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          Graph
        </button>
      </div>

      <div className="vdiv" style={{ margin: '0 0.5rem' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          JOB ID
        </span>
        <input
          className="tav-input"
          style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
          placeholder="e.g. batch-xyz-123"
          value={jobId}
          autoComplete="off"
          onChange={e => setJobId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onFetchAnomalies()}
        />
        <button className="tav-btn primary" onClick={onFetchAnomalies} disabled={anomalyLoading || !jobId}>
          {anomalyLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          Analyze
        </button>
      </div>

      <div className="vdiv" style={{ margin: '0 0.5rem' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className="tav-btn ghost" onClick={() => fileRef.current?.click()} disabled={ingestLoading}>
          {ingestLoading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          Ingest CSV
        </button>
        <a
          href="/sample_fraud_data.csv"
          download="sample_fraud_data.csv"
          style={{
            fontSize: '0.7rem', fontFamily: '"Fira Code", monospace',
            color: 'var(--text-secondary)', textDecoration: 'underline',
            opacity: 0.8, cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
        >
          Sample CSV
        </a>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { onIngestCSV(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
};