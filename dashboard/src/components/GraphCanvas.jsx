import { useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { Activity } from 'lucide-react';

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

  anomalies?.anomalies?.forEach(a => {
    const d = a.details;
    const color = ANOMALY_COLOR[a.anomaly_type] || '#ef4444';
    d.cyclePath?.forEach(id => anomalousNodes.set(id, color));
    if (d.node)   anomalousNodes.set(d.node,   color);
    if (d.from)   anomalousNodes.set(d.from,   color);
    if (d.to)     anomalousNodes.set(d.to,     color);
    if (d.edgeId)  anomalousEdges.set(d.edgeId,  color);
    if (d.edgeIdA) anomalousEdges.set(d.edgeIdA, color);
    if (d.edgeIdB) anomalousEdges.set(d.edgeIdB, color);
  });

  return [
    ...graphData.nodes.map(n => ({
      data: {
        id: n.id, label: n.id,
        anomalyColor: anomalousNodes.get(n.id) || null,
      },
    })),
    ...graphData.edges.map(e => ({
      data: {
        id: e.id, source: e.from, target: e.to,
        label: `$${Number(e.amount).toLocaleString()}`,
        anomalyColor: anomalousEdges.get(e.id) || null,
      },
    })),
  ];
};

const getStylesheet = (isDark) => [
  {
    selector: 'node',
    style: {
      'width': 32, // Forces small nodes
      'height': 32,
      'background-color': isDark ? '#27272a' : '#e4e4e7', // Solid fill!
      'border-width': 2,
      'border-color': isDark ? '#3f3f46' : '#d4d4d8',
      'label': 'data(label)',
      // Forces standard clean monospace, kills the arcade font completely
      'font-family': '"Inter", system-ui, -apple-system, sans-serif',
      'font-size': 12,
      'font-weight': 500,
      'color': isDark ? '#a1a1aa' : '#52525b',
      'text-valign': 'bottom',
      'text-margin-y': 6,
      'text-outline-width': 0, // Prevents thick text shadows
    },
  },
  {
    selector: 'node[?anomalyColor]',
    style: {
      'background-color': 'data(anomalyColor)', // Restores the SOLID anomaly color
      'border-width': 1.5, // Removes the giant borders
      'color': isDark ? '#f4f4f5' : '#111111',
      'font-weight': 600,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': isDark ? '#3f3f46' : '#d4d4d8',
      'target-arrow-color': isDark ? '#3f3f46' : '#d4d4d8',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      'font-size': 10,
      'color': isDark ? '#e4e4e7' : '#18181b',
      'text-background-color': isDark ? '#18181b' : '#ffffff',
      'text-background-opacity': 1,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'text-border-color': isDark ? '#3f3f46' : '#d4d4d8',
      'text-border-width': 1,
    },
  },
  {
    selector: 'edge[?anomalyColor]',
    style: {
      'line-color': 'data(anomalyColor)',
      'target-arrow-color': 'data(anomalyColor)',
      'width': 3,
    },
  }
];

export const GraphCanvas = ({ graphData, anomalies, highlightIds, isDark }) => {
  const cyRef = useRef(null);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const t = setTimeout(() => {
      cy.elements().removeClass('highlighted');
      
      if (!highlightIds?.length) {
        // If no explicit highlights but data exists, fit the whole graph
        if (graphData && graphData.nodes.length > 0) {
          cy.fit(cy.elements(), 60); // 60px breathing room
        }
        return;
      }

      // Highlight specific nodes
      highlightIds.forEach(id => {
        try { cy.$(`[id = "${id}"]`).addClass('highlighted'); } catch {}
      });
      
      const first = cy.$(`[id = "${highlightIds[0]}"]`);
      if (first.length) {
        cy.animate({ center: { eles: first }, zoom: 1.5 }, { duration: 400 });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [highlightIds, graphData]);

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
    <div className="canvas-bg" style={{ width: '100%', height: '100%' }}>
      <CytoscapeComponent
        elements={buildElements(graphData, anomalies)}
        stylesheet={getStylesheet(isDark)}
        layout={{
          name: 'fcose',
          animate: true,
          animationDuration: 600,
          nodeRepulsion: 8000, /* Adjusted since nodes are smaller */
          idealEdgeLength: 120, /* Scaled down for tighter, manageable graphs */
          randomize: false,
          fit: true,
          padding: 60, /* 60px initial padding padding around graph */
        }}
        cy={cy => {
          cyRef.current = cy;
          // One-time fit on load if needed, though layout handles it
          cy.on('layoutstop', () => {
            if (!highlightIds?.length) {
              cy.fit(cy.elements(), 60);
            }
          });
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
    </div>
  );
};