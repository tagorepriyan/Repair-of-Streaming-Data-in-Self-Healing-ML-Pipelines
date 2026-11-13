import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from .graph_metrics import compute_causal_deviation, graph_to_dict
from .discovery import CausalDiscoveryEngine

class HealthyCausalProfiler:
    """
    Phase I — Healthy Causal Profiling
    Estimates healthy causal graph GH, baseline mechanisms f_i, noise distributions u_i,
    and sliding-window baseline distribution of D_c to derive adaptive threshold tau_d.
    """

    def __init__(self, discovery_method: str = "known_scm", alpha: float = 0.7):
        self.discovery_engine = CausalDiscoveryEngine(method=discovery_method)
        self.alpha = alpha
        self.GH: Optional[nx.DiGraph] = None
        self.mechanisms: Dict[str, Any] = {}
        self.noise_params: Dict[str, Dict[str, float]] = {}
        self.var_stats: Dict[str, Dict[str, float]] = {}
        self.baseline_deviations: List[float] = []
        self.tau_d: float = 0.25

    def fit(self, healthy_data: pd.DataFrame, window_size: int = 100) -> Dict[str, Any]:
        """
        Fits GH, mechanisms, noise distributions, and computes adaptive threshold tau_d.
        """
        # 1. Discover Healthy Graph GH
        self.GH = self.discovery_engine.discover(healthy_data)

        # 2. Learn Structural Mechanisms f_i(Pa_i) and noise distributions
        nodes = [n for n in self.GH.nodes() if n != "FailureRisk"]
        for target in nodes:
            parents = list(self.GH.predecessors(target))
            self.var_stats[target] = {
                "mean": float(healthy_data[target].mean()),
                "std": float(healthy_data[target].std()),
                "min": float(healthy_data[target].min()),
                "max": float(healthy_data[target].max())
            }

            if not parents:
                # Exogenous root variable
                res = healthy_data[target] - self.var_stats[target]["mean"]
                self.mechanisms[target] = {"type": "root", "mean": self.var_stats[target]["mean"]}
                self.noise_params[target] = {
                    "mean": float(np.mean(res)),
                    "std": float(np.std(res)),
                    "q05": float(np.percentile(res, 5)),
                    "q95": float(np.percentile(res, 95))
                }
            else:
                X = healthy_data[parents].values
                y = healthy_data[target].values
                reg = Ridge(alpha=1.0).fit(X, y)
                preds = reg.predict(X)
                residuals = y - preds
                self.mechanisms[target] = {
                    "type": "ridge",
                    "model": reg,
                    "parents": parents,
                    "intercept": float(reg.intercept_),
                    "coef": [float(c) for c in reg.coef_]
                }
                self.noise_params[target] = {
                    "mean": float(np.mean(residuals)),
                    "std": float(np.std(residuals)),
                    "q05": float(np.percentile(residuals, 5)),
                    "q95": float(np.percentile(residuals, 95))
                }

        # 3. Simulate healthy sliding windows to derive threshold tau_d
        n = len(healthy_data)
        baseline_devs = []
        if n >= 2 * window_size:
            step = max(20, window_size // 4)
            for i in range(0, n - window_size + 1, step):
                w_slice = healthy_data.iloc[i : i + window_size]
                G_w = self.discovery_engine.discover(w_slice)
                dev, _, _ = compute_causal_deviation(self.GH, G_w, self.alpha)
                baseline_devs.append(dev)

        self.baseline_deviations = baseline_devs
        if baseline_devs:
            mean_dev = np.mean(baseline_devs)
            std_dev = np.std(baseline_devs)
            # Statistical 3-sigma or 2.5-sigma threshold
            self.tau_d = float(np.round(mean_dev + 2.5 * std_dev, 4))
            self.tau_d = max(self.tau_d, 0.15) # floor
        else:
            self.tau_d = 0.20

        return {
            "graph": graph_to_dict(self.GH),
            "threshold": self.tau_d,
            "baseline_mean_dev": float(np.mean(self.baseline_deviations)) if self.baseline_deviations else 0.05,
            "baseline_std_dev": float(np.std(self.baseline_deviations)) if self.baseline_deviations else 0.02,
            "noise_params": self.noise_params,
            "var_stats": self.var_stats
        }

class DynamicCausalMonitor:
    """
    Phase II — Dynamic Causal Monitoring
    Monitors incoming streaming windows W_t against GH.
    Distinguishes:
    - Normal Variation
    - Transient Anomaly
    - Sustained Structural Degradation
    """

    def __init__(self, profiler: HealthyCausalProfiler, alpha: float = 0.7, window_memory: int = 5):
        self.profiler = profiler
        self.alpha = alpha
        self.window_memory = window_memory
        self.history: List[Dict[str, Any]] = []
        self.consecutive_anomalies: int = 0

    def monitor_window(self, window_id: int, window_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Processes W_t, estimates G_t, calculates D_c, and checks anomaly state.
        """
        G_t = self.profiler.discovery_engine.discover(window_data)
        causal_dev, shd, edge_diff = compute_causal_deviation(self.profiler.GH, G_t, self.alpha)

        threshold = self.profiler.tau_d
        is_anomaly = causal_dev > threshold

        if is_anomaly:
            self.consecutive_anomalies += 1
        else:
            self.consecutive_anomalies = 0

        is_sustained = self.consecutive_anomalies >= 2

        if not is_anomaly:
            status = "NORMAL_VARIATION"
        elif not is_sustained:
            status = "TRANSIENT_ANOMALY"
        else:
            status = "SUSTAINED_DEGRADATION"

        record = {
            "window_id": window_id,
            "shd": shd,
            "edge_diff": edge_diff,
            "causal_deviation": causal_dev,
            "threshold": threshold,
            "is_anomaly": is_anomaly,
            "is_sustained": is_sustained,
            "status": status,
            "graph_window": graph_to_dict(G_t)
        }
        self.history.append(record)
        return record
