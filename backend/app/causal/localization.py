import networkx as nx
import numpy as np
import pandas as pd
from typing import List, Dict, Any
from .monitoring import HealthyCausalProfiler

class DegradedVariableLocalizer:
    """
    Phase III — Degraded Variable Localization
    Identifies and ranks candidate degraded variables using:
    1. Incident edge strength shifts in G_t vs G_H
    2. Structural equation residual shift relative to baseline noise u_i
    3. Markov blanket structural impact
    """

    def __init__(self, profiler: HealthyCausalProfiler):
        self.profiler = profiler

    def get_markov_blanket(self, G: nx.DiGraph, node: str) -> List[str]:
        if node not in G:
            return []
        parents = set(G.predecessors(node))
        children = set(G.successors(node))
        spouses = set()
        for ch in children:
            spouses.update(G.predecessors(ch))
        spouses.discard(node)
        mb = parents.union(children).union(spouses)
        return sorted(list(mb))

    def localize(self, window_data: pd.DataFrame, G_window: nx.DiGraph) -> List[Dict[str, Any]]:
        GH = self.profiler.GH
        nodes = [n for n in GH.nodes() if n != "FailureRisk" and n in window_data.columns]

        ranked_results = []

        for node in nodes:
            parents = list(GH.predecessors(node))
            children = list(GH.successors(node))
            mb = self.get_markov_blanket(GH, node)

            # 1. Edge Weight Deviation on incident edges (in and out)
            edge_diffs = []
            for p in parents:
                w_h = GH[p][node].get("weight", 0.0)
                w_w = G_window[p][node].get("weight", 0.0) if G_window.has_edge(p, node) else 0.0
                edge_diffs.append(abs(w_h - w_w))

            for ch in children:
                w_h = GH[node][ch].get("weight", 0.0)
                w_w = G_window[node][ch].get("weight", 0.0) if G_window.has_edge(node, ch) else 0.0
                edge_diffs.append(abs(w_h - w_w))

            avg_edge_shift = float(np.mean(edge_diffs)) if edge_diffs else 0.0

            # 2. Structural Mechanism Residual Shift
            residual_shift = 0.0
            mech = self.profiler.mechanisms.get(node)
            noise_param = self.profiler.noise_params.get(node, {"mean": 0.0, "std": 1.0})

            # Check if values contain NaNs (missingness corruption)
            nan_ratio = float(window_data[node].isna().mean())
            clean_window = window_data.dropna(subset=[node] + parents)

            if nan_ratio > 0.05:
                # Direct missingness detected
                residual_shift = 3.0 * nan_ratio
                explanation = f"Detected {round(nan_ratio * 100, 1)}% missing values in {node}."
            elif mech and len(clean_window) > 10:
                if mech["type"] == "root":
                    w_residuals = clean_window[node] - mech["mean"]
                else:
                    X_w = clean_window[parents].values
                    y_w = clean_window[node].values
                    preds = mech["model"].predict(X_w)
                    w_residuals = y_w - preds

                # Normalized Z-shift of residual mean and variance
                baseline_std = max(noise_param["std"], 1e-4)
                z_mean = abs(np.mean(w_residuals) - noise_param["mean"]) / baseline_std
                z_var = abs(np.std(w_residuals) - baseline_std) / baseline_std
                residual_shift = float(0.6 * z_mean + 0.4 * z_var)

                if residual_shift > 2.0:
                    explanation = f"High structural residual shift (Z={round(z_mean, 2)}) against parents {parents}."
                elif avg_edge_shift > 0.3:
                    explanation = f"Significant edge strength degradation on incident edges (avg shift={round(avg_edge_shift, 3)})."
                else:
                    explanation = f"Minor normal fluctuations within healthy confidence bounds."
            else:
                explanation = "Insufficient samples or root node variance."

            # 3. Composite Local Structural Deviation Score
            local_score = float(0.55 * residual_shift + 0.45 * avg_edge_shift * 2.0)

            if local_score >= 1.2 or nan_ratio > 0.05:
                suspicion = "High"
            elif local_score >= 0.6:
                suspicion = "Medium"
            else:
                suspicion = "Low"

            ranked_results.append({
                "variable": node,
                "local_score": round(local_score, 4),
                "residual_shift": round(residual_shift, 4),
                "edge_shift": round(avg_edge_shift, 4),
                "parents": parents,
                "children": children,
                "markov_blanket": mb,
                "suspicion_level": suspicion,
                "nan_ratio": round(nan_ratio, 3),
                "explanation": explanation
            })

        # Sort descending by local score
        ranked_results.sort(key=lambda x: x["local_score"], reverse=True)
        for i, item in enumerate(ranked_results):
            item["rank"] = i + 1

        return ranked_results
