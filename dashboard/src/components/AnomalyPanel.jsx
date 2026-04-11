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
        padding: '0 1.25rem',
        height: '4rem', /* Taller row for better hit area and readability */
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: isActive ? 'var(--bg-active)' : 'transparent',
        borderLeft: `4px solid ${isActive ? color : 'transparent'}`, /* Severity indicator mapped to specific alert */
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
        minWidth: '5rem', /* Ensure consistent right alignment */
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
         // Ensure deep property intersection mapping for all generated algorithms
         const matchesDirect = 
            d.node === drawerFilterNode ||
            d.accountId === drawerFilterNode ||
            d.from === drawerFilterNode ||
            d.to === drawerFilterNode ||
            d.fromA === drawerFilterNode ||
            d.fromB === drawerFilterNode ||
            d.toA === drawerFilterNode ||
            d.toB === drawerFilterNode;
            
         const matchesArray = 
            (d.cyclePath && d.cyclePath.includes(drawerFilterNode)) ||
            (d.path && d.path.includes(drawerFilterNode)) ||
            (d.involvedNodes && d.involvedNodes.includes(drawerFilterNode)) ||
            (d.involvedAccounts && d.involvedAccounts.includes(drawerFilterNode));
            
         const stringifiedDump = JSON.stringify(d); // Final aggressive catch-all fallback
         const matchesString = stringifiedDump.includes(drawerFilterNode);

         return matchesDirect || matchesArray || matchesString;
       })
     : data.anomalies;

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
          
          // Re-calculate local counts if filtered
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
        {filteredAnomalies.length === 0 ? (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
               No anomalies found involving this account.
           </div>
        ) : (
           filteredAnomalies.map(a => (
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