import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ControlPanel from './components/ControlPanel';
import MonitoringDashboard from './components/MonitoringDashboard';
import LiveStreamView from './components/LiveStreamView';
import CausalGraphViewer from './components/CausalGraphViewer';
import LocalizationPanel from './components/LocalizationPanel';
import ReconstructionView from './components/ReconstructionView';
import ValidationView from './components/ValidationView';
import BenchmarkExperiments from './components/BenchmarkExperiments';
import ProvenanceView from './components/ProvenanceView';
import SupervisorDemoMode from './components/SupervisorDemoMode';
import ArchitectureOverview from './components/ArchitectureOverview';
import { streamService, graphService } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [latestData, setLatestData] = useState(null);
  const [history, setHistory] = useState([]);
  const [healthyGraph, setHealthyGraph] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [windowSize, setWindowSize] = useState(100);
  const [corruptionConfig, setCorruptionConfig] = useState({
    enabled: false,
    variable: 'Flow',
    type: 'noise',
    severity: 2.5,
  });

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Initial load
  useEffect(() => {
    const initApp = async () => {
      try {
        const [graphRes, historyRes] = await Promise.all([
          graphService.getHealthy(),
          streamService.getHistory(),
        ]);
        setHealthyGraph(graphRes.data);
        setIsConnected(true);

        if (historyRes.data?.history?.length > 0) {
          setHistory(historyRes.data.history);
          setLatestData(historyRes.data.history[historyRes.data.history.length - 1]);
        } else {
          // Trigger first step
          handleStep();
        }
      } catch (err) {
        console.warn('Initial connection attempt:', err.message);
        setTimeout(initApp, 2000);
      }
    };

    initApp();
  }, []);

  // Step window handler
  const handleStep = async (overrideCorruption = null) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const activeCorruption = overrideCorruption !== null ? overrideCorruption : corruptionConfig;
      const payload = {
        window_size: windowSize,
        inject_corruption: activeCorruption.enabled,
        corruption_type: activeCorruption.type || 'noise',
        affected_variable: activeCorruption.variable || 'Flow',
        severity: activeCorruption.severity !== undefined ? activeCorruption.severity : 2.5,
      };

      const res = await streamService.step(payload);
      const data = res.data;
      setLatestData(data);
      setHistory((prev) => [...prev, data]);
      setIsConnected(true);
    } catch (err) {
      console.error('Step failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch process
  const handleBatch = async (count = 5) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await streamService.batch(count);
      const batchData = res.data;
      if (batchData && batchData.length > 0) {
        setLatestData(batchData[batchData.length - 1]);
        setHistory((prev) => [...prev, ...batchData]);
      }
    } catch (err) {
      console.error('Batch failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset stream
  const handleReset = async () => {
    setIsPlaying(false);
    setIsProcessing(true);
    try {
      await streamService.reset();
      setHistory([]);
      setLatestData(null);
      handleStep({ enabled: false });
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Live Auto-Stream Timer
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (!isProcessing) {
          handleStep();
        }
      }, 2200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isProcessing, windowSize, corruptionConfig]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentWindow={latestData?.window_id || 0}
        isConnected={isConnected}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <ControlPanel
          onStep={() => handleStep()}
          onBatch={handleBatch}
          onReset={handleReset}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          corruptionConfig={corruptionConfig}
          setCorruptionConfig={setCorruptionConfig}
          windowSize={windowSize}
          setWindowSize={setWindowSize}
          isProcessing={isProcessing}
        />

        {activeTab === 'monitoring' && (
          <MonitoringDashboard
            latestData={latestData}
            history={history}
            threshold={healthyGraph?.threshold || 0.25}
          />
        )}

        {activeTab === 'stream' && (
          <LiveStreamView
            latestData={latestData}
            history={history}
          />
        )}

        {activeTab === 'graphs' && (
          <CausalGraphViewer
            healthyGraph={healthyGraph}
            latestData={latestData}
          />
        )}

        {activeTab === 'localization' && (
          <LocalizationPanel
            localizedVariables={latestData?.localized_variables}
            latestData={latestData}
          />
        )}

        {activeTab === 'reconstruction' && (
          <ReconstructionView
            latestData={latestData}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationView
            latestData={latestData}
          />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkExperiments />
        )}

        {activeTab === 'provenance' && (
          <ProvenanceView />
        )}

        {activeTab === 'demo' && (
          <SupervisorDemoMode
            onStep={handleStep}
            onReset={handleReset}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureOverview />
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IEEE Research Project Prototype &copy; 2026. All rights reserved.</span>
          <span className="font-mono text-cyan-500/80">Closed-Loop Dynamic Causal Architecture</span>
        </div>
      </footer>
    </div>
  );
}
