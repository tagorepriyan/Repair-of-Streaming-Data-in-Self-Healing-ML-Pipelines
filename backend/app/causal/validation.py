import networkx as nx
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from .monitoring import HealthyCausalProfiler
from .graph_metrics import compute_causal_deviation, graph_to_dict

class CausalConsistencyValidator:
    """
    Phase V — Causal-Consistency Validation & Closed-Loop Decision
    Validates candidate repaired window WR against healthy profile GH.
    Computes Acceptance Score R and generates decision:
    - ACCEPT: Stream repaired window to downstream ML pipeline
    - REJECT: Exclude/drop corrupted window
    - ESCALATE: Flag for human-in-the-loop manual review
    """

    def __init__(self, profiler: HealthyCausalProfiler, tau_accept: float = 0.80, tau_reject: float = 0.55):
        self.profiler = profiler
        self.tau_accept = tau_accept
        self.tau_reject = tau_reject

    def validate_repair(
        self,
        repaired_window: pd.DataFrame,
        pre_repair_dev: float,
        target_var: str
    ) -> Dict[str, Any]:
        """
        Calculates post-repair causal graph G_R, post-repair D_c, residual consistency,
        acceptance score R, and closed-loop decision.
        """
        GH = self.profiler.GH

        # 1. Discover Post-Repair Graph G_R
        G_R = self.profiler.discovery_engine.discover(repaired_window)
        post_repair_dev, post_shd, post_edge_diff = compute_causal_deviation(GH, G_R, self.profiler.alpha)

        # 2. Causal Restoration Percentage
        if pre_repair_dev > 1e-4:
            restoration_ratio = (pre_repair_dev - post_repair_dev) / pre_repair_dev
            restoration_pct = max(0.0, min(1.0, restoration_ratio)) * 100.0
        else:
            restoration_pct = 100.0

        # 3. Residual Consistency against Healthy Profile
        mech = self.profiler.mechanisms.get(target_var)
        noise_info = self.profiler.noise_params.get(target_var, {"mean": 0.0, "std": 1.0})
        parents = list(GH.predecessors(target_var)) if GH.has_node(target_var) else []

        if mech and parents and "model" in mech:
            preds = mech["model"].predict(repaired_window[parents].values)
            res = repaired_window[target_var].values - preds
            std_bound = 2.0 * max(noise_info["std"], 1e-4)
            in_bound_ratio = float(np.mean(np.abs(res - noise_info["mean"]) <= std_bound))
        else:
            in_bound_ratio = 0.95

        # 4. Composite Acceptance Score R in [0, 1]
        # High restoration + low post deviation + high residual consistency
        graph_fidelity = max(0.0, 1.0 - (post_repair_dev / max(self.profiler.tau_d * 2.0, 0.4)))
        R = float(0.40 * (restoration_pct / 100.0) + 0.35 * graph_fidelity + 0.25 * in_bound_ratio)
        R = max(0.0, min(1.0, R))

        # 5. Tri-state Decision
        if R >= self.tau_accept or post_repair_dev <= self.profiler.tau_d:
            decision = "ACCEPT"
            reason = f"Candidate repair restored causal structure (R={round(R, 3)}, Restoration={round(restoration_pct, 1)}%). Validated for downstream ML."
        elif R >= self.tau_reject:
            decision = "ESCALATE"
            reason = f"Partial restoration achieved (R={round(R, 3)}). Divergence detected near thresholds; requires operator review."
        else:
            decision = "REJECT"
            reason = f"Candidate repair failed causal consistency check (R={round(R, 3)}). Downstream corruption risk remains high; window excluded."

        return {
            "acceptance_score": round(R, 4),
            "decision": decision,
            "reason": reason,
            "pre_repair_deviation": round(pre_repair_dev, 4),
            "post_repair_deviation": round(post_repair_dev, 4),
            "post_shd": post_shd,
            "post_edge_diff": round(post_edge_diff, 4),
            "causal_restoration_pct": round(restoration_pct, 2),
            "residual_consistency_ratio": round(in_bound_ratio, 3),
            "graph_repaired": graph_to_dict(G_R)
        }
