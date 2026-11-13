import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, Search, Filter, ShieldCheck, Activity } from 'lucide-react';

export default function LiveStreamView({ latestData, history }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCorruptedOnly, setFilterCorruptedOnly] = useState(false);

  const observations = latestData?.observations || [];
  const currentWindow = latestData?.window_id || 0;
  const isCorruptedWindow = latestData?.corruption_meta?.is_corrupted || false;
  const corruptedVar = latestData?.corruption_meta?.affected_variable;
  const repairSummary = latestData?.repair_summary;

  const filteredObservations = observations.filter((row) => {
    if (filterCorruptedOnly && !row.is_corrupted) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.timestamp.toString().includes(term) ||
      (row.corrupted_variable && row.corrupted_variable.toLowerCase().includes(term)) ||
      (row.repaired_variable && row.repaired_variable.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Live Stream Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                LIVE INGESTION
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Streaming Observations & Dynamic State (Window W_{currentWindow})
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Per-sample telemetry streaming through the SCM pipeline with ground-truth preservation and counterfactual repair tagging.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
              isCorruptedWindow
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              {isCorruptedWindow ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isCorruptedWindow ? `Corrupted: ${corruptedVar}` : 'Healthy Window'}</span>
            </div>

            {repairSummary && repairSummary.num_repaired_samples > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Repaired: {repairSummary.affected_variable} ({repairSummary.decision})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by timestamp or variable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto justify-end">
          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCorruptedOnly}
              onChange={(e) => setFilterCorruptedOnly(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Show Corrupted Rows Only</span>
          </label>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-xs">
            Showing {filteredObservations.length} of {observations.length} rows
          </span>
        </div>
      </div>

      {/* Observation Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Temperature</th>
                <th className="py-3 px-3">Pressure</th>
                <th className="py-3 px-3">Flow</th>
                <th className="py-3 px-3">Vibration</th>
                <th className="py-3 px-3">Power</th>
                <th className="py-3 px-3">ActuatorState</th>
                <th className="py-3 px-3">FailureRisk (Y)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Counterfactual Repair</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredObservations.length > 0 ? (
                filteredObservations.map((row) => {
                  const isCorruptedRow = row.is_corrupted;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCorruptedRow ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-500">{row.id}</td>
                      <td className="py-2.5 px-3 text-cyan-400">{row.timestamp}s</td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'Temperature' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.Temperature !== null ? row.Temperature.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'Pressure' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.Pressure !== null ? row.Pressure.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'Flow' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.Flow !== null ? row.Flow.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'Vibration' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.Vibration !== null ? row.Vibration.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'Power' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.Power !== null ? row.Power.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className={`py-2.5 px-3 ${row.corrupted_variable === 'ActuatorState' ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                        {row.ActuatorState !== null ? row.ActuatorState.toFixed(2) : <span className="text-rose-400 font-bold">NaN</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.FailureRisk === 1
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {row.FailureRisk === 1 ? '1 (FAULT)' : '0 (NORMAL)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {isCorruptedRow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-sans font-semibold">
                            Corrupted ({row.corrupted_variable})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-sans font-medium">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {row.repaired_value !== null ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                            <span>x^CF = {row.repaired_value.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 font-sans">({row.repaired_variable})</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="py-8 text-center text-slate-500 text-xs font-sans">
                    No observations found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
