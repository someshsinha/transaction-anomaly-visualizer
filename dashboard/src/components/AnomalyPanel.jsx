import { X } from 'lucide-react';

const TYPE = {
  CYCLE:               { label: 'CYCLE',       cls: 'badge-cycle'     },
  HIGH_VELOCITY:       { label: 'VELOCITY',    cls: 'badge-velocity'  },
  THRESHOLD_PROXIMITY: { label: 'STRUCTURING', cls: 'badge-structure' },
  RAPID_SUCCESSION:    { label: 'RAPID',       cls: 'badge-rapid'     },
};

const AnomalyRow = ({ anomaly, isActive, onClick }) => {
  const cfg = TYPE[anomaly.anomaly_type] || TYPE.RAPID_SUCCESSION;
  const d   = anomaly.details;
  
  // Calculate impact based on nodes in cycle or transfer count
  const impact = anomaly.anomaly_type === 'CYCLE' 
    ? (d.cyclePath?.length || 0) * 10 
    : (d.transferCount || 0);
  const isHighImpact = impact >= 20;

  const getSeverityColor = (type) => {
      switch(type) {
         case 'CYCLE': return 'var(--badge-cycle-bg)';
         case 'HIGH_VELOCITY': return 'var(--badge-velocity-bg)';
         case 'THRESHOLD_PROXIMITY': return 'var(--badge-struct-bg)';
         case 'RAPID_SUCCESSION': return 'var(--badge-rapid-bg)';
         default: return 'var(--accent)';
      }
  };
  const color = getSeverityColor(anomaly.anomaly_type);

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
        padding: '0.75rem 1.25rem',
        minHeight: '4.5rem',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: isActive ? 'var(--bg-active)' : 'transparent',
        borderLeft: `4px solid ${isActive ? color : (isHighImpact ? '#ea580c' : 'transparent')}`,
        transition: 'background 0.2s, border-left-color 0.2s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Badge container */}
      <div style={{ width: '6.5rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
        {isHighImpact && (
          <span style={{ fontSize: '7px', fontWeight: 800, color: '#ea580c', letterSpacing: '0.05em' }}>
            HIGH IMPACT
          </span>
        )}
      </div>

      {/* Detail */}
      <span style={{
        flex: 1,
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        fontFamily: '"Fira Code", monospace',
        wordBreak: 'break-word',
        lineHeight: 1.4,
      }}>
        {detail}
      </span>

      {/* Value */}
      <span style={{
        fontSize: '1rem',
        color: 'var(--text-primary)',
        fontWeight: 600,
        fontFamily: '"Fira Code", monospace',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textAlign: 'right',
        minWidth: '5rem',
      }}>
        {value}
      </span>
    </div>
  );
};

export const AnomalyPanel = ({ data, activeAnomalyId, onSelect, drawerFilterNode, onClearFilter }) => {
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

  const filteredAnomalies = drawerFilterNode
     ? data.anomalies.filter(a => {
         const d = a.details || {};
         const matchesDirect = 
            d.node === drawerFilterNode ||
            d.accountId === drawerFilterNode ||
            d.from === drawerFilterNode ||
            d.to === drawerFilterNode;
            
         const matchesArray = 
            (d.cyclePath && d.cyclePath.includes(drawerFilterNode)) ||
            (d.path && d.path.includes(drawerFilterNode));
            
         const stringifiedDump = JSON.stringify(d);
         const matchesString = stringifiedDump.includes(drawerFilterNode);

         return matchesDirect || matchesArray || matchesString;
       })
     : data.anomalies;

  // Sort by impact
  const sortedAnomalies = [...filteredAnomalies].sort((a, b) => {
    const scoreA = a.anomaly_type === 'CYCLE' ? (a.details?.cyclePath?.length || 0) * 10 : (a.details?.transferCount || 0);
    const scoreB = b.anomaly_type === 'CYCLE' ? (b.details?.cyclePath?.length || 0) * 10 : (b.details?.transferCount || 0);
    return scoreB - scoreA;
  });

  return (
    <div>
      {/* Node Filter Pill */}
      {drawerFilterNode && (
         <div style={{
            padding: '0.75rem 1.25rem', background: 'var(--bg-hover)',
            borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
         }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                 Filtering by Account: <strong style={{ color: 'var(--text-primary)', fontFamily: '"Fira Code", monospace' }}>{drawerFilterNode}</strong>
             </span>
             <button
                onClick={onClearFilter}
                style={{
                   display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-panel)',
                   border: '1px solid var(--border-bright)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem',
                   borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer'
                }}
             >
                 <X size={14} /> Clear
             </button>
         </div>
      )}

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
          const matchedCount = drawerFilterNode 
               ? filteredAnomalies.filter(a => a.anomaly_type === type).length 
               : items.length;
          if (matchedCount === 0) return null;
          return (
            <span key={type} className={`badge ${cfg.cls}`} style={{ opacity: 0.9 }}>
              {matchedCount} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Rows */}
      <div style={{ paddingBottom: '2rem' }}>
        {sortedAnomalies.length === 0 ? (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
               No anomalies found involving this account.
           </div>
        ) : (
           sortedAnomalies.map(a => (
             <AnomalyRow
               key={a.id}
               anomaly={a}
               isActive={activeAnomalyId === a.id}
               onClick={() => onSelect(a)}
             />
           ))
        )}
      </div>
    </div>
  );
};