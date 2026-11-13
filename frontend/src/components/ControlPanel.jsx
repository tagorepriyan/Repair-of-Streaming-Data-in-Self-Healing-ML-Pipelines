import React, { useState } from 'react';
import { Play, Pause, StepForward, RotateCcw, AlertTriangle, FastForward, Sliders } from 'lucide-react';

export default function ControlPanel({
  onStep,
  onBatch,
  onReset,
  isPlaying,
  setIsPlaying,
  corruptionConfig,
  setCorruptionConfig,
  windowSize,
  setWindowSize,
  isProcessing
}) {
  const variables = ['Flow', 'Pressure', 'Temperature', 'Vibration', 'Power', 'ActuatorState'];
  const corruptionTypes = [
    { id: 'noise', label: 'Gaussian Noise (x\' = x + ε)' },
    { id: 'missing_random', label: 'Random Missingness' },
    { id: 'missing_burst', label: 'Contiguous Burst Missingness' },
    { id: 'bias', label: 'Persistent Bias (x\' = x + b)' },
    { id: 'outlier', label: 'Outlier Injection' },
    { id: 'drift', label: 'Gradual Linear Drift (x\'_t = x_t + λt)' },
    { id: 'distribution_shift', label: 'Distribution Shift' },
    { id: 'mechanism_shift', label: 'Mechanism Degradation (f_i → f_i\')' },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Stream Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onStep()}
            disabled={isProcessing || isPlaying}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <StepForward className="w-4 h-4" />
            <span>Step Window</span>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isProcessing}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause Stream' : 'Live Stream'}</span>
          </button>

          <button
            onClick={() => onBatch(5)}
            disabled={isProcessing || isPlaying}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <FastForward className="w-4 h-4 text-cyan-400" />
            <span>+5 Windows</span>
          </button>

          <button
            onClick={onReset}
            disabled={isProcessing || isPlaying}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-850 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-lg text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stream</span>
          </button>

          <div className="h-6 w-px bg-slate-700/60 mx-1 hidden sm:block"></div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Window Size:</span>
            <select
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              disabled={isPlaying}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value={50}>50 samples</option>
              <option value={100}>100 samples</option>
              <option value={200}>200 samples</option>
            </select>
          </div>
        </div>

        {/* Dynamic Corruption Injection Controller */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 w-full lg:w-auto">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="inject-toggle"
              checked={corruptionConfig.enabled}
              onChange={(e) => setCorruptionConfig({ ...corruptionConfig, enabled: e.target.checked })}
              className="w-4 h-4 text-amber-500 bg-slate-800 border-slate-700 rounded focus:ring-amber-400 cursor-pointer"
            />
            <label htmlFor="inject-toggle" className="text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Inject Corruption</span>
            </label>
          </div>

          {corruptionConfig.enabled && (
            <>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400">Var:</span>
                <select
                  value={corruptionConfig.variable}
                  onChange={(e) => setCorruptionConfig({ ...corruptionConfig, variable: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-cyan-300 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  {variables.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400">Mode:</span>
                <select
                  value={corruptionConfig.type}
                  onChange={(e) => setCorruptionConfig({ ...corruptionConfig, type: e.target.value })}
                  className="bg-slate-800 border border-slate-700 text-amber-300 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-amber-500 outline-none max-w-[190px] truncate"
                >
                  {corruptionTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400">Severity:</span>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={corruptionConfig.severity}
                  onChange={(e) => setCorruptionConfig({ ...corruptionConfig, severity: parseFloat(e.target.value) })}
                  className="w-16 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-amber-400 w-6">{corruptionConfig.severity}x</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
