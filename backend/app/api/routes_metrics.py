from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import numpy as np
from .routes_stream import get_manager
from ..streaming.window_manager import PipelineWindowManager
from ..database.database import SessionLocal
from ..database.models import WindowRecord

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

@router.get("/summary")
def get_metrics_summary(manager: PipelineWindowManager = Depends(get_manager)):
    history = manager.history
    if not history:
        return {
            "total_windows": 0,
            "corrupted_windows": 0,
            "accepted_repairs": 0,
            "rejected_repairs": 0,
            "escalated_repairs": 0,
            "avg_causal_restoration": 100.0,
            "avg_f1_improvement": 0.0,
            "avg_reconstruction_rmse": 0.0
        }

    corrupted = [h for h in history if h["corruption_meta"]["is_corrupted"] or h["monitoring"]["is_anomaly"]]
    decisions = [h["repair_summary"]["decision"] for h in history if h.get("repair_summary")]
    restorations = [h["repair_summary"]["causal_restoration_pct"] for h in history if h.get("repair_summary") and h["repair_summary"]["num_repaired_samples"] > 0]
    rmses = [h["repair_summary"]["rmse"] for h in history if h.get("repair_summary") and h["repair_summary"]["num_repaired_samples"] > 0]
    f1_diffs = [h["downstream_metrics"]["improvement_f1"] for h in history if h.get("downstream_metrics") and (h["corruption_meta"]["is_corrupted"] or h["monitoring"]["is_anomaly"])]

    return {
        "total_windows": len(history),
        "corrupted_windows": len(corrupted),
        "accepted_repairs": decisions.count("ACCEPT"),
        "rejected_repairs": decisions.count("REJECT"),
        "escalated_repairs": decisions.count("ESCALATE"),
        "avg_causal_restoration": round(float(np.mean(restorations)), 2) if restorations else 100.0,
        "avg_f1_improvement": round(float(np.mean(f1_diffs)), 4) if f1_diffs else 0.0,
        "avg_reconstruction_rmse": round(float(np.mean(rmses)), 4) if rmses else 0.0
    }
