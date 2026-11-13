from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from .routes_stream import get_manager
from ..streaming.window_manager import PipelineWindowManager
from ..database.database import SessionLocal
from ..database.models import WindowRecord

router = APIRouter(prefix="/api/repair", tags=["Repair"])

@router.get("/latest")
def get_latest_repair(manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.latest_result:
        manager.process_step()

    res = manager.latest_result
    return {
        "window_id": res["window_id"],
        "monitoring": res["monitoring"],
        "localized_variables": res["localized_variables"],
        "repair_summary": res["repair_summary"],
        "sample_reconstructions": res["sample_reconstructions"]
    }

@router.get("/provenance")
def get_provenance_audit_trail(limit: int = 50):
    """
    Returns full provenance and audit trail from SQLite database.
    Format: REP-XXXXX with complete decision reasoning and metrics.
    """
    db = SessionLocal()
    try:
        records = db.query(WindowRecord).order_by(WindowRecord.window_id.desc()).limit(limit).all()
        audit_trail = []
        for r in records:
            rep_id = f"REP-{str(r.window_id).zfill(5)}"
            audit_trail.append({
                "repair_id": rep_id,
                "window_id": r.window_id,
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else "N/A",
                "is_corrupted": r.is_corrupted,
                "corruption_type": r.corruption_type or "healthy",
                "affected_variable": r.affected_variable or "None",
                "causal_deviation_before": round(r.causal_deviation, 4) if r.causal_deviation is not None else 0.0,
                "threshold": round(r.threshold, 4) if r.threshold is not None else 0.25,
                "acceptance_score": round(r.acceptance_score, 4) if r.acceptance_score is not None else 1.0,
                "decision": r.decision or "ACCEPT",
                "rmse": round(r.rmse, 4) if r.rmse is not None else 0.0,
                "mae": round(r.mae, 4) if r.mae is not None else 0.0,
                "causal_restoration_pct": round(r.causal_restoration_pct, 2) if r.causal_restoration_pct is not None else 100.0,
                "healthy_f1": round(r.healthy_f1, 4) if r.healthy_f1 is not None else 0.0,
                "repaired_f1": round(r.repaired_f1, 4) if r.repaired_f1 is not None else 0.0,
                "corrupted_f1": round(r.corrupted_f1, 4) if r.corrupted_f1 is not None else 0.0,
                "reason": (
                    f"Structural deviation restored ({round(r.causal_restoration_pct or 100, 1)}%) with acceptance score {round(r.acceptance_score or 1.0, 3)}."
                    if r.decision == "ACCEPT" else
                    f"Decision {r.decision}: Divergence near boundary or low acceptance score {round(r.acceptance_score or 0.0, 3)}."
                )
            })
        return {
            "total_records": len(audit_trail),
            "audit_trail": audit_trail
        }
    finally:
        db.close()
