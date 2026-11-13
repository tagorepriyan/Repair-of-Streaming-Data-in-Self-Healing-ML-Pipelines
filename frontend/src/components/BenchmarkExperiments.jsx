import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { experimentService } from '../services/api';
import { BarChart3, Play, Loader2, Award, Zap, Layers, FileSpreadsheet, Scale, Info, CheckCircle2 } from 'lucide-react';

export default function BenchmarkExperiments() {
  const [activeSubTab, setActiveSubTab] = useState('baselines'); // 'baselines', 'ablations', 'sweep', 'reference'
  const [corruptionType, setCorruptionType] = useState('noise');
  const [targetVar, setTargetVar] = useState('Flow');
  const [severity, setSeverity] = useState(2.5);
  const [isRunning, setIsRunning] = useState(false);

  // Baselines state
  const [baselinesData, setBaselinesData] = useState([]);
  // Ablations state
  const [ablationsData, setAblationsData] = useState([]);
  // Sweep state
  const [sweepResults, setSweepResults] = useState([]);
  // Paper reference state
  const [paperReference, setPaperReference] = useState([]);

  // Fetch initial paper reference
  useEffect(() => {
    const fetchRef = async () => {
      try {
        const res = await experimentService.getPaperReference();
        if (res.data?.reference_results) {
          setPaperReference(res.data.reference_results);
        }
      } catch (e) {
        console.error('Failed to load reference results:', e);
      }
    };
    fetchRef();
  }, []);

  // Run 8 Baselines Real Compute
  const handleRunBaselines = async () => {
    setIsRunning(true);
    try {
      const res = await experimentService.runBaselines({
        corruption_type: corruptionType,
        target_var: targetVar,
        severity: severity,
        window_size: 150,
      });
      if (res.data?.baselines) {
        setBaselinesData(res.data.baselines);
      }
    } catch (e) {
      console.error('Baselines run failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  // Run Ablation Study Real Compute
  const handleRunAblations = async () => {
    setIsRunning(true);
    try {
      const res = await experimentService.runAblations({
        corruption_type: corruptionType,
        target_var: targetVar,
        severity: severity,
        window_size: 150,
      });
      if (res.data?.ablations) {
        setAblationsData(res.data.ablations);
      }
    } catch (e) {
      console.error('Ablation run failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  // Run Severity Sweep
  const handleRunSweep = async () => {
    setIsRunning(true);
    try {
      const res = await experimentService.runSweep({
        corruption_type: corruptionType,
        target_var: targetVar,
        severities: [1.0, 2.0, 3.0, 4.0],
        window_size: 150,
      });
      if (res.data?.sweep_results) {
        setSweepResults(res.data.sweep_results);
      }
    } catch (e) {
      console.error('Sweep failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-Tab Navigation */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                BENCHMARKS & ABLATION
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Experimental Evaluation & Comparative Baselines
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Rigorous empirical evaluation comparing Causal Self-Healing against 8 standard baselines, paper ablations, and published reference values.
            </p>
          </div>

          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubTab('baselines')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'baselines'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              8 Baselines
            </button>
            <button
              onClick={() => setActiveSubTab('ablations')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'ablations'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ablation Study
            </button>
            <button
              onClick={() => setActiveSubTab('sweep')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'sweep'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Severity Sweep
            </button>
            <button
              onClick={() => setActiveSubTab('reference')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'reference'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paper Reference
            </button>
          </div>
        </div>

        {/* Global Controls for Active Sub-Tab (if applicable) */}
        {activeSubTab !== 'reference' && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Corruption Mode:</span>
              <select
                value={corruptionType}
                onChange={(e) => setCorruptionType(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-cyan-300 rounded px-2 py-1 outline-none"
              >
                <option value="noise">Gaussian Noise</option>
                <option value="missing_random">Random Missingness</option>
                <option value="missing_burst">Burst Missingness</option>
                <option value="bias">Persistent Bias</option>
                <option value="outlier">Outliers</option>
                <option value="drift">Linear Drift</option>
                <option value="mechanism_shift">Mechanism Degradation</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Target Var:</span>
              <select
                value={targetVar}
                onChange={(e) => setTargetVar(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none"
              >
                <option value="Flow">Flow</option>
                <option value="Pressure">Pressure</option>
                <option value="Power">Power</option>
                <option value="ActuatorState">ActuatorState</option>
              </select>
            </div>

            {activeSubTab !== 'sweep' && (
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Severity:</span>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={severity}
                  onChange={(e) => setSeverity(parseFloat(e.target.value))}
                  className="w-20 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono text-cyan-400">{severity}x</span>
              </div>
            )}

            <button
              onClick={
                activeSubTab === 'baselines'
                  ? handleRunBaselines
                  : activeSubTab === 'ablations'
                  ? handleRunAblations
                  : handleRunSweep
              }
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 ml-auto"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Computing...' : 'Run Real Experiment'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: 8 Canonical Baselines */}
      {activeSubTab === 'baselines' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                Comparison Across 8 Baselines (Section 17 Requirements)
              </h4>
              <span className="text-xs text-slate-500">Evaluated on identical streaming window</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Method Name</th>
                    <th className="py-3 px-3">Paradigm</th>
                    <th className="py-3 px-3">MAE (Reconstruction)</th>
                    <th className="py-3 px-3">RMSE</th>
                    <th className="py-3 px-3">Downstream F1</th>
                    <th className="py-3 px-3">Accuracy</th>
                    <th className="py-3 px-3">Causal Deviation D_c</th>
                    <th className="py-3 px-3">Latency (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {baselinesData.length > 0 ? (
                    baselinesData.map((b) => {
                      const isOurs = b.name.includes('(Ours)');
                      return (
                        <tr
                          key={b.name}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isOurs ? 'bg-cyan-950/20 font-bold' : ''
                          }`}
                        >
                          <td className={`py-2.5 px-3 font-sans ${isOurs ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}>
                            {b.name}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{b.type}</td>
                          <td className="py-2.5 px-3 text-slate-300">{b.mae.toFixed(4)}</td>
                          <td className="py-2.5 px-3 text-slate-300">{b.rmse.toFixed(4)}</td>
                          <td className={`py-2.5 px-3 ${b.f1 >= 0.90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {b.f1.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{b.accuracy.toFixed(4)}</td>
                          <td className={`py-2.5 px-3 ${b.causal_deviation < 0.25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {b.causal_deviation.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-cyan-400">{b.latency_ms}ms</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500 font-sans text-xs">
                        Click "Run Real Experiment" above to compute live benchmarks across all 8 baselines!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Ablation Study */}
      {activeSubTab === 'ablations' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Manuscript Ablation Experiments (Section 19: Exp A to E)
              </h4>
              <span className="text-xs text-slate-500">Component Contribution Breakdown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Experiment</th>
                    <th className="py-3 px-3">Ablation Description</th>
                    <th className="py-3 px-3">MAE</th>
                    <th className="py-3 px-3">RMSE</th>
                    <th className="py-3 px-3">Downstream F1</th>
                    <th className="py-3 px-3">Causal Deviation</th>
                    <th className="py-3 px-3">Latency (ms)</th>
                    <th className="py-3 px-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ablationsData.length > 0 ? (
                    ablationsData.map((a) => {
                      const isFull = a.experiment_id === 'Full';
                      return (
                        <tr
                          key={a.experiment_id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isFull ? 'bg-cyan-950/20 font-bold' : ''
                          }`}
                        >
                          <td className={`py-2.5 px-3 font-sans ${isFull ? 'text-cyan-400 font-bold' : 'text-slate-200'}`}>
                            {a.name}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{a.description}</td>
                          <td className="py-2.5 px-3 text-slate-300">{a.mae.toFixed(4)}</td>
                          <td className="py-2.5 px-3 text-slate-300">{a.rmse.toFixed(4)}</td>
                          <td className={`py-2.5 px-3 ${a.f1 >= 0.90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {a.f1.toFixed(4)}
                          </td>
                          <td className={`py-2.5 px-3 ${a.causal_deviation < 0.25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {a.causal_deviation.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-cyan-400">{a.latency_ms}ms</td>
                          <td className="py-2.5 px-3 font-sans text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{a.decision}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500 font-sans text-xs">
                        Click "Run Real Experiment" above to execute the 5 manuscript ablations!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Severity Sweep Charts */}
      {activeSubTab === 'sweep' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* F1 Recovery Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Downstream ML F1 Score vs Corruption Severity
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sweepResults.map((r) => ({
                      severity: `${r.severity}x`,
                      'Corrupted (No Repair)': r.corrupted.f1,
                      'Mean Imputation': r.mean_imputation.f1,
                      'KNN Imputation': r.knn_imputation.f1,
                      'Causal Counterfactual (Ours)': r.causal_counterfactual.f1,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="severity" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" domain={[0.3, 1.0]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Corrupted (No Repair)" stroke="#f43f5e" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="Mean Imputation" stroke="#f59e0b" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="KNN Imputation" stroke="#a855f7" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="Causal Counterfactual (Ours)" stroke="#10b981" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reconstruction RMSE Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Reconstruction RMSE (Lower is Better)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sweepResults.map((r) => ({
                      severity: `${r.severity}x`,
                      'Corrupted': r.corrupted.rmse,
                      'Mean': r.mean_imputation.rmse,
                      'KNN': r.knn_imputation.rmse,
                      'Causal (Ours)': r.causal_counterfactual.rmse,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="severity" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Corrupted" fill="#f43f5e" />
                    <Bar dataKey="Mean" fill="#f59e0b" />
                    <Bar dataKey="KNN" fill="#a855f7" />
                    <Bar dataKey="Causal (Ours)" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Paper Reference Results (Honest Reporting) */}
      {activeSubTab === 'reference' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Reference Results Reported in IEEE Manuscript (Section 32)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              These are the empirical benchmark reference results published directly in the IEEE paper manuscript. They represent baseline ground truth for reproduction and verification rather than runtime re-computations.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">MAE (Mean ± Std)</th>
                    <th className="py-3 px-3">RMSE (Mean ± Std)</th>
                    <th className="py-3 px-3">Downstream F1</th>
                    <th className="py-3 px-3">Manuscript Research Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {paperReference.map((ref) => (
                    <tr key={ref.method} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans text-cyan-400 font-bold">{ref.method}</td>
                      <td className="py-2.5 px-3 text-slate-200">{ref.mae}</td>
                      <td className="py-2.5 px-3 text-slate-200">{ref.rmse}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{ref.f1}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">{ref.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Academic Transparency Alert */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-blue-500/30 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Info className="w-4 h-4" />
                <span>Honest Scientific Evaluation Principles (Section 31 & 42):</span>
              </div>
              <p className="text-slate-400 leading-relaxed font-sans">
                As explicitly emphasized in the paper, KNN achieves lower reconstruction MAE because local distance weighting excels at smoothing numerical features, and uncorrupted baseline features may maintain high F1 when target relationships are not fully destroyed. The core contribution of the proposed Dynamic Causal-Consistency Framework is not claiming unconditional superiority on point prediction, but rather provable structural causal restoration (reducing graph deviation D_c) and an autonomous validation gate that prevents downstream ML contamination.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
