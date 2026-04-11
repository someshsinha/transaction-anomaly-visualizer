import React from 'react';
import { X, ArrowRight } from 'lucide-react';

export const EdgeDetailsPanel = ({ bundle, onClose }) => {
  if (!bundle) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-panel)',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border-bright)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aggregated Edge
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: '"Fira Code", monospace', fontSize: '0.9rem', color: 'var(--text-primary)'
          }}>
            <span style={{ fontWeight: 600 }}>{bundle.from}</span>
            <ArrowRight size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: 600 }}>{bundle.to}</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{ 
            background: 'transparent', border: 'none', cursor: 'pointer', 
            color: 'var(--text-secondary)', padding: '0.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '0.375rem',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'flex', padding: '1rem 1.25rem', gap: '2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transactions</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: '"Fira Code", monospace' }}>
            {bundle.count}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: '"Fira Code", monospace', color: 'var(--green)' }}>
            ${Number(bundle.amount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Transaction List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {bundle.originalTxns.map((tx) => (
          <div key={tx.id} style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '0.85rem' }}>
                {new Date(tx.timestamp).toLocaleString()}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ID: {tx.id.split('-')[0]}...
              </span>
              {tx.merchant && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', display: 'inline-block', marginTop: '0.25rem', alignSelf: 'flex-start' }}>
                  {tx.merchant}
                </span>
              )}
            </div>
            <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '0.95rem', fontWeight: 600 }}>
              ${Number(tx.amount).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
