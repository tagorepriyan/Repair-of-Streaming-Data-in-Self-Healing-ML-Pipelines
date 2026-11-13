from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from ..schemas.schemas import StreamingWindowRequest
from ..streaming.window_manager import PipelineWindowManager

router = APIRouter(prefix="/api/stream", tags=["Streaming"])

# Global shared manager instance
_manager: Optional[PipelineWindowManager] = None

def get_manager() -> PipelineWindowManager:
    global _manager
    if _manager is None:
        _manager = PipelineWindowManager()
        _manager.initialize()
    return _manager

@router.post("/step")
def process_stream_step(req: StreamingWindowRequest, manager: PipelineWindowManager = Depends(get_manager)):
    manual_corruption = None
    if req.inject_corruption:
        manual_corruption = {
            "variable": req.affected_variable,
            "type": req.corruption_type,
            "severity": req.severity
        }

    result = manager.process_step(
        manual_corruption=manual_corruption,
        window_size=req.window_size
    )
    return result

@router.post("/batch")
def process_stream_batch(count: int = 5, manager: PipelineWindowManager = Depends(get_manager)):
    results = []
    for _ in range(count):
        res = manager.process_step()
        results.append(res)
    return results

@router.post("/reset")
def reset_stream(manager: PipelineWindowManager = Depends(get_manager)):
    manager.reset_stream()
    return {"status": "success", "message": "Stream and window states reset successfully"}

@router.get("/history")
def get_stream_history(manager: PipelineWindowManager = Depends(get_manager)):
    return {
        "history": manager.history,
        "count": len(manager.history),
        "threshold": manager.profiler.tau_d if manager.profiler else 0.25
    }
