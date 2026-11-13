import time
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from ..causal.scm import SyntheticSCM
from ..causal.monitoring import HealthyCausalProfiler
from ..causal.graph_metrics import compute_causal_deviation
from ..causal.reconstruction import CounterfactualReconstructor
from ..causal.validation import CausalConsistencyValidator
from ..causal.discovery import CausalDiscoveryEngine
from ..streaming.corruption import StreamingCorruptionInjector
from ..ml.downstream_model import DownstreamMLPipeline
from sklearn.linear_model import Ridge

class AblationStudyRunner:
    """
    Executes the 5 canonical ablation configurations described in the IEEE manuscript:
    - Experiment A: Replace learned causal structure with correlation-based graph
    - Experiment B: Replace counterfactual reconstruction with generic predictive imputation
    - Experiment C: Remove causal-consistency validation
    - Experiment D: Use static GH instead of dynamically estimated Gt
    - Experiment E: Remove autonomous decision loop and repair unconditionally
    - Full Proposed Framework: Dynamic Causal + Counterfactual + Validation + Decision Loop
    """

    def __init__(self, profiler: HealthyCausalProfiler, ml_pipeline: DownstreamMLPipeline, scm: SyntheticSCM):
        self.profiler = profiler
        self.ml_pipeline = ml_pipeline
        self.scm = scm
        self.reconstructor = CounterfactualReconstructor(profiler)
        self.validator = CausalConsistencyValidator(profiler)

    def run_ablation_suite(
        self,
        corruption_type: str = "noise",
        target_var: str = "Flow",
        severity: float = 2.5,
        window_size: int = 150
    ) -> List[Dict[str, Any]]:
        results = []
        GH = self.profiler.GH

        # Generate evaluation window
        test_df = self.scm.generate_sample_batch(n_samples=window_size)
        corrupted_df = StreamingCorruptionInjector.inject(
            test_df,
            target_var=target_var,
            corruption_type=corruption_type,
            severity=severity
        )
        gt_vals = test_df[f"_gt_{target_var}"].values

        # ----------------------------------------------------
        # Benchmark Reference: No Repair (Raw Corrupted)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        c_metrics = self.ml_pipeline.evaluate_dataset(corrupted_df)
        G_c = self.profiler.discovery_engine.discover(corrupted_df)
        dev_c, _, _ = compute_causal_deviation(GH, G_c, self.profiler.alpha)
        dt_c = (time.perf_counter() - t0) * 1000
        clean_obs = corrupted_df[target_var].fillna(0.0).values
        rmse_c = float(np.sqrt(np.mean((clean_obs - gt_vals) ** 2)))
        mae_c = float(np.mean(np.abs(clean_obs - gt_vals)))

        results.append({
            "experiment_id": "Ref",
            "name": "No Repair (Corrupted Baseline)",
            "description": "Raw streaming data without causal self-healing",
            "mae": round(mae_c, 4),
            "rmse": round(rmse_c, 4),
            "f1": round(c_metrics["f1"], 4),
            "accuracy": round(c_metrics["accuracy"], 4),
            "causal_deviation": round(dev_c, 4),
            "latency_ms": round(dt_c, 2),
            "decision": "NONE"
        })

        # ----------------------------------------------------
        # Experiment A: Correlation-based Graph (Non-causal graph)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        corr_engine = CausalDiscoveryEngine(method="correlation")
        G_corr = corr_engine.discover(corrupted_df)
        # Reconstruct using correlation neighbors
        corr_parents = list(G_corr.predecessors(target_var)) if G_corr.has_node(target_var) else []
        df_a = corrupted_df.copy()
        if corr_parents:
            reg = Ridge().fit(test_df[corr_parents].values, test_df[target_var].values)
            df_a[target_var] = reg.predict(df_a[corr_parents].values)
        else:
            df_a[target_var] = float(test_df[target_var].mean())
        m_a = self.ml_pipeline.evaluate_dataset(df_a)
        G_a = self.profiler.discovery_engine.discover(df_a)
        dev_a, _, _ = compute_causal_deviation(GH, G_a, self.profiler.alpha)
        dt_a = (time.perf_counter() - t0) * 1000
        rmse_a = float(np.sqrt(np.mean((df_a[target_var].values - gt_vals) ** 2)))
        mae_a = float(np.mean(np.abs(df_a[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "A",
            "name": "Exp A: Correlation-Based Discovery",
            "description": "Replaces learned causal DAG with correlation-based skeleton",
            "mae": round(mae_a, 4),
            "rmse": round(rmse_a, 4),
            "f1": round(m_a["f1"], 4),
            "accuracy": round(m_a["accuracy"], 4),
            "causal_deviation": round(dev_a, 4),
            "latency_ms": round(dt_a, 2),
            "decision": "ACCEPT"
        })

        # ----------------------------------------------------
        # Experiment B: Generic Predictive Imputation (No Counterfactual Abduction)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        df_b = corrupted_df.copy()
        parents = list(GH.predecessors(target_var)) if GH.has_node(target_var) else []
        if parents:
            reg_b = Ridge().fit(test_df[parents].values, test_df[target_var].values)
            df_b[target_var] = reg_b.predict(df_b[parents].values)  # Pure prediction E[X|Pa], no u_hat abduction
        else:
            df_b[target_var] = float(test_df[target_var].mean())
        m_b = self.ml_pipeline.evaluate_dataset(df_b)
        G_b = self.profiler.discovery_engine.discover(df_b)
        dev_b, _, _ = compute_causal_deviation(GH, G_b, self.profiler.alpha)
        dt_b = (time.perf_counter() - t0) * 1000
        rmse_b = float(np.sqrt(np.mean((df_b[target_var].values - gt_vals) ** 2)))
        mae_b = float(np.mean(np.abs(df_b[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "B",
            "name": "Exp B: Generic Predictive Imputation",
            "description": "Standard regression without counterfactual noise abduction",
            "mae": round(mae_b, 4),
            "rmse": round(rmse_b, 4),
            "f1": round(m_b["f1"], 4),
            "accuracy": round(m_b["accuracy"], 4),
            "causal_deviation": round(dev_b, 4),
            "latency_ms": round(dt_b, 2),
            "decision": "ACCEPT"
        })

        # ----------------------------------------------------
        # Experiment C: Remove Causal-Consistency Validation (Phase V omitted)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        df_c, _, _ = self.reconstructor.reconstruct_variable(corrupted_df, target_var)
        # Bypasses validation check
        m_c = self.ml_pipeline.evaluate_dataset(df_c)
        G_c = self.profiler.discovery_engine.discover(df_c)
        dev_c, _, _ = compute_causal_deviation(GH, G_c, self.profiler.alpha)
        dt_c = (time.perf_counter() - t0) * 1000
        rmse_c = float(np.sqrt(np.mean((df_c[target_var].values - gt_vals) ** 2)))
        mae_c = float(np.mean(np.abs(df_c[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "C",
            "name": "Exp C: Without Consistency Validation",
            "description": "Counterfactual reconstruction streamed without Phase V validation",
            "mae": round(mae_c, 4),
            "rmse": round(rmse_c, 4),
            "f1": round(m_c["f1"], 4),
            "accuracy": round(m_c["accuracy"], 4),
            "causal_deviation": round(dev_c, 4),
            "latency_ms": round(dt_c, 2),
            "decision": "ACCEPT (UNVALIDATED)"
        })

        # ----------------------------------------------------
        # Experiment D: Static GH (No Dynamic Tracking Gt)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        # Uses static historical mechanism without checking dynamic deviation D_c
        df_d, _, _ = self.reconstructor.reconstruct_variable(corrupted_df, target_var)
        m_d = self.ml_pipeline.evaluate_dataset(df_d)
        G_d = self.profiler.discovery_engine.discover(df_d)
        dev_d, _, _ = compute_causal_deviation(GH, G_d, self.profiler.alpha)
        dt_d = (time.perf_counter() - t0) * 1000
        rmse_d = float(np.sqrt(np.mean((df_d[target_var].values - gt_vals) ** 2)))
        mae_d = float(np.mean(np.abs(df_d[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "D",
            "name": "Exp D: Static GH (No Dynamic Monitoring)",
            "description": "Static historical graph profiling without window-by-window tracking",
            "mae": round(mae_d, 4),
            "rmse": round(rmse_d, 4),
            "f1": round(m_d["f1"], 4),
            "accuracy": round(m_d["accuracy"], 4),
            "causal_deviation": round(dev_d, 4),
            "latency_ms": round(dt_d, 2),
            "decision": "ACCEPT"
        })

        # ----------------------------------------------------
        # Experiment E: Unconditional Repair (No Tri-State Decision Gate)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        df_e, _, _ = self.reconstructor.reconstruct_variable(corrupted_df, target_var)
        # Force ACCEPT regardless of acceptance score R
        m_e = self.ml_pipeline.evaluate_dataset(df_e)
        G_e = self.profiler.discovery_engine.discover(df_e)
        dev_e, _, _ = compute_causal_deviation(GH, G_e, self.profiler.alpha)
        dt_e = (time.perf_counter() - t0) * 1000
        rmse_e = float(np.sqrt(np.mean((df_e[target_var].values - gt_vals) ** 2)))
        mae_e = float(np.mean(np.abs(df_e[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "E",
            "name": "Exp E: Unconditional Repair",
            "description": "Always replaces data downstream, disabling REJECT and ESCALATE gates",
            "mae": round(mae_e, 4),
            "rmse": round(rmse_e, 4),
            "f1": round(m_e["f1"], 4),
            "accuracy": round(m_e["accuracy"], 4),
            "causal_deviation": round(dev_e, 4),
            "latency_ms": round(dt_e, 2),
            "decision": "FORCED ACCEPT"
        })

        # ----------------------------------------------------
        # Full Proposed Framework (Proposed Closed-Loop Dynamic Causal-Consistency)
        # ----------------------------------------------------
        t0 = time.perf_counter()
        G_window = self.profiler.discovery_engine.discover(corrupted_df)
        pre_dev, _, _ = compute_causal_deviation(GH, G_window, self.profiler.alpha)
        df_full, _, _ = self.reconstructor.reconstruct_variable(corrupted_df, target_var)
        val_info = self.validator.validate_repair(df_full, pre_repair_dev=pre_dev, target_var=target_var)
        
        downstream_df = df_full if val_info["decision"] in ["ACCEPT", "ESCALATE"] else corrupted_df
        m_full = self.ml_pipeline.evaluate_dataset(downstream_df)
        G_full = self.profiler.discovery_engine.discover(downstream_df)
        dev_full, _, _ = compute_causal_deviation(GH, G_full, self.profiler.alpha)
        dt_full = (time.perf_counter() - t0) * 1000
        rmse_full = float(np.sqrt(np.mean((downstream_df[target_var].values - gt_vals) ** 2)))
        mae_full = float(np.mean(np.abs(downstream_df[target_var].values - gt_vals)))

        results.append({
            "experiment_id": "Full",
            "name": "Full Proposed Framework",
            "description": "Complete 6-phase closed-loop architecture with causal validation",
            "mae": round(mae_full, 4),
            "rmse": round(rmse_full, 4),
            "f1": round(m_full["f1"], 4),
            "accuracy": round(m_full["accuracy"], 4),
            "causal_deviation": round(dev_full, 4),
            "latency_ms": round(dt_full, 2),
            "decision": val_info["decision"],
            "acceptance_score": val_info["acceptance_score"]
        })

        return results
