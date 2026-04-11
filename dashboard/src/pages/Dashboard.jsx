import { useState, useCallback, useEffect } from 'react';
import { Maximize, Minimize, PanelRightClose, PanelRightOpen, X, Download } from 'lucide-react';
import { Toolbar } from '../components/Toolbar';
import { ControlBar } from '../components/ControlBar';
import { GraphCanvas } from '../components/GraphCanvas';
import { AnomalyPanel } from '../components/AnomalyPanel';
import { EdgeDetailsPanel } from '../components/EdgeDetailsPanel';
import { useIngest } from '../hooks/useIngest';
import { useAnomalies } from '../hooks/useAnomalies';
import { useGraph } from '../hooks/useGraph';
import { api } from '../lib/api';

export const Dashboard = () => {
  const [isDark, setIsDark] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [jobId, setJobId] = useState('');
  const [activeAnomalyId, setActiveAnomalyId] = useState(null);
  const [highlightIds, setHighlightIds] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [drawerFilterNode, setDrawerFilterNode] = useState(null); // String mapped payload from Cytoscape tapped node
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true); // Open by default for initial context cue
  const [batchProgress, setBatchProgress] = useState(null);
  const [toastError, setToastError] = useState(null);

  const { ingestCSV, loading: ingestLoading } = useIngest();
  const { fetch: fetchAnomalies, data: anomalyData, loading: anomalyLoading } = useAnomalies();
  const { fetch: fetchGraph, graphData, loading: graphLoading } = useGraph();

  const handleToggleTheme = () => {
    setIsDark(d => {
      document.documentElement.classList.toggle('light', d);
      return !d;
    });
  };

  const handleIngestCSV = async (file) => {
    if (!file) return;
    setToastError(null);
    try {
      const result = await ingestCSV(file);
      setJobId(result.jobId);
      if (result.enqueuedBatches > 0) {
        setBatchProgress({ completed: 0, total: result.enqueuedBatches });
      } else {
        setTimeout(() => fetchAnomalies(result.jobId), 1000);
      }
    } catch (e) { 
      setToastError(e.message);
      console.error(e); 
    }
  };

  const handleAnomalySelect = useCallback((anomaly) => {
    setActiveAnomalyId(anomaly.id);
    const d = anomaly.details;
    setHighlightIds([
      ...(d.cyclePath || []),
      ...(d.cycleEdges || []),
      d.node, d.from, d.to,
      d.edgeId, d.edgeIdA, d.edgeIdB,
    ].filter(Boolean));
    setSelectedEdge(null);
    setIsDrawerOpen(true);
  }, []);

  const handleEdgeSelect = useCallback((edge) => {
    setSelectedEdge(edge);
    setIsDrawerOpen(true);
  }, []);

  const handleNodeSelect = useCallback((nodeId) => {
    setDrawerFilterNode(nodeId);
    setSelectedEdge(null);
    setIsDrawerOpen(true); // Pop Drawer intelligently
  }, []);

  const handleNodeExpand = useCallback((nodeId) => {
    fetchGraph(nodeId, true);
  }, [fetchGraph]);

  const handleExportCSV = useCallback(() => {
    if (!anomalyData || !anomalyData.anomalies.length) return;
    const csvContent = [
      ['Anomaly ID', 'Job ID', 'Type', 'Detected At', 'Details'].join(','),
      ...anomalyData.anomalies.map(a => [
        a.id, a.batch_id, a.anomaly_type, a.detectedAt || '',
        `"${JSON.stringify(a.details).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tav_anomalies_${jobId || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [anomalyData, jobId]);

  // Escape key trapping for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll for Active Batch Progress
  useEffect(() => {
    if (!batchProgress || batchProgress.completed >= batchProgress.total) return;

    const interval = setInterval(async () => {
      try {
        const { counts } = await api.getStatus();
        const remaining = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
        const nextCompleted = Math.max(0, batchProgress.total - remaining);

        setBatchProgress(prev => ({ ...prev, completed: nextCompleted }));

        if (remaining === 0) {
          clearInterval(interval);
          setTimeout(() => {
            setBatchProgress(null);
            fetchAnomalies(jobId);
          }, 500); // UI visual resolve buffer
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [batchProgress, jobId, fetchAnomalies]);

  const stats = {
    transactions: graphData?.edges?.length ?? null,
    anomalies: anomalyData?.totalAnomalies ?? null,
    status: (anomalyData || graphData) ? 'LIVE' : null,
    batchProgress,
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-app)',
      ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 9999 } : {})
    }}>
      {toastError && (
        <div style={{
          position: 'absolute', top: '5rem', right: '1.5rem', zIndex: 99999,
          background: 'var(--bg-panel)', color: 'var(--red)',
          padding: '1rem 1.25rem', borderRadius: '0.5rem',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)', border: '1px solid var(--border)',
          borderLeft: '4px solid var(--red)',
          width: 'clamp(300px, 40vw, 400px)', display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ Validation Failed
            </span>
            <button 
              onClick={() => setToastError(null)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={16}/>
            </button>
          </div>
          <div style={{ 
              fontSize: '0.75rem', fontFamily: '"Fira Code", monospace', whiteSpace: 'pre-wrap', 
              color: 'var(--text-secondary)', maxHeight: '180px', overflowY: 'auto',
              paddingRight: '0.5rem', lineHeight: 1.5
          }}>
            {toastError}
          </div>
        </div>
      )}

      {!isFullscreen && <Toolbar isDark={isDark} onToggleTheme={handleToggleTheme} stats={stats} />}
      {!isFullscreen && (
        <ControlBar
          accountId={accountId} setAccountId={setAccountId}
          onFetchGraph={() => fetchGraph(accountId)} graphLoading={graphLoading}
          jobId={jobId} setJobId={setJobId}
          onFetchAnomalies={() => fetchAnomalies(jobId)} anomalyLoading={anomalyLoading}
          onIngestCSV={handleIngestCSV} ingestLoading={ingestLoading}
        />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Graph pane */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', position: 'relative',
          overflow: 'hidden', minWidth: 0,
          marginRight: isDrawerOpen ? 'clamp(24rem, 30vw, 32rem)' : '0',
          transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div className="pane-header">
            <span className="pane-label">Graph Network</span>
            {graphData ? (
              <span style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontFamily: '"Fira Code", monospace',
                background: 'var(--bg-app)',
                padding: '0.2rem 0.75rem',
                borderRadius: '1rem',
                border: '1px solid var(--border-bright)'
              }}>
                {graphData.nodes.length} nodes · {graphData.edges.length} edges
              </span>
            ) : null}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>

            {/* Floating Top Right Controls */}
            <div style={{
              position: 'absolute', top: '1rem',
              right: isDrawerOpen ? 'calc(clamp(24rem, 30vw, 32rem) + 1rem)' : '1rem',
              zIndex: 40, display: 'flex', gap: '0.5rem',
              transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-bright)', padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                }}
              >
                {isFullscreen ? <><Minimize size={16} /><span>Exit (Esc)</span></> : <><Maximize size={16} /><span>Fullscreen</span></>}
              </button>
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDrawerOpen
                    ? 'var(--accent)'
                    : (isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)'),
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  color: isDrawerOpen ? '#ffffff' : 'var(--text-primary)',
                  border: isDrawerOpen ? '1px solid var(--accent)' : '1px solid var(--border-bright)',
                  padding: '0.5rem',
                  borderRadius: '0.5rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                }}
              >
                {isDrawerOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>

            <GraphCanvas
              graphData={graphData}
              anomalies={anomalyData}
              highlightIds={highlightIds}
              isDark={isDark}
              onEdgeSelect={handleEdgeSelect}
              onNodeSelect={handleNodeSelect}
              onNodeExpand={handleNodeExpand}
            />
          </div>
        </main>

        {/* Slide-In Drawer (Context pane) */}
        <aside style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 50,
          width: 'clamp(24rem, 30vw, 32rem)', /* Wider Anomaly pane */
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid var(--border-bright)',
          background: 'var(--bg-panel)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.2)', /* Heavier Drop shadow for float feel */
        }}>
          {selectedEdge ? (
            <EdgeDetailsPanel bundle={selectedEdge} onClose={() => setSelectedEdge(null)} />
          ) : (
            <>
              <div className="pane-header" style={{ paddingRight: '0.75rem' }}>
                <span className="pane-label" style={{ flex: 1 }}>
                  Anomaly Feed
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {anomalyData?.totalAnomalies > 0 && (
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600, background: 'var(--red)', color: '#fff',
                      borderRadius: '0.375rem', padding: '0.25rem 0.75rem', letterSpacing: '0.05em',
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                    }}>
                      {anomalyData.totalAnomalies} ALERTS
                    </span>
                  )}
                  {anomalyData?.totalAnomalies > 0 && (
                    <button
                      onClick={handleExportCSV}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
                        color: 'var(--text-primary)', padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      title="Export to CSV"
                    >
                      <Download size={14} /> Export
                    </button>
                  )}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                    title="Close Panel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <AnomalyPanel
                  data={anomalyData}
                  activeAnomalyId={activeAnomalyId}
                  onSelect={handleAnomalySelect}
                  drawerFilterNode={drawerFilterNode}
                  onClearFilter={() => setDrawerFilterNode(null)}
                />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};