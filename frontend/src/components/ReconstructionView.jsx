import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ShieldCheck, CheckCircle2, AlertOctagon, HelpCircle, Activity, Sparkles } from 'lucide-react';

export default function ReconstructionView({ latestData }) {
  const [showTable, setShowTable] = useState(false);

  if (!latestData || !latestData.sample_reconstructions || latestData.sample_reconstructions.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        No active counterfactual reconstruction for this window. Current window is within healthy causal profile.
      </div>
    );
  }

  const { repair_summary, sample_reconstructions } = latestData;
  const targetVar = repair_summary?.affected_variable || 'Target';

  const chartPoints = sample_reconstructions.map((pt) => ({
    time: `t_${pt.index}`,
    corrupted: pt.original_corrupted,
    counterfactual: pt.counterfactual_value,
    ground_truth: pt.ground_truth,
    ci_lower: pt.ci_lower,
    ci_upper: pt.ci_upper,
    confidence: pt.confidence,
    method: pt.reconstruction_method,
  }));

  return (
    <div className="space-y-6">
      {/* Reconstruction & Validation Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PHASE IV & V
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Counterfactual Streaming Reconstruction & Causal-Consistency Validation
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Evaluating x^CF = f_i(Pa(X_i)) + û_i with 95% Bayesian confidence bounds and closed-loop validation.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Target Variable:</span>{' '}
              <strong className="text-cyan-400 font-mono">{targetVar}</strong>
            </div>
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">RMSE to Truth:</span>{' '}
              <strong className="text-emerald-400 font-mono">{repair_summary?.rmse.toFixed(3) || '0.000'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Counterfactual Trajectory Visualizer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Counterfactual Trajectory vs Ground Truth & Corrupted Signal
            </h4>
            <span className="text-[11px] text-slate-500">
              Includes 95% Credible Interval [CI_lower, CI_upper]
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-0.5 bg-blue-400"></span> Ground Truth
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-400"></span> Corrupted
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-3 h-0.5 bg-emerald-400"></span> Counterfactual x^CF (Ours)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {/* Shaded 95% Confidence Interval */}
              <Area
                type="monotone"
                dataKey="ci_upper"
                stroke="none"
                fill="#10b981"
                fillOpacity={0.15}
                name="95% Confidence Upper"
              />
              <Area
                type="monotone"
                dataKey="ci_lower"
                stroke="none"
                fill="#0f172a"
                fillOpacity={1.0}
                name="95% Confidence Lower"
              />

              {/* Trajectories */}
              <Line
                type="monotone"
                dataKey="ground_truth"
                name="Healthy Ground Truth"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="corrupted"
                name="Corrupted Observation"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: '#f43f5e' }}
              />
              <Line
                type="monotone"
                dataKey="counterfactual"
                name="Repaired Counterfactual (Ours)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Point-by-point Audit Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>Per-Sample Reconstruction Log & Confidence Ratings</span>
            <span className="text-[11px] text-slate-500 font-normal font-mono">
              ({sample_reconstructions.length} samples evaluated)
            </span>
          </h4>
          <button
            onClick={() => setShowTable(!showTable)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            {showTable ? 'Hide Table' : 'Show All Samples'}
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-3">Idx</th>
                  <th className="py-2 px-3">Corrupted Obs</th>
                  <th className="py-2 px-3">Counterfactual x^CF</th>
                  <th className="py-2 px-3">Ground Truth</th>
                  <th className="py-2 px-3">95% Bounds</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3 font-sans">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sample_reconstructions.map((pt) => (
                  <tr key={pt.index} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-1.5 px-3 text-slate-500">#{pt.index}</td>
                    <td className="py-1.5 px-3 text-rose-400 font-bold">
                      {pt.original_corrupted !== null ? pt.original_corrupted : 'NaN (Missing)'}
                    </td>
                    <td className="py-1.5 px-3 text-emerald-400 font-bold">{pt.counterfactual_value}</td>
                    <td className="py-1.5 px-3 text-cyan-300">{pt.ground_truth}</td>
                    <td className="py-1.5 px-3 text-slate-400 text-[11px]">
                      [{pt.ci_lower}, {pt.ci_upper}]
                    </td>
                    <td className="py-1.5 px-3 text-amber-400 font-bold">
                      {(pt.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-3 font-sans text-[11px] text-slate-300">
                      {pt.reconstruction_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
