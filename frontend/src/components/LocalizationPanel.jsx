import React, { useState } from 'react';
import { Sliders, AlertTriangle, ShieldAlert, CheckCircle, Search, ArrowRight } from 'lucide-react';

export default function LocalizationPanel({ localizedVariables, latestData }) {
  const [selectedVar, setSelectedVar] = useState(null);

  const variables = localizedVariables && localizedVariables.length > 0
    ? localizedVariables
    : [
        {
          rank: 1,
          variable: 'Flow',
          local_score: 1.842,
          suspicion_level: 'High',
          residual_shift: 2.31,
          edge_shift: 0.48,
          parents: ['Pressure', 'Temperature', 'Vibration'],
          children: ['Power', 'ActuatorState'],
          markov_blanket: ['Pressure', 'Temperature', 'Vibration', 'Power', 'ActuatorState'],
          explanation: 'High structural residual shift (Z=2.31) and degradation on incident edges from parents.',
        },
        {
          rank: 2,
          variable: 'Pressure',
          local_score: 0.812,
          suspicion_level: 'Medium',
          residual_shift: 0.94,
          edge_shift: 0.22,
          parents: ['Temperature'],
          children: ['Flow', 'FailureRisk'],
          markov_blanket: ['Temperature', 'Flow', 'Vibration', 'FailureRisk'],
          explanation: 'Moderate residual variance coupled with child Flow degradation.',
        },
        {
          rank: 3,
          variable: 'Power',
          local_score: 0.354,
          suspicion_level: 'Low',
          residual_shift: 0.28,
          edge_shift: 0.11,
          parents: ['Flow', 'Vibration'],
          children: ['ActuatorState'],
          markov_blanket: ['Flow', 'Vibration', 'ActuatorState'],
          explanation: 'Downstream transmission from upstream parent Flow; within normal bounds.',
        },
      ];

  const active = selectedVar || variables[0];

  const getSuspicionBadge = (level) => {
    switch (level) {
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            High Priority
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Phase III: Degraded Variable Localization & Markov Blanket Ranking
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Selectively localizes anomalous variables without blindly mutating healthy stream dimensions.
            </p>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2">
            <span>Primary Candidate for Repair:</span>
            <span className="font-bold text-rose-400 font-mono text-sm">{variables[0]?.variable || 'None'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranked Variables Table */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ranked Degradation Suspects (Local Deviation Score S(X_i))
            </h4>
            <span className="text-xs text-slate-500">Sorted by structural impact</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Variable</th>
                  <th className="py-2.5 px-3">Suspicion</th>
                  <th className="py-2.5 px-3">Score S(X_i)</th>
                  <th className="py-2.5 px-3">Residual Shift</th>
                  <th className="py-2.5 px-3">Edge Shift</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {variables.map((item) => {
                  const isSelected = active?.variable === item.variable;
                  return (
                    <tr
                      key={item.variable}
                      onClick={() => setSelectedVar(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-950/40 text-blue-200' : 'hover:bg-slate-800/30 text-slate-300'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-400">#{item.rank}</td>
                      <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                        <span className="text-cyan-400">{item.variable}</span>
                      </td>
                      <td className="py-3 px-3 font-sans">{getSuspicionBadge(item.suspicion_level)}</td>
                      <td className="py-3 px-3 font-bold text-amber-400">
                        {item.local_score?.toFixed(3) || '0.000'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {item.residual_shift?.toFixed(3) || '0.000'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {item.edge_shift?.toFixed(3) || '0.000'}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <button
                          onClick={() => setSelectedVar(item)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Variable Neighborhood & Markov Blanket Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Causal Neighborhood & Markov Blanket
              </span>
              <span className="font-mono text-xs font-bold text-cyan-400">{active?.variable}</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Localization Diagnosis:</span>
                <p className="text-slate-200 text-xs leading-relaxed font-sans">{active?.explanation}</p>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5 font-medium">
                  Direct Parents Pa({active?.variable}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {active?.parents?.length > 0 ? (
                    active.parents.map((p) => (
                      <span key={p} className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-mono border border-blue-500/30">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">No causal parents (Exogenous source)</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5 font-medium">
                  Direct Children Ch({active?.variable}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {active?.children?.length > 0 ? (
                    active.children.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-mono border border-purple-500/30">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">No causal children</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5 font-medium">
                  Full Markov Blanket MB({active?.variable}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {active?.markov_blanket?.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[11px] font-mono border border-emerald-500/20">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Shields downstream nodes from spurious bias</span>
            <span className="font-mono text-cyan-400">MB Size: {active?.markov_blanket?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
