import { Activity, Sun, Moon } from 'lucide-react';

const Stat = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 1.75rem',
    borderRight: '1px solid var(--border)',
    gap: '0.2rem',
    minWidth: '7rem',
  }}>
    <span style={{ 
      fontSize: '0.75rem', 
      color: 'var(--text-muted)', 
      letterSpacing: '0.12em', 
      textTransform: 'uppercase',
      fontWeight: 600,
    }}>
      {label}
    </span>
    <span style={{ 
      fontSize: '1.25rem', 
      fontWeight: 700, 
      color: color || 'var(--text-primary)', 
      lineHeight: 1,
      fontFamily: '"JetBrains Mono", "DM Mono", monospace',
    }}>
      {value ?? '—'}
    </span>
  </div>
);

export const Toolbar = ({ isDark, onToggleTheme, stats }) => (
  <header style={{
    height: '4rem', /* Taller header */
    background: 'var(--bg-panel)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'stretch',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }}>
    {/* Brand */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0 1.75rem',
      borderRight: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{
        background: 'var(--accent-bg)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Activity size={20} color="var(--accent)" strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.2 }}>TAV</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>v0.1</div>
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
      <Stat label="Transactions" value={stats.transactions} />
      <Stat label="Anomalies"    value={stats.anomalies}
            color={stats.anomalies > 0 ? 'var(--red)' : undefined} />
      <Stat label="Batches"  value={stats.batches} />
      <Stat label="Status"   value={stats.status ?? 'IDLE'}
            color={stats.status === 'LIVE' ? 'var(--green)' : undefined} />
    </div>

    {/* Theme toggle */}
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 1.25rem',
      borderLeft: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <button className="tav-btn ghost" onClick={onToggleTheme}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        {isDark ? 'Light' : 'Dark'}
      </button>
    </div>
  </header>
);