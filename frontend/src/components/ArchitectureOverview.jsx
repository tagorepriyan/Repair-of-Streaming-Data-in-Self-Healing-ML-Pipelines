import React from 'react';
import { Cpu, GitBranch, Shield, ArrowDown, Activity, CheckCircle2 } from 'lucide-react';

export default function ArchitectureOverview() {
  const phases = [
    {
      phase: 'Phase I',
      title: 'Healthy Causal Profiling',
      icon: GitBranch,
      desc: 'Discovers healthy causal graph G_H, estimates nonlinear structural mechanisms f_i(Pa_i), characterizes residual noise distributions u_i ~ N(0, σ_i^2), and calculates adaptive deviation threshold τ_d.',
      math: 'G_H = CausalDiscovery(H), \\quad \\tau_d = \\mu_{D_c} + k \\cdot \\sigma_{D_c}',
    },
    {
      phase: 'Phase II',
      title: 'Dynamic Causal Monitoring',
      icon: Activity,
      desc: 'Monitors incoming streaming window W_t, learns window causal graph G_t, and computes structural divergence D_c(G_H, G_t) based on Structural Hamming Distance and edge differences.',
      math: 'D_c(G_H, G_t) = \\alpha \\cdot \\text{SHD}(G_H, G_t) + (1-\\alpha) \\cdot \\Delta w',
    },
    {
      phase: 'Phase III',
      title: 'Degraded Variable Localization',
      icon: Cpu,
      desc: 'Identifies candidate degraded variables without modifying healthy dimensions. Evaluates residual Z-shifts and Markov Blanket incident edge variations to rank suspect variables.',
      math: 'S(X_i) = \\beta_1 \\frac{|r_i - \\mu_{u_i}|}{\\sigma_{u_i}} + \\beta_2 \\sum_{e \\in MB(X_i)} |\\Delta w_e|',
    },
    {
      phase: 'Phase IV',
      title: 'Counterfactual Reconstruction',
      icon: Shield,
      desc: 'Applies causal abduction-action-prediction: infers disturbance û_i via Bayesian shrinkage or conditional sampling, fixing uncorrupted parent states, producing x^CF with 95% credible intervals.',
      math: 'x^{CF}_i = f_i(\\text{Pa}(X_i), \\hat{u}_i), \\quad \\text{CI}_{95\\%} = x^{CF} \\pm 1.96 \\cdot \\sigma_{u_i}',
    },
    {
      phase: 'Phase V',
      title: 'Causal-Consistency Validation',
      icon: CheckCircle2,
      desc: 'Generates post-repair graph G_R and calculates acceptance score R. Tri-state decision logic: ACCEPT (stream repaired data), ESCALATE (manual review), or REJECT (exclude window).',
      math: 'R = \\gamma_1 (\\%\\text{Restoration}) + \\gamma_2 (1 - D_c^{post}) + \\gamma_3 (\\text{Residual Consistency})',
    },
    {
      phase: 'Phase VI',
      title: 'Self-Healing ML Pipeline',
      icon: Cpu,
      desc: 'Stream validated repaired window to downstream classification model (e.g. FailureRisk prediction), preserving downstream accuracy and F1 score without catastrophic corruption drift.',
      math: '\\hat{Y} = M_{\\theta}(W^R), \\quad \\text{Self-Healing Gain} = F1(W^R) - F1(W^C)',
    },
  ];

  const equations = [
    { name: 'X1 = Temperature', eq: 'Base exogenous process with diurnal sinusoids + u_temp' },
    { name: 'X2 = Pressure', eq: '50.0 + 1.8 * (Temp - 25.0) + 0.03 * (Temp - 25.0)^2 + u_pres' },
    { name: 'X4 = Vibration', eq: '10.0 + 0.9 * (Temp - 25.0) + 0.4 * sin(Temp) + u_vib' },
    { name: 'X3 = Flow', eq: '30.0 + 2.2 * (Pres - 50.0) - 0.7 * (Temp - 25.0) + 0.5 * (Vib - 10.0) + u_flow' },
    { name: 'X5 = Power', eq: '80.0 + 1.4 * (Flow - 30.0) + 1.1 * (Vib - 10.0) + 0.05 * (Flow - 30.0)*(Vib - 10.0) + u_pow' },
    { name: 'X6 = ActuatorState', eq: '40.0 + 0.85 * (Power - 80.0) + 1.3 * (Flow - 30.0) + u_act' },
    { name: 'Y  = FailureRisk', eq: 'Bernoulli(σ(0.04*(Act - 40) + 0.03*(Pres - 50) - 0.02*(Flow - 30) + u_fail))' },
  ];

  return (
    <div className="space-y-6">
      {/* Framework Summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-base font-bold text-white mb-2">
          IEEE Research Architecture: Closed-Loop Dynamic Causal-Consistency Framework
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Modern streaming ML pipelines fail catastrophically when sensor faults, noise, or drift corrupt incoming features.
          Standard imputation methods (mean, median, KNN) ignore underlying structural causal mechanisms, introducing spurious correlations.
          This framework establishes a dynamic closed-loop system: profiling healthy causal structures, continuously monitoring structural divergence,
          localizing affected nodes via Markov blankets, repairing values counterfactually, and validating causal consistency before passing data downstream.
        </p>
      </div>

      {/* 6 Phases Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {phases.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.phase} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-cyan-400 font-mono">{p.phase}</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{p.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.desc}</p>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300">
                {p.math}
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthetic SCM Structural Equations Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>Synthetic Structural Causal Model (SCM) Equations</span>
          <span className="text-xs font-normal text-slate-400">(Nonlinear Ground Truth)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {equations.map((eq) => (
            <div key={eq.name} className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-cyan-400 font-bold block mb-1">{eq.name}</span>
              <span className="text-slate-300 text-[11px]">{eq.eq}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
