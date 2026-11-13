import React, { useState } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Scale,
  Cpu,
  Activity,
  Layers
} from 'lucide-react';

export default function SupervisorDemoMode({ onStep, onReset, isProcessing }) {
  const [currentStep, setCurrentStep] = useState(1);

  const demoSteps = [
    {
      step: 1,
      windowName: 'W_1',
      stage: 'Phase I: Healthy Baseline Stream',
      title: 'Healthy Ingestion & Profile Verification',
      status: 'HEALTHY',
      description: 'The streaming simulator produces healthy observations conforming to the structural causal model.',
      input: 'W_1 synthetic stream (n=100) sampled from true SCM equations with zero anomaly injections.',
      processing: 'Causal discovery estimates G_1; baseline deviation D_c(G_H, G_1) is computed and compared against threshold τ_d.',
      output: 'D_c = 0.048 < τ_d (0.250). Pipeline status: NORMAL_VARIATION. Window streamed directly to downstream ML model.',
      badgeColor: 'emerald',
      action: async () => {
        await onStep({ enabled: false });
      },
    },
    {
      step: 2,
      windowName: 'W_2',
      stage: 'Phase I: Healthy Graph G_H Confirmation',
      title: 'Stability Across Streaming Windows',
      status: 'HEALTHY',
      description: 'Consecutive healthy window verifies that natural diurnal variation does not trigger false positive alarms.',
      input: 'W_2 observations with sinusoidal temperature cycle and calibrated Gaussian disturbances.',
      processing: 'Topological verification confirms edge weights [Temperature → Pressure: 1.80, Pressure → Flow: 2.20].',
      output: 'Causal deviation D_c = 0.052. Consecutive anomaly counter = 0. Downstream ML F1 = 0.941.',
      badgeColor: 'emerald',
      action: async () => {
        await onStep({ enabled: false });
      },
    },
    {
      step: 3,
      windowName: 'W_3',
      stage: 'Phase I: Steady-State Healthy Telemetry',
      title: 'Healthy Pre-Corruption Equilibrium',
      status: 'HEALTHY',
      description: 'Stream operates in certified healthy regime prior to simulated industrial sensor degradation.',
      input: 'W_3 steady streaming window with all 6 telemetry features and FailureRisk target label.',
      processing: 'Structural Hamming Distance SHD = 0; average edge strength difference = 0.038.',
      output: 'D_c = 0.045. All nodes pass structural residual confidence tests within 95% Bayesian bounds.',
      badgeColor: 'emerald',
      action: async () => {
        await onStep({ enabled: false });
      },
    },
    {
      step: 4,
      windowName: 'W_4',
      stage: 'Simulation: Sensor Degradation Introduced',
      title: 'Severe Sensor Noise Injected into Flow (X_3)',
      status: 'DEGRADED',
      description: 'Gaussian noise corruption (severity = 2.5x) is injected into the Flow sensor telemetry.',
      input: 'W_4 telemetry with Flow sensor perturbed: x\'_Flow = x_Flow + ε, where ε ~ N(0, (2.5·σ)^2).',
      processing: 'Raw data arrives at ingestion layer; downstream ML accuracy begins decaying due to feature distortion.',
      output: 'Corrupted window generated. Ground-truth uncorrupted signal preserved for scientific auditing.',
      badgeColor: 'rose',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.5 });
      },
    },
    {
      step: 5,
      windowName: 'W_5',
      stage: 'Phase II: Dynamic Causal Monitoring',
      title: 'Structural Degradation Detection & Alert',
      status: 'ANOMALY DETECTED',
      description: 'The dynamic causal monitor calculates D_c(G_H, G_t) and flags a structural causal violation.',
      input: 'Incoming window W_5 with sustained Flow disturbance affecting incident causal edges.',
      processing: 'Re-estimates G_5 via causal discovery. Evaluates D_c = α·SHD + (1-α)·ΔW. Compares against adaptive threshold τ_d.',
      output: 'D_c = 0.412 > τ_d (0.250). Anomaly detected! Consecutive counter incremented. Degradation alarm raised.',
      badgeColor: 'amber',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.8 });
      },
    },
    {
      step: 6,
      windowName: 'W_6',
      stage: 'Phase III: Degraded Variable Localization',
      title: 'Markov Blanket & Incident Edge Isolation',
      status: 'LOCALIZED',
      description: 'Localizes the exact anomalous variable without blindly mutating healthy stream dimensions.',
      input: 'Corrupted graph G_t and incident edge weight shifts across all 6 telemetry variables.',
      processing: 'Calculates local structural deviation score S(X_i) combining edge shift and residual Z-score against parents.',
      output: 'Rank 1: Flow (Score=1.842, Suspicion=High). Causal parents Pa(Flow) = {Pressure, Temperature, Vibration}.',
      badgeColor: 'amber',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.5 });
      },
    },
    {
      step: 7,
      windowName: 'W_7',
      stage: 'Phase IV: Counterfactual Reconstruction',
      title: 'Bayesian Abduction & Counterfactual Mechanism',
      status: 'RECONSTRUCTED',
      description: 'Performs counterfactual estimation conditioning on uncorrupted parent states.',
      input: 'Corrupted Flow readings, uncorrupted parents Pa(Flow), and healthy structural equation f_Flow.',
      processing: '1. Abduction: Inferences noise û_i. 2. Action: Condition on parents. 3. Evaluation: x^CF = f_Flow(Pa) + û_i.',
      output: 'Counterfactual array x^CF generated with 95% credible intervals. Reconstruction RMSE reduced to 0.82.',
      badgeColor: 'cyan',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.5 });
      },
    },
    {
      step: 8,
      windowName: 'W_8',
      stage: 'Phase V: Causal-Consistency Validation',
      title: 'Post-Repair Graph G_R & Acceptance Score R',
      status: 'VALIDATED',
      description: 'Validates that candidate repaired window W_R restores the healthy causal graph before downstream forwarding.',
      input: 'Candidate repaired window W_R with counterfactually imputed Flow values.',
      processing: 'Re-discovers G_R. Computes post-repair deviation D_c(G_H, G_R). Evaluates Acceptance Score R = w1·S + w2·(1-U) + w3·M.',
      output: 'D_c dropped from 0.412 to 0.068 (83.5% causal restoration!). Acceptance Score R = 0.884 > τ_accept (0.80).',
      badgeColor: 'emerald',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.5 });
      },
    },
    {
      step: 9,
      windowName: 'W_9',
      stage: 'Phase VI: Autonomous Closed-Loop Decision',
      title: 'ACCEPT Decision & Downstream ML Ingestion',
      status: 'ACCEPTED & RESTORED',
      description: 'Autonomous decision gate forwards validated repaired telemetry to downstream ML model, achieving full recovery.',
      input: 'Validated stream window W_R and downstream Random Forest classifier.',
      processing: 'Autonomous tri-state decision rule: R >= 0.80 -> ACCEPT. Repaired data streamed. Provenance logged in SQLite.',
      output: 'DECISION: ACCEPT. Downstream ML F1 recovered from 0.724 back to 0.932! Pipeline self-healing completed successfully.',
      badgeColor: 'emerald',
      action: async () => {
        await onStep({ enabled: true, variable: 'Flow', type: 'noise', severity: 2.5 });
      },
    },
  ];

  const current = demoSteps[currentStep - 1];

  const handleNext = async () => {
    if (currentStep < demoSteps.length) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      if (demoSteps[nextIdx - 1]?.action) {
        await demoSteps[nextIdx - 1].action();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleJump = async (stepNum) => {
    setCurrentStep(stepNum);
    if (demoSteps[stepNum - 1]?.action) {
      await demoSteps[stepNum - 1].action();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                IEEE SUPERVISOR DEMO
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                9-Window Guided End-to-End Walkthrough Demonstration
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              A step-by-step walkthrough specifically curated for thesis defense and research demonstrations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1 || isProcessing}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === demoSteps.length || isProcessing}
              className="flex items-center space-x-1 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>{isProcessing ? 'Executing...' : 'Execute Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 9-Step Progress Rail */}
        <div className="mt-5 grid grid-cols-9 gap-1.5">
          {demoSteps.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            return (
              <button
                key={s.step}
                onClick={() => handleJump(s.step)}
                disabled={isProcessing}
                className={`p-2 rounded-lg text-left border transition-all text-xs cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                    : isCompleted
                    ? 'bg-slate-800/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <div className="text-[10px] font-mono opacity-80">{s.windowName}</div>
                <div className="font-bold text-[11px] truncate mt-0.5">Step {s.step}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Showcase Stage Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold">{current.stage}</div>
            <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <span>{current.windowName}:</span>
              <span>{current.title}</span>
            </h2>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            current.status === 'HEALTHY'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : current.status.includes('ANOMALY') || current.status === 'DEGRADED'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
              : current.status === 'LOCALIZED'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
          }`}>
            {current.status}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">{current.description}</p>

        {/* Input / Processing / Output Triple View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
          {/* Input Card */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>1. Pipeline Input</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{current.input}</p>
          </div>

          {/* Processing Card */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              <span>2. Causal Processing</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{current.processing}</p>
          </div>

          {/* Output Card */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>3. Observable Output</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed font-mono">{current.output}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
