import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from ..causal.scm import SyntheticSCM
from ..causal.monitoring import HealthyCausalProfiler, DynamicCausalMonitor
from ..causal.localization import DegradedVariableLocalizer
from ..causal.reconstruction import CounterfactualReconstructor
from ..causal.validation import CausalConsistencyValidator
from ..causal.graph_metrics import graph_to_dict
from ..streaming.simulator import StreamingSimulator
from ..ml.downstream_model import DownstreamMLPipeline
from ..database.database import SessionLocal
from ..database.models import WindowRecord, GraphSnapshot

class PipelineWindowManager:
    """
    Unified Pipeline Window Manager:
    Orchestrates the complete 6-phase closed-loop architecture:
    1. Healthy Profiling & Initialization
    2. Streaming Ingestion & Dynamic Monitoring
    3. Structural Degradation Localization
    4. Counterfactual Reconstruction
    5. Causal-Consistency Validation
    6. Downstream ML Model Inference & Database Persistence
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.scm = SyntheticSCM(seed=seed)
        self.profiler = HealthyCausalProfiler()
        self.ml_pipeline = DownstreamMLPipeline(random_state=seed)
        self.simulator = StreamingSimulator(self.scm, window_size=100, seed=seed)
        self.is_initialized = False

        self.monitor: Optional[DynamicCausalMonitor] = None
        self.localizer: Optional[DegradedVariableLocalizer] = None
        self.reconstructor: Optional[CounterfactualReconstructor] = None
        self.validator: Optional[CausalConsistencyValidator] = None

        self.latest_result: Optional[Dict[str, Any]] = None
        self.history: List[Dict[str, Any]] = []

    def initialize(self, num_samples: int = 1500) -> Dict[str, Any]:
        """
        Phase I: Generates healthy training dataset, profiles GH, learns baseline mechanisms,
        and trains downstream ML model.
        """
        healthy_df = self.scm.generate_sample_batch(n_samples=num_samples)
        profile_info = self.profiler.fit(healthy_df, window_size=100)
        self.ml_pipeline.train(healthy_df)

        self.monitor = DynamicCausalMonitor(self.profiler, alpha=0.7)
        self.localizer = DegradedVariableLocalizer(self.profiler)
        self.reconstructor = CounterfactualReconstructor(self.profiler)
        self.validator = CausalConsistencyValidator(self.profiler)

        self.is_initialized = True
        return profile_info

    def process_step(
        self,
        manual_corruption: Optional[Dict[str, Any]] = None,
        window_size: int = 100
    ) -> Dict[str, Any]:
        if not self.is_initialized:
            self.initialize()

        self.simulator.window_size = window_size
        w_id, window_df, meta = self.simulator.produce_next_window(manual_corruption)

        # Phase II: Dynamic Causal Monitoring
        mon_result = self.monitor.monitor_window(w_id, window_df)

        localized_vars = []
        repair_summary = None
        sample_points = []
        validation_info = None
        repaired_graph = None
        repaired_df = window_df.copy()

        # Phase III: Variable Localization (if anomaly or sustained or corruption present)
        # Even on single anomaly, run localization
        G_window = self.profiler.discovery_engine.discover(window_df)
        if mon_result["is_anomaly"] or meta["is_corrupted"]:
            localized_vars = self.localizer.localize(window_df, G_window)

            # Choose top degraded variable for Phase IV counterfactual repair
            target_var = meta["affected_variable"] if meta["affected_variable"] else (
                localized_vars[0]["variable"] if localized_vars else "Flow"
            )

            # Phase IV: Counterfactual Reconstruction
            repaired_df, rec_summary, sample_points = self.reconstructor.reconstruct_variable(
                window_df,
                target_var=target_var
            )

            # Phase V: Causal-Consistency Validation & Decision
            validation_info = self.validator.validate_repair(
                repaired_df,
                pre_repair_dev=mon_result["causal_deviation"],
                target_var=target_var
            )
            repaired_graph = validation_info["graph_repaired"]

            repair_summary = {
                "window_id": w_id,
                "affected_variable": target_var,
                "num_repaired_samples": len(repaired_df),
                "acceptance_score": validation_info["acceptance_score"],
                "decision": validation_info["decision"],
                "rmse": rec_summary["rmse"],
                "mae": rec_summary["mae"],
                "causal_restoration_pct": validation_info["causal_restoration_pct"],
                "explanation": validation_info["reason"]
            }
        else:
            # Healthy window
            repair_summary = {
                "window_id": w_id,
                "affected_variable": "None",
                "num_repaired_samples": 0,
                "acceptance_score": 1.0,
                "decision": "ACCEPT",
                "rmse": 0.0,
                "mae": 0.0,
                "causal_restoration_pct": 100.0,
                "explanation": "Healthy window within normal causal bounds."
            }

        # Phase VI: Downstream ML Evaluation
        # If REJECTED, downstream ML is protected by excluding corrupted data or falling back to safe state
        downstream_eval_df = repaired_df if repair_summary["decision"] in ["ACCEPT", "ESCALATE"] else window_df
        # Evaluate on ground truth window vs corrupted vs final streamed
        gt_df = window_df.copy()
        for col in self.scm.VAR_NAMES:
            if f"_gt_{col}" in gt_df.columns:
                gt_df[col] = gt_df[f"_gt_{col}"]

        downstream_metrics = self.ml_pipeline.evaluate_window_triplet(
            healthy_df=gt_df,
            corrupted_df=window_df,
            repaired_df=downstream_eval_df
        )

        # Observations sample for live stream table (up to 25 rows)
        obs_sample = []
        target_v = repair_summary.get("affected_variable") if repair_summary else None
        for idx in range(min(25, len(window_df))):
            row_dict = {
                "id": idx + 1,
                "timestamp": round(float(window_df["timestamp"].iloc[idx]), 2) if "timestamp" in window_df else idx,
                "Temperature": round(float(window_df["Temperature"].iloc[idx]), 2) if not np.isnan(window_df["Temperature"].iloc[idx]) else None,
                "Pressure": round(float(window_df["Pressure"].iloc[idx]), 2) if not np.isnan(window_df["Pressure"].iloc[idx]) else None,
                "Flow": round(float(window_df["Flow"].iloc[idx]), 2) if not np.isnan(window_df["Flow"].iloc[idx]) else None,
                "Vibration": round(float(window_df["Vibration"].iloc[idx]), 2) if not np.isnan(window_df["Vibration"].iloc[idx]) else None,
                "Power": round(float(window_df["Power"].iloc[idx]), 2) if not np.isnan(window_df["Power"].iloc[idx]) else None,
                "ActuatorState": round(float(window_df["ActuatorState"].iloc[idx]), 2) if not np.isnan(window_df["ActuatorState"].iloc[idx]) else None,
                "FailureRisk": int(window_df["FailureRisk"].iloc[idx]) if "FailureRisk" in window_df else 0,
                "is_corrupted": bool(meta.get("is_corrupted", False)),
                "corrupted_variable": meta.get("affected_variable") if meta.get("is_corrupted") else None,
                "repaired_variable": target_v if target_v != "None" and repair_summary.get("num_repaired_samples", 0) > 0 else None,
                "repaired_value": round(float(repaired_df[target_v].iloc[idx]), 2) if target_v in repaired_df.columns and target_v != "None" else None,
            }
            obs_sample.append(row_dict)

        result_payload = {
            "window_id": w_id,
            "corruption_meta": meta,
            "monitoring": {
                "window_id": w_id,
                "shd": mon_result["shd"],
                "edge_diff": round(mon_result["edge_diff"], 4),
                "causal_deviation": round(mon_result["causal_deviation"], 4),
                "threshold": round(mon_result["threshold"], 4),
                "is_anomaly": mon_result["is_anomaly"],
                "is_sustained": mon_result["is_sustained"],
                "status": mon_result["status"]
            },
            "localized_variables": localized_vars,
            "repair_summary": repair_summary,
            "downstream_metrics": downstream_metrics,
            "graph_healthy": graph_to_dict(self.profiler.GH),
            "graph_window": mon_result["graph_window"],
            "graph_repaired": repaired_graph,
            "sample_reconstructions": sample_points[:30], # first 30 points for crisp visual
            "observations": obs_sample
        }

        self.latest_result = result_payload
        self.history.append(result_payload)

        # Save to SQLite database
        self._persist_to_db(result_payload)

        return result_payload

    def _persist_to_db(self, res: Dict[str, Any]):
        db = SessionLocal()
        try:
            m = res["monitoring"]
            rep = res["repair_summary"]
            ds = res["downstream_metrics"]
            c_meta = res["corruption_meta"]

            record = WindowRecord(
                window_id=res["window_id"],
                window_size=self.simulator.window_size,
                is_corrupted=c_meta["is_corrupted"],
                corruption_type=c_meta.get("corruption_type"),
                affected_variable=c_meta.get("affected_variable"),
                corruption_severity=c_meta.get("severity"),
                shd=m["shd"],
                edge_diff=m["edge_diff"],
                causal_deviation=m["causal_deviation"],
                threshold=m["threshold"],
                is_anomaly=m["is_anomaly"],
                is_sustained=m["is_sustained"],
                localized_variable=rep["affected_variable"] if rep else None,
                acceptance_score=rep["acceptance_score"] if rep else 1.0,
                decision=rep["decision"] if rep else "ACCEPT",
                healthy_acc=ds["healthy_accuracy"],
                corrupted_acc=ds["corrupted_accuracy"],
                repaired_acc=ds["repaired_accuracy"],
                healthy_f1=ds["healthy_f1"],
                corrupted_f1=ds["corrupted_f1"],
                repaired_f1=ds["repaired_f1"],
                rmse=rep["rmse"] if rep else 0.0,
                mae=rep["mae"] if rep else 0.0,
                causal_restoration_pct=rep["causal_restoration_pct"] if rep else 100.0,
                provenance={
                    "window_id": res["window_id"],
                    "status": m["status"],
                    "decision": rep["decision"] if rep else "ACCEPT"
                }
            )
            db.add(record)
            db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

    def reset_stream(self):
        self.simulator.current_window_id = 0
        self.simulator.current_time = 0.0
        self.history.clear()
        if self.monitor:
            self.monitor.history.clear()
            self.monitor.consecutive_anomalies = 0
