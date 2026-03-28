import { useState, useCallback } from 'react';
import { Toolbar }      from '../components/Toolbar';
import { ControlBar }   from '../components/ControlBar';
import { GraphCanvas }  from '../components/GraphCanvas';
import { AnomalyPanel } from '../components/AnomalyPanel';
import { useIngest }    from '../hooks/useIngest';
import { useAnomalies } from '../hooks/useAnomalies';
import { useGraph }     from '../hooks/useGraph';

export const Dashboard = () => {
  const [isDark, setIsDark]                   = useState(true);
  const [accountId, setAccountId]             = useState('');
  const [jobId, setJobId]                     = useState('');
  const [activeAnomalyId, setActiveAnomalyId] = useState(null);
  const [highlightIds, setHighlightIds]       = useState([]);

  const { ingestCSV, loading: ingestLoading }                               = useIngest();
  const { fetch: fetchAnomalies, data: anomalyData, loading: anomalyLoading } = useAnomalies();
  const { fetch: fetchGraph, graphData, loading: graphLoading }             = useGraph();

  const handleToggleTheme = () => {
    setIsDark(d => {
      document.documentElement.classList.toggle('light', d);
      return !d;
    });
  };

  const handleIngestCSV = async (file) => {
    if (!file) return;
    try {
      const result = await ingestCSV(file);
      setJobId(result.jobId);
      setTimeout(() => fetchAnomalies(result.jobId), 2500);
    } catch (e) { console.error(e); }
  };

  const handleAnomalySelect = useCallback((anomaly) => {
    setActiveAnomalyId(anomaly.id);
    const d = anomaly.details;
    setHighlightIds([
      ...(d.cyclePath || []),
      d.node, d.from, d.to,
      d.edgeId, d.edgeIdA, d.edgeIdB,
    ].filter(Boolean));
  }, []);

  const stats = {
    transactions: graphData?.edges?.length ?? null,
    anomalies:    anomalyData?.totalAnomalies ?? null,
    batches:      anomalyData ? 1 : null,
    status:       (anomalyData || graphData) ? 'LIVE' : null,
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-app)',
    }}>
      <Toolbar isDark={isDark} onToggleTheme={handleToggleTheme} stats={stats} />
      <ControlBar
        accountId={accountId}     setAccountId={setAccountId}
        onFetchGraph={() => fetchGraph(accountId)} graphLoading={graphLoading}
        jobId={jobId}             setJobId={setJobId}
        onFetchAnomalies={() => fetchAnomalies(jobId)} anomalyLoading={anomalyLoading}
        onIngestCSV={handleIngestCSV} ingestLoading={ingestLoading}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Graph pane */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minWidth: 0,
        }}>
          <div className="pane-header">
            <span className="pane-label">Graph Network</span>
            {graphData ? (
              <span style={{ 
                fontSize: '0.9rem', 
                color: 'var(--text-secondary)',
                fontFamily: '"JetBrains Mono", "DM Mono", monospace',
                background: 'var(--bg-app)',
                padding: '0.2rem 0.75rem',
                borderRadius: '1rem',
                border: '1px solid var(--border-bright)'
              }}>
                {graphData.nodes.length} nodes · {graphData.edges.length} edges
              </span>
            ) : null}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <GraphCanvas
              graphData={graphData}
              anomalies={anomalyData}
              highlightIds={highlightIds}
              isDark={isDark}
            />
          </div>
        </main>

        {/* Anomaly pane */}
        <aside style={{
          width: 'clamp(24rem, 30vw, 32rem)', /* Wider Anomaly pane */
          flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          overflow: 'hidden',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', /* Drop shadow for premium feel */
        }}>
          <div className="pane-header">
            <span className="pane-label" style={{ flex: 1 }}>Anomaly Feed</span>
            {anomalyData?.totalAnomalies > 0 && (
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--red)',
                color: '#fff',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.75rem',
                letterSpacing: '0.05em',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
              }}>
                {anomalyData.totalAnomalies} ALERTS
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <AnomalyPanel
              data={anomalyData}
              activeAnomalyId={activeAnomalyId}
              onSelect={handleAnomalySelect}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};