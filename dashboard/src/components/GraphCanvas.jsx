import { useEffect, useRef, useState, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { Activity, Loader2, Filter, Eye } from 'lucide-react';

cytoscape.use(fcose);

const ANOMALY_COLOR = {
  CYCLE:               '#ef4444',
  HIGH_VELOCITY:       '#f59e0b',
  THRESHOLD_PROXIMITY: '#8b5cf6',
  RAPID_SUCCESSION:    '#f97316',
};

const buildElements = (graphData, anomalies) => {
  if (!graphData) return [];

  const anomalousNodes = new Map();
  const anomalousEdges = new Map();
  const nodeAnomalyCounts = new Map(); // Core mapping for Concentric ranking

  const allAnomalies = [
    ...(anomalies?.anomalies || []),
    ...(graphData?.autoAnomalies || [])
  ];

  const incNode = (id) => {
    nodeAnomalyCounts.set(id, (nodeAnomalyCounts.get(id) || 0) + 1);
  };

  // Explicit Frontend Edge Aggregation
  const bundledEdgesMap = new Map();
  graphData.edges.forEach(e => {
     const key = `${e.from}->${e.to}`;
     if (!bundledEdgesMap.has(key)) {
        bundledEdgesMap.set(key, { ...e, originalIds: [...(e.originalIds || [e.id])], count: e.count || 1 });
     } else {
        const bundle = bundledEdgesMap.get(key);
        bundle.amount += e.amount;
        bundle.count += (e.count || 1);
        bundle.originalIds.push(...(e.originalIds || [e.id]));
     }
  });
  const bundledEdges = Array.from(bundledEdgesMap.values());

  const originalToBundled = new Map();
  bundledEdges.forEach(e => {
      e.originalIds.forEach(id => originalToBundled.set(id, e.id));
  });

  allAnomalies.forEach(a => {
    const d = a.details;
    const color = ANOMALY_COLOR[a.anomaly_type] || '#ef4444';
    d.cyclePath?.forEach(id => { anomalousNodes.set(id, color); incNode(id); });
    
    // Map any raw transaction edge to its aggregated bundle
    d.cycleEdges?.forEach(id => anomalousEdges.set(originalToBundled.get(id) || id, color));
    if (d.node)   { anomalousNodes.set(d.node,   color); incNode(d.node); }
    if (d.from)   { anomalousNodes.set(d.from,   color); incNode(d.from); }
    if (d.to)     { anomalousNodes.set(d.to,     color); incNode(d.to); }
    if (d.edgeId)  anomalousEdges.set(originalToBundled.get(d.edgeId) || d.edgeId,  color);
    if (d.edgeIdA) anomalousEdges.set(originalToBundled.get(d.edgeIdA) || d.edgeIdA, color);
    if (d.edgeIdB) anomalousEdges.set(originalToBundled.get(d.edgeIdB) || d.edgeIdB, color);
  });

  const elementsArray = [
    ...graphData.nodes.map(n => ({
      data: {
        id: n.id, label: n.id,
        anomalyColor: anomalousNodes.get(n.id) || null,
        anomalyScore: nodeAnomalyCounts.get(n.id) || 0,
      },
    })),
    ...bundledEdges.map(e => {
      const isAnomaly = !!anomalousEdges.get(e.id);
      return {
        data: {
          id: e.id, // Strictly single unique string id map natively tied to "A->B"
          source: e.from, target: e.to,
          tooltipText: `${e.count} txns · $${Number(e.amount).toLocaleString()}`,
          thickness: Math.min(1 + (e.count * 0.3), 8),
          anomalyColor: isAnomaly ? '#ef4444' : null,
          hasAnomaly: isAnomaly,
          baseColor: '#9ca3af',
        }
      };
    }),
  ];

  return CytoscapeComponent.normalizeElements(elementsArray);
};

const getStylesheet = (isDark, labelMode) => [
  {
    selector: 'node',
    style: {
      'width': 32, // Forces small nodes
      'height': 32,
      'background-color': '#374151', // Solid dim gray fallback
      'border-width': 2,
      'border-color': isDark ? '#3f3f46' : '#d4d4d8',
      'label': 'data(label)',
      // Forces standard clean monospace, kills the arcade font completely
      'font-family': '"Outfit", system-ui, -apple-system, sans-serif',
      'font-size': labelMode === 'always' ? 10 : 12,
      'font-weight': 600,
      'color': labelMode === 'always' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#52525b'),
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'text-outline-width': labelMode === 'always' ? (isDark ? 2 : 1) : 0, 
      'text-outline-color': isDark ? '#18181b' : '#ffffff', // Ensures proper anti-aliasing outline depending on theme
      'text-opacity': labelMode === 'always' ? 1 : 0,
      'transition-property': 'text-opacity',
      'transition-duration': 300,
      'z-index': 10
    },
  },
  {
    selector: 'node[anomalyScore > 0]',
    style: {
      'background-color': '#7c3aed',
      'z-index': 50
    }
  },
  {
    selector: 'node[anomalyScore >= 5]',
    style: {
      'background-color': '#ea580c',
      'z-index': 60
    }
  },
  {
    selector: 'node[?anomalyColor]',
    style: {
      'background-color': 'data(anomalyColor)', // Restores the SOLID anomaly color
      'border-width': 1.5, // Removes the giant borders
      'color': isDark ? '#ffffff' : '#18181b', // Ensures text string survives contrast filters
      'font-weight': 600,
      'z-index': 100, // Forces specific anomaly traces to absolute foreground
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(thickness)',
      'line-color': 'data(baseColor)', // Strict Gray mapped to data payload natively
      'target-arrow-color': 'data(baseColor)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      // Text strictly disabled via omitting label property mapped string array
      'transition-property': 'line-color, target-arrow-color, width',
      'transition-duration': 300,
    },
  },
  {
    selector: 'edge[?anomalyColor]',
    style: {
      'line-color': 'data(anomalyColor)',
      'target-arrow-color': 'data(anomalyColor)',
      // Note: intentionally removed discrete thick-width to preserve dynamic volumetric sizing
    },
  },
  {
    selector: '.highlighted',
    style: {
      'border-width': 2,
      'border-color': isDark ? '#fcd34d' : '#eab308',
      'transition-property': 'border-width, border-color, width, line-color',
      'transition-duration': 300,
      'z-index': 9999
    }
  },
  {
    selector: 'edge.highlighted',
    style: {
      'width': 3,
      'line-color': isDark ? '#fcd34d' : '#eab308',
      'target-arrow-color': isDark ? '#fcd34d' : '#eab308',
      'z-index': 9999
    }
  },
  {
    selector: '.hovered',
    style: {
      'text-opacity': 1, // Will natively reveal string context physically triggered by hover engine
    }
  },
  {
    selector: '.zoomed',
    style: {
      // Zoom string overrides temporarily suspended per requested pure Toggle structure natively
    }
  }
];

export const GraphCanvas = ({ graphData, anomalies, highlightIds, isDark, onEdgeSelect, onNodeSelect, onNodeExpand }) => {
  const cyRef = useRef(null);
  const originalToBundledRef = useRef(new Map());

  const [minAmount, setMinAmount] = useState(0);
  const [debouncedMinAmount, setDebouncedMinAmount] = useState(0);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [labelMode, setLabelMode] = useState('hidden'); // hidden | hover | always

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMinAmount(minAmount);
    }, 150);
    return () => clearTimeout(handler);
  }, [minAmount]);

  const maxEdgeAmount = useMemo(() => {
    if (!graphData || !graphData.edges || graphData.edges.length === 0) return 10000;
    return Math.max(...graphData.edges.map(e => e.amount));
  }, [graphData]);

  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    const filteredEdges = graphData.edges.filter(e => e.amount >= debouncedMinAmount);
    const connectedNodeIds = new Set();
    filteredEdges.forEach(e => {
      connectedNodeIds.add(e.from);
      connectedNodeIds.add(e.to);
    });
    const filteredNodes = graphData.nodes.filter(n => connectedNodeIds.has(n.id));
    return { ...graphData, nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, debouncedMinAmount]);

  const filteredEdges = filteredGraphData?.edges || [];

  // Keep ref mapped so tap handler and highlights can find true targets
  useEffect(() => {
    const map = new Map();
    filteredGraphData?.edges.forEach(e => {
        e.originalIds?.forEach(id => map.set(id, e.id));
    });
    originalToBundledRef.current = map;
  }, [filteredGraphData]);

  // Robust container resize observer to prevent layout cut-offs
  useEffect(() => {
    if (!cyRef.current) return;
    const observer = new ResizeObserver(() => {
      if (cyRef.current) cyRef.current.resize();
    });
    const container = document.getElementById('cy-container');
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [cyRef.current]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const t = setTimeout(() => {
      cy.elements().removeClass('highlighted');
      
      if (!highlightIds?.length) {
        // If no explicit highlights but data exists, fit the whole graph
        if (filteredGraphData && filteredGraphData.nodes.length > 0) {
          cy.fit(cy.elements(), 60); // 60px breathing room
        }
        return;
      }

      // Highlight specific nodes/edges properly accounting for bundling
      const mappedHighlightIds = [...new Set(highlightIds.map(id => originalToBundledRef.current.get(id) || id))];

      mappedHighlightIds.forEach(id => {
        try { cy.$(`[id = "${id}"]`).addClass('highlighted'); } catch { /* ignore */ }
      });
      
      const first = cy.$(`[id = "${mappedHighlightIds[0]}"]`);
      if (first.length) {
        cy.animate({ center: { eles: first }, zoom: 1.5 }, { duration: 400 });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [highlightIds, filteredGraphData]);

  const edgeCount = filteredEdges.length;
  const layoutOptions = useMemo(() => {
    return edgeCount > 500 ? {
      name: 'concentric',
      concentric: (node) => node.data('anomalyScore') || 0, // Pull launderhubs to inner orbit organically
      levelWidth: () => 3, // Group concentricity cleanly mapped off broad anomaly score bands
      minNodeSpacing: 60,
      animate: true,
      animationDuration: 600,
      padding: 60
    } : {
      name: 'fcose',
      animate: true,
      animationDuration: 600,
      nodeRepulsion: 8000,
      idealEdgeLength: 120,
      randomize: false,
      fit: true,
      padding: 60,
    };
  }, [edgeCount]);

  if (!graphData) return (
    <div className="canvas-bg" style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1.25rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{
        width: '4rem', height: '4rem',
        border: '2px dashed var(--border-bright)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-panel)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}>
        <Activity size={24} color="var(--accent)" opacity={0.7} />
      </div>
      <span style={{ fontSize: '1rem', fontWeight: 500 }}>
        Enter an account ID to visualize graph network
      </span>
    </div>
  );

  return (
    <div id="cy-container" className="canvas-bg" style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* Left Top UI Grouping */}
      <div style={{
          position: 'absolute', top: '1rem', left: '1rem', zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: '0.75rem'
      }}>
          {/* Slider UI */}
          <div style={{
              background: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)', 
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              padding: '0.75rem 1rem', borderRadius: '0.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--border-bright)',
              display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '220px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)' }}>
                 <Filter size={16} />
                 <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Min Amount</span>
               </div>
               <span style={{ fontFamily: '"Fira Code", monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                 ${Number(minAmount).toLocaleString()}
               </span>
            </div>
            <input 
               type="range" min="0" max={Math.ceil(maxEdgeAmount)} step={Math.max(1, Math.ceil(maxEdgeAmount / 100))}
               value={minAmount > maxEdgeAmount ? maxEdgeAmount : minAmount}
               onChange={(e) => setMinAmount(Number(e.target.value))}
               style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Labels Toggle Pill */}
          <div style={{
              background: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)', 
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              padding: '0.35rem 0.5rem', borderRadius: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--border-bright)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content'
          }}>
             <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', color: 'var(--text-secondary)', paddingLeft: '0.5rem' }}>
                <Eye size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, marginRight: '0.5rem' }}>Labels:</span>
             </div>
             
             {['hidden', 'hover', 'always'].map((mode) => (
                <button
                   key={mode}
                   onClick={() => setLabelMode(mode)}
                   style={{
                      padding: '0.2rem 0.75rem', borderRadius: '1.5rem', border: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.02em',
                      transition: 'all 0.2s',
                      background: labelMode === mode ? 'var(--accent)' : 'transparent',
                      color: labelMode === mode ? '#ffffff' : 'var(--text-secondary)'
                   }}
                >
                   {mode === 'hidden' ? 'Off' : mode}
                </button>
             ))}
          </div>
      </div>
      
      {/* Loading Overlay */}
      {isLoadingLayout && (
         <div style={{
             position: 'absolute', inset: 0, zIndex: 20,
             display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
             background: isDark ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.7)',
             backdropFilter: 'blur(4px)', color: 'var(--text-primary)'
         }}>
             <Loader2 size={32} className="animate-spin" color="var(--accent)" />
             <span style={{ fontWeight: 500, letterSpacing: '0.05em' }}>Simulating Layout...</span>
         </div>
      )}

      {/* Edge Hover Tooltip */}
      {tooltip && (
         <div style={{
             position: 'fixed', left: tooltip.x + 15, top: tooltip.y + 15, zIndex: 9999,
             pointerEvents: 'none', background: 'var(--bg-panel)', color: 'var(--text-primary)',
             padding: '0.4rem 0.6rem', borderRadius: '0.375rem',
             boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid var(--border-bright)',
             fontFamily: '"Fira Code", monospace', fontSize: '0.8rem', fontWeight: 600
         }}>
             {tooltip.text}
         </div>
      )}

      <CytoscapeComponent
        elements={buildElements(filteredGraphData, anomalies)}
        stylesheet={getStylesheet(isDark, labelMode)}
        layout={layoutOptions}
        boxSelectionEnabled={true}
        cy={cy => {
          cyRef.current = cy;
          // One-time fit on load if needed, though layout handles it
          cy.on('layoutstart', () => setIsLoadingLayout(true));
          cy.on('layoutstop', () => {
             setIsLoadingLayout(false);
             if (!highlightIds?.length) cy.fit(cy.elements(), 60);
          });
          
          // Debounce fast pan/zoom events killing tooltip instantly


          // NODE Hover Events handling Label Visibility constraints and connected edge highlighting
          cy.on('mouseover', 'node', (evt) => {
             const ele = evt.target;
             if (labelMode === 'hover') ele.addClass('hovered');
             ele.connectedEdges().addClass('hovered');
             
             // Dynamic Node Connection Tooltip explicitly rendered
             if (evt.originalEvent) {
                const degree = ele.connectedEdges().length;
                let text = `${ele.id()}  (${degree} connections)`;
                
                // Identify if 2D rendering layout stacked multiple identical coordinate hubs
                const pos = ele.position();
                const stackedNodes = cy.nodes().filter(n => {
                   const p = n.position();
                   return Math.abs(p.x - pos.x) < 5 && Math.abs(p.y - pos.y) < 5;
                });
                
                if (stackedNodes.length > 1) {
                   text = `${stackedNodes.length} Overlapping Nodes (${degree} combined connections)`;
                }

                setTooltip({
                   x: evt.originalEvent.clientX,
                   y: evt.originalEvent.clientY,
                   text
                });
             }
          });
          cy.on('mouseout', 'node', (evt) => {
             const ele = evt.target;
             if (labelMode === 'hover') ele.removeClass('hovered');
             ele.connectedEdges().removeClass('hovered');
             setTooltip(null);
          });

          // EDGE Hover Events handling strictly absolute ToolTips mapping string overlays
          cy.on('mouseover', 'edge', (evt) => {
             const ele = evt.target;
             ele.addClass('hovered');
             ele.connectedNodes?.().addClass('hovered');

             const text = ele.data('tooltipText');
             if (text && evt.originalEvent) {
                setTooltip({
                   x: evt.originalEvent.clientX,
                   y: evt.originalEvent.clientY,
                   text
                });
             }
          });
          
          cy.on('mouseout', 'edge', (evt) => {
             const ele = evt.target;
             ele.removeClass('hovered');
             ele.connectedNodes?.().removeClass('hovered');
             setTooltip(null);
          });
          
          // Suspend Tooltips on Pan/Zoom explicitly
          cy.on('pan zoom', () => setTooltip(null));

          let lastTapNode = null;
          let lastTapTime = 0;

          cy.on('tap', 'node', (evt) => {
             const now = Date.now();
             const tapNode = evt.target.id();
             if (tapNode === lastTapNode && (now - lastTapTime) < 300) {
                 if (onNodeExpand) onNodeExpand(tapNode);
             } else {
                 if (onNodeSelect) onNodeSelect(tapNode);
             }
             lastTapNode = tapNode;
             lastTapTime = now;
          });

          cy.on('cxttap', 'node', (evt) => {
             if (onNodeExpand) onNodeExpand(evt.target.id());
          });

          cy.on('tap', 'edge', (evt) => {
             const edgeId = evt.target.id();
             const fullEdgeData = filteredGraphData?.edges.find(e => e.id === edgeId);
             if (fullEdgeData && onEdgeSelect) {
                onEdgeSelect(fullEdgeData);
             }
          });
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
      
      {/* Legend */}
      <div style={{
          position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 50,
          background: 'rgba(0,0,0,0.6)', border: '1px solid #374151', borderRadius: '8px', 
          padding: '12px', color: '#e5e7eb', fontSize: '12px',
          display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
      }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{color: '#ea580c', fontSize: '14px'}}>●</span> High Risk Account</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{color: '#7c3aed', fontSize: '14px'}}>●</span> Moderate Risk Account</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{color: '#374151', fontSize: '14px'}}>●</span> Clean Account</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{color: '#ef4444', fontWeight: 'bold'}}>─</span> Anomalous Transaction</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{color: '#9ca3af', fontWeight: 'bold'}}>─</span> Normal Transaction</div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{border: '2px solid #eab308', width: '12px', height: '12px', borderRadius: '50%'}}></span> Selected Anomaly</div>
      </div>
    </div>
  );
};