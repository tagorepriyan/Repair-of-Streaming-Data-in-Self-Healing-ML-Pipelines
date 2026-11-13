import React, { useState, useEffect } from 'react';
import { repairService } from '../services/api';
import { History, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle, Search, RefreshCw, FileText } from 'lucide-react';

export default function ProvenanceView() {
  const [auditRecords, setAuditRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchProvenance = async () => {
    setLoading(true);
    try {
      const res = await repairService.getProvenance();
      if (res.data?.audit_trail) {
        setAuditRecords(res.data.audit_trail);
      }
    } catch (e) {
      console.error('Failed to load provenance records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvenance();
  }, []);

  const filtered = auditRecords.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.repair_id.toLowerCase().includes(term) ||
      r.affected_variable.toLowerCase().includes(term) ||
      r.decision.toLowerCase().includes(term) ||
      r.corruption_type.toLowerCase().includes(term)
    );
  });

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'ACCEPT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ACCEPT
          </span>
        );
      case 'ESCALATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ESCALATE
          </span>
        );
      case 'REJECT':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            REJECT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                AUDIT LOG
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                Immutable Provenance & Decision Audit Trail
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete traceable record of every degraded streaming window, counterfactual repair, causal validation metric, and operator decision.
            </p>
          </div>

          <button
            onClick={fetchProvenance}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

      {/* Search and Records Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Repair ID, variable, or decision..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Stored Audit Records: <strong className="text-purple-400">{filtered.length}</strong>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-3">Repair ID</th>
                <th className="py-3 px-3">Window</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Target Variable</th>
                <th className="py-3 px-3">Corruption Mode</th>
                <th className="py-3 px-3">Pre-Repair D_c</th>
                <th className="py-3 px-3">Acceptance R</th>
                <th className="py-3 px-3">Decision</th>
                <th className="py-3 px-3">Restoration %</th>
                <th className="py-3 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length > 0 ? (
                filtered.map((record) => (
                  <tr
                    key={record.repair_id}
                    onClick={() => setSelectedRecord(record)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 text-purple-400 font-bold">{record.repair_id}</td>
                    <td className="py-2.5 px-3 text-cyan-400">W_{record.window_id}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{record.timestamp}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-bold">{record.affected_variable}</td>
                    <td className="py-2.5 px-3 text-amber-300 font-sans">{record.corruption_type}</td>
                    <td className="py-2.5 px-3 text-rose-400">{record.causal_deviation_before.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{(record.acceptance_score * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">{getDecisionBadge(record.decision)}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{record.causal_restoration_pct.toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-sans flex items-center gap-1 border border-slate-700"
                      >
                        <FileText className="w-3 h-3 text-purple-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-500 font-sans">
                    No provenance records found. Step streaming windows to generate audit records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Provenance Record: {selectedRecord.repair_id}</h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 text-[11px] font-sans">Window ID:</span>
                  <div className="text-slate-200">W_{selectedRecord.window_id}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-sans">Timestamp:</span>
                  <div className="text-slate-200">{selectedRecord.timestamp}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-sans">Variable:</span>
                  <div className="text-cyan-400 font-bold">{selectedRecord.affected_variable}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-sans">Corruption:</span>
                  <div className="text-amber-400">{selectedRecord.corruption_type}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Pre-Repair D_c</div>
                  <div className="text-rose-400 font-bold mt-0.5">{selectedRecord.causal_deviation_before.toFixed(3)}</div>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Score R</div>
                  <div className="text-cyan-400 font-bold mt-0.5">{(selectedRecord.acceptance_score * 100).toFixed(1)}%</div>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Decision</div>
                  <div className="mt-0.5">{getDecisionBadge(selectedRecord.decision)}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold text-[11px]">Audit Decision Explanation:</div>
                <div className="text-slate-300 leading-relaxed">{selectedRecord.reason}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-all"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
