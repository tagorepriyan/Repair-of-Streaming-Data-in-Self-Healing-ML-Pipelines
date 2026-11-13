import React from 'react';
import {
  Activity,
  Database,
  GitCommit,
  Sliders,
  ShieldCheck,
  Scale,
  BarChart3,
  History,
  Sparkles,
  Cpu,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentWindow, isConnected }) {
  const navItems = [
    { id: 'monitoring', label: '1. Pipeline Monitor', icon: Activity },
    { id: 'stream', label: '2. Live Stream Data', icon: Database },
    { id: 'graphs', label: '3. Causal Graphs', icon: GitCommit },
    { id: 'localization', label: '4. Localization', icon: Sliders },
    { id: 'reconstruction', label: '5. CF Reconstruction', icon: ShieldCheck },
    { id: 'validation', label: '6. Causal Validation', icon: Scale },
    { id: 'benchmarks', label: '7. Benchmarks & Ablations', icon: BarChart3 },
    { id: 'provenance', label: '8. Provenance Audit', icon: History },
    { id: 'demo', label: '9. Supervisor Demo', icon: Sparkles },
    { id: 'architecture', label: '10. SCM Architecture', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        {/* Brand & Connection Badge */}
        <div className="flex items-center space-x-3 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GitCommit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  IEEE RESEARCH PROTOTYPE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {isConnected ? 'ONLINE' : 'CONNECTING'}
                </span>
              </div>
              <h1 className="text-xs md:text-sm font-bold text-white tracking-wide mt-0.5">
                Dynamic Causal-Consistency Framework <span className="text-slate-400 font-normal">| Self-Healing ML</span>
              </h1>
            </div>
          </div>

          <div className="xl:hidden bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 text-[10px]">Window:</span>
            <span className="font-mono font-bold text-cyan-400">W_{currentWindow || 0}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto max-w-full pb-1 xl:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Current Window Status (Desktop) */}
        <div className="hidden xl:flex items-center space-x-3 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center space-x-2">
            <span className="text-slate-400">Active Window:</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">W_{currentWindow || 0}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
