const TYPE = {
  CYCLE:               { label: 'CYCLE',       cls: 'badge-cycle'     },
  HIGH_VELOCITY:       { label: 'VELOCITY',    cls: 'badge-velocity'  },
  THRESHOLD_PROXIMITY: { label: 'STRUCTURING', cls: 'badge-structure' },
  RAPID_SUCCESSION:    { label: 'RAPID',       cls: 'badge-rapid'     },
};

const AnomalyRow = ({ anomaly, isActive, onClick }) => {
  const cfg = TYPE[anomaly.anomaly_type] || TYPE.RAPID_SUCCESSION;
  const d   = anomaly.details;

  const detail =
    d.from && d.to  ? `${d.from} → ${d.to}` :
    d.node          ? d.node :
    d.cyclePath     ? d.cyclePath.join(' → ') : '—';

  const value =
    d.amount  != null ? `$${Number(d.amount).toLocaleString()}` :
    d.deltaMs != null ? `${(d.deltaMs / 1000).toFixed(1)}s gap` :
    d.delta   != null ? `Δ$${d.delta}` : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0 1.25rem',
        height: '4rem', /* Taller row for better hit area and readability */
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: isActive ? 'var(--bg-active)' : 'transparent',
        borderLeft: isActive ? '4px solid var(--accent)' : '4px solid transparent', /* Active indicator */
        transition: 'background 0.2s, border-left-color 0.2s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Badge container with fixed width to align text */}
      <div style={{ width: '6.5rem', flexShrink: 0 }}>
        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
      </div>

      {/* Detail */}
      <span style={{
        flex: 1,
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        fontFamily: '"JetBrains Mono", "DM Mono", monospace',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {detail}
      </span>

      {/* Value */}
      <span style={{
        fontSize: '1rem',
        color: 'var(--text-primary)',
        fontWeight: 600,
        fontFamily: '"JetBrains Mono", "DM Mono", monospace',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textAlign: 'right',
        minWidth: '5rem', /* Ensure consistent right alignment */
      }}>
        {value}
      </span>
    </div>
  );
};

export const AnomalyPanel = ({ data, activeAnomalyId, onSelect }) => {
  if (!data) return (
    <div style={{ 
      padding: '4rem 1.5rem', 
      textAlign: 'center', 
      color: 'var(--text-muted)', 
      fontSize: '0.95rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
    }}>
      <div style={{ fontSize: '3rem', opacity: 0.2 }}>🔍</div>
      Enter a job ID above and click Analyze to view anomalies.
    </div>
  );

  if (data.totalAnomalies === 0) return (
    <div style={{ 
      padding: '4rem 1.5rem', 
      textAlign: 'center', 
      color: 'var(--green)', 
      fontSize: '1rem',
      fontWeight: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
    }}>
      <div style={{ fontSize: '3rem', opacity: 0.8 }}>✅</div>
      No anomalies detected. All clear.
    </div>
  );

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border-bright)',
        background: 'var(--bg-card)',
        flexWrap: 'wrap',
      }}>
        {Object.entries(data.byType).map(([type, items]) => {
          const cfg = TYPE[type];
          if (!cfg) return null;
          return (
            <span key={type} className={`badge ${cfg.cls}`} style={{ opacity: 0.9 }}>
              {items.length} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Rows */}
      <div style={{ paddingBottom: '2rem' }}>
        {data.anomalies.map(a => (
          <AnomalyRow
            key={a.id}
            anomaly={a}
            isActive={activeAnomalyId === a.id}
            onClick={() => onSelect(a)}
          />
        ))}
      </div>
    </div>
  );
};