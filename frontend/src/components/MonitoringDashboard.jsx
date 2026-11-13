import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Activity, ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle, TrendingUp, Cpu } from 'lucide-react';

export default function MonitoringDashboard({ latestData, history, threshold }) {
  if (!latestData) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        Initializing Dynamic Causal Monitoring pipeline...
      </div>
    );
  }

  const { monitoring, repair_summary, downstream_metrics, corruption_meta } = latestData;

  // Format chart data from history
  const chartData = (history || []).map((item) => ({
    window: `W_${item.window_id}`,
    window_id: item.window_id,
    deviation: item.monitoring.causal_deviation,
    threshold: item.monitoring.threshold,
    is_anomaly: item.monitoring.is_anomaly,
    decision: item.repair_summary?.decision || 'ACCEPT',
    f1_corrupted: item.downstream_metrics?.corrupted_f1 || 0,
    f1_repaired: item.downstream_metrics?.repaired_f1 || 0,
    f1_healthy: item.downstream_metrics?.healthy_f1 || 0,
  }));

  // Decision styling
  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'ACCEPT':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-emerald">
            <CheckCircle className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider">ACCEPT</div>
              <div className="text-[10px] text-emerald-300">Stream Repaired Data</div>
            </div>
          </div>
        );
      case 'ESCALATE':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 glow-amber">
            <AlertTriangle className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider">ESCALATE</div>
              <div className="text-[10px] text-amber-300">Manual Operator Review</div>
            </div>
          </div>
        );
      case 'REJECT':
      default:
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 glow-rose">
            <AlertOctagon className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider">REJECT</div>
              <div className="text-[10px] text-rose-300">Flag / Exclude Window</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic Causal Deviation Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Causal Deviation D_c(G_H, G_t)</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${monitoring.is_anomaly ? 'text-rose-400' : 'text-emerald-400'}`}>
              {monitoring.causal_deviation.toFixed(3)}
            </span>
            <span className="text-xs text-slate-500">
              vs τ_d: <strong className="text-slate-400">{monitoring.threshold.toFixed(3)}</strong>
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded font-medium ${
              monitoring.status === 'NORMAL_VARIATION'
                ? 'bg-emerald-500/10 text-emerald-400'
                : monitoring.status === 'TRANSIENT_ANOMALY'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}>
              {monitoring.status}
            </span>
            <span className="text-slate-500">SHD: {monitoring.shd}</span>
          </div>
        </div>

        {/* Acceptance Score & Closed-Loop Decision */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Closed-Loop Decision</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center justify-between mt-1">
            {getDecisionBadge(repair_summary?.decision)}
            <div className="text-right">
              <span className="text-xs text-slate-400">Score R:</span>
              <div className="text-lg font-mono font-bold text-white">
                {repair_summary ? (repair_summary.acceptance_score * 100).toFixed(1) : 100}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">
            {repair_summary?.explanation || 'Healthy baseline stream.'}
          </div>
        </div>

        {/* Causal Restoration Percentage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Causal Restoration %</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {repair_summary ? repair_summary.causal_restoration_pct.toFixed(1) : '100.0'}%
            </span>
            <span className="text-xs text-slate-500">
              RMSE: <strong className="text-slate-300">{repair_summary?.rmse.toFixed(3) || '0.000'}</strong>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Target Variable: <span className="font-semibold text-cyan-300">{repair_summary?.affected_variable || 'None'}</span>
          </div>
        </div>

        {/* Downstream Self-Healing ML F1 Delta */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Downstream ML Self-Healing</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {downstream_metrics ? (downstream_metrics.repaired_f1 * 100).toFixed(1) : 0}%
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              +{downstream_metrics ? (downstream_metrics.improvement_f1 * 100).toFixed(1) : 0}% F1 Gain
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Raw Corrupted F1: {downstream_metrics ? (downstream_metrics.corrupted_f1 * 100).toFixed(1) : 0}%</span>
            <span>Healthy: {downstream_metrics ? (downstream_metrics.healthy_f1 * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Main Real-time Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Causal Monitoring Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Phase II: Dynamic Causal Deviation D_c(G_H, G_t)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring structural degradation against healthy baseline threshold τ_d
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-0.5 bg-cyan-400"></span> D_c Deviation
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-400"></span> Threshold τ_d
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="window" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 'dataMax + 0.1']} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine y={threshold || 0.25} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `τ_d=${(threshold || 0.25).toFixed(2)}`, fill: '#f43f5e', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="deviation"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const isAnomaly = props.payload.is_anomaly;
                    return (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={isAnomaly ? 5 : 3}
                        fill={isAnomaly ? '#f43f5e' : '#38bdf8'}
                        stroke="#0f172a"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Downstream Classification Performance Recovery */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Downstream ML Pipeline Self-Healing (F1 Score)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation across Healthy, Corrupted, and Counterfactually Repaired streams
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-8)} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="window" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 1]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="f1_healthy" name="Healthy Ground Truth" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1_corrupted" name="Raw Corrupted Stream" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1_repaired" name="Repaired Stream (Ours)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Streaming Event Provenance & Window Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>Window Processing History & Provenance Audit Trail</span>
          <span className="text-xs font-normal text-slate-400">({history?.length || 0} windows logged)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Window</th>
                <th className="py-2.5 px-3">Injected Corruption</th>
                <th className="py-2.5 px-3">Causal Deviation D_c</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Localized Var</th>
                <th className="py-2.5 px-3">Restoration %</th>
                <th className="py-2.5 px-3">Score R</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">F1 Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(history || []).slice(-6).reverse().map((h) => {
                const c = h.corruption_meta;
                const m = h.monitoring;
                const r = h.repair_summary;
                const ds = h.downstream_metrics;

                return (
                  <tr key={h.window_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-cyan-400">W_{h.window_id}</td>
                    <td className="py-2.5 px-3">
                      {c.is_corrupted ? (
                        <span className="text-amber-400">
                          {c.affected_variable} ({c.corruption_type}, {c.severity}x)
                        </span>
                      ) : (
                        <span className="text-slate-500">None (Healthy)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={m.is_anomaly ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {m.causal_deviation.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        m.status === 'NORMAL_VARIATION' ? 'text-emerald-400 bg-emerald-500/10' :
                        m.status === 'TRANSIENT_ANOMALY' ? 'text-amber-400 bg-amber-500/10' :
                        'text-rose-400 bg-rose-500/10 font-bold'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-sans">
                      {r?.affected_variable || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {r ? `${r.causal_restoration_pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {r ? (r.acceptance_score * 100).toFixed(1) : 100}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r?.decision === 'ACCEPT' ? 'text-emerald-400 bg-emerald-500/20' :
                        r?.decision === 'ESCALATE' ? 'text-amber-400 bg-amber-500/20' :
                        'text-rose-400 bg-rose-500/20'
                      }`}>
                        {r?.decision || 'ACCEPT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {ds ? `+${(ds.improvement_f1 * 100).toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
