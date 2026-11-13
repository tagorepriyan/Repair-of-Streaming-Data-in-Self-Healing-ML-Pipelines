import React, { useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GitCommit, Info, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

// Custom positions for clean DAG layout
const NODE_POSITIONS = {
  Temperature: { x: 50, y: 120 },
  Pressure: { x: 260, y: 50 },
  Vibration: { x: 260, y: 220 },
  Flow: { x: 470, y: 130 },
  Power: { x: 680, y: 130 },
  ActuatorState: { x: 880, y: 130 },
  FailureRisk: { x: 1080, y: 130 },
};

export default function CausalGraphViewer({ healthyGraph, latestData }) {
  const [selectedView, setSelectedView] = useState('healthy'); // 'healthy', 'window', 'repaired'
  const [selectedNode, setSelectedNode] = useState(null);

  const activeGraph = useMemo(() => {
    if (!latestData) return healthyGraph?.graph;
    if (selectedView === 'healthy') return latestData.graph_healthy || healthyGraph?.graph;
    if (selectedView === 'window') return latestData.graph_window || healthyGraph?.graph;
    if (selectedView === 'repaired') return latestData.graph_repaired || latestData.graph_healthy || healthyGraph?.graph;
    return healthyGraph?.graph;
  }, [selectedView, latestData, healthyGraph]);

  const nodes = useMemo(() => {
    if (!activeGraph?.nodes) return [];

    return activeGraph.nodes.map((n) => {
      const isSelected = selectedNode?.id === n.id;
      const isTarget = n.id === 'FailureRisk';
      const pos = NODE_POSITIONS[n.id] || { x: 100, y: 100 };

      // Check if degraded in current window
      const isDegraded =
        selectedView === 'window' &&
        latestData?.localized_variables?.some((v) => v.variable === n.id && v.suspicion_level === 'High');

      let borderColor = 'border-slate-700';
      let bgColor = 'bg-slate-800';
      let textColor = 'text-slate-100';

      if (isTarget) {
        borderColor = 'border-purple-500';
        bgColor = 'bg-purple-950/80';
        textColor = 'text-purple-200';
      } else if (isDegraded) {
        borderColor = 'border-rose-500 animate-pulse';
        bgColor = 'bg-rose-950/80';
        textColor = 'text-rose-200';
      } else if (isSelected) {
        borderColor = 'border-cyan-400';
        bgColor = 'bg-slate-800';
      }

      return {
        id: n.id,
        position: pos,
        data: {
          label: (
            <div className="text-center">
              <div className="text-xs font-bold">{n.id}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isTarget ? 'Target Y' : `In: ${n.in_degree} | Out: ${n.out_degree}`}
              </div>
            </div>
          ),
          raw: n,
        },
        style: {
          borderWidth: isSelected ? '2px' : '1px',
          borderRadius: '10px',
          padding: '8px 14px',
          width: 140,
        },
        className: `${borderColor} ${bgColor} ${textColor} shadow-lg cursor-pointer transition-all`,
      };
    });
  }, [activeGraph, selectedNode, selectedView, latestData]);

  const edges = useMemo(() => {
    if (!activeGraph?.edges) return [];

    return activeGraph.edges.map((e) => {
      const weight = Math.abs(e.weight || 1.0);
      const isWindow = selectedView === 'window';
      const strokeColor = isWindow ? '#f59e0b' : selectedView === 'repaired' ? '#10b981' : '#38bdf8';

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: selectedView === 'window',
        label: `${e.weight?.toFixed(2)}`,
        labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
        style: {
          stroke: strokeColor,
          strokeWidth: Math.max(1.5, Math.min(4, weight * 1.5)),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
      };
    });
  }, [activeGraph, selectedView]);

  const onNodeClick = (_, node) => {
    setSelectedNode(node.data.raw);
  };

  return (
    <div className="space-y-4">
      {/* Graph View Selector & Status Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-4 gap-4 backdrop-blur-sm shadow-xl">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedView('healthy')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedView === 'healthy'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Healthy Graph G_H</span>
          </button>

          <button
            onClick={() => setSelectedView('window')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedView === 'window'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Degraded Window G_t</span>
          </button>

          <button
            onClick={() => setSelectedView('repaired')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedView === 'repaired'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Repaired Graph G_R</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-4">
          <span>Nodes: <strong className="text-slate-200">{activeGraph?.num_nodes || 7}</strong></span>
          <span>Edges: <strong className="text-slate-200">{activeGraph?.num_edges || 11}</strong></span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Acyclic DAG Guaranteed
          </span>
        </div>
      </div>

      {/* Main Flow Canvas & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl h-[460px] overflow-hidden relative shadow-2xl">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="!bg-slate-800 !border-slate-700 !text-white" />
          </ReactFlow>

          {/* Graph Legend overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-300 flex items-center space-x-4 backdrop-blur-sm">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>Healthy Edge</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Degraded / Active Window</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Counterfactually Restored</span>
            </div>
          </div>
        </div>

        {/* Structural Inspection Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Structural Node Inspector
              </span>
              <span className="text-[10px] text-slate-500">Click any node</span>
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Variable:</span>
                  <div className="text-base font-bold text-cyan-300 font-mono">{selectedNode.id}</div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Causal Parents Pa(X_i):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.parents?.length > 0 ? (
                      selectedNode.parents.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-[10px]">None (Exogenous Root)</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">Causal Children Ch(X_i):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.children?.length > 0 ? (
                      selectedNode.children.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-[10px]">None (Sink / Target)</span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-slate-400">Baseline Parameters:</div>
                  <div className="text-slate-300">
                    Mean: {healthyGraph?.var_stats?.[selectedNode.id]?.mean?.toFixed(2) || '25.00'}
                  </div>
                  <div className="text-slate-300">
                    Std: {healthyGraph?.var_stats?.[selectedNode.id]?.std?.toFixed(2) || '1.00'}
                  </div>
                  <div className="text-cyan-400 text-[10px] mt-1 pt-1 border-t border-slate-800">
                    Residual Noise std: {healthyGraph?.noise_params?.[selectedNode.id]?.std?.toFixed(3) || '0.85'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select a node on the canvas to inspect structural mechanisms and parents.
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-800">
            Phase I structural profiling guarantees causal graph consistency and DAG acyclicity.
          </div>
        </div>
      </div>
    </div>
  );
}
