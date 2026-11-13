from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from .routes_stream import get_manager
from ..streaming.window_manager import PipelineWindowManager
from ..causal.graph_metrics import graph_to_dict

router = APIRouter(prefix="/api/graph", tags=["Graph"])

@router.get("/healthy")
def get_healthy_graph(manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.is_initialized:
        manager.initialize()

    return {
        "graph": graph_to_dict(manager.profiler.GH),
        "threshold": manager.profiler.tau_d,
        "mechanisms": {k: {"parents": v.get("parents", []), "type": v.get("type")} for k, v in manager.profiler.mechanisms.items()},
        "noise_params": manager.profiler.noise_params,
        "var_stats": manager.profiler.var_stats
    }

@router.get("/latest")
def get_latest_comparison(manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.latest_result:
        # Step once
        manager.process_step()

    res = manager.latest_result
    return {
        "window_id": res["window_id"],
        "healthy_graph": res["graph_healthy"],
        "window_graph": res["graph_window"],
        "repaired_graph": res["graph_repaired"],
        "causal_deviation": res["monitoring"]["causal_deviation"],
        "threshold": res["monitoring"]["threshold"],
        "status": res["monitoring"]["status"]
    }
