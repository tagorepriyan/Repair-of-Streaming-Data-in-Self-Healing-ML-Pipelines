from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from .routes_stream import get_manager
from ..streaming.window_manager import PipelineWindowManager
from ..experiments.runner import ExperimentRunner
from ..experiments.ablation import AblationStudyRunner

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])

class SweepRequest(BaseModel):
    corruption_type: str = "noise"
    target_var: str = "Flow"
    severities: List[float] = [1.0, 2.0, 3.0, 4.0]
    window_size: int = 150

class BaselineRequest(BaseModel):
    corruption_type: str = "noise"
    target_var: str = "Flow"
    severity: float = 2.5
    window_size: int = 150

class AblationRequest(BaseModel):
    corruption_type: str = "noise"
    target_var: str = "Flow"
    severity: float = 2.5
    window_size: int = 150

@router.post("/sweep")
def run_experiment_sweep(req: SweepRequest, manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.is_initialized:
        manager.initialize()

    runner = ExperimentRunner(manager.profiler, manager.ml_pipeline, manager.scm)
    results = runner.run_corruption_sweep(
        corruption_type=req.corruption_type,
        target_var=req.target_var,
        severities=req.severities,
        window_size=req.window_size
    )
    return {
        "corruption_type": req.corruption_type,
        "target_variable": req.target_var,
        "sweep_results": results
    }

@router.post("/baselines")
def run_baseline_comparison(req: BaselineRequest, manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.is_initialized:
        manager.initialize()

    runner = ExperimentRunner(manager.profiler, manager.ml_pipeline, manager.scm)
    results = runner.run_all_baselines(
        corruption_type=req.corruption_type,
        target_var=req.target_var,
        severity=req.severity,
        window_size=req.window_size
    )
    return {
        "corruption_type": req.corruption_type,
        "target_variable": req.target_var,
        "severity": req.severity,
        "baselines": results
    }

@router.post("/ablations")
def run_ablation_experiments(req: AblationRequest, manager: PipelineWindowManager = Depends(get_manager)):
    if not manager.is_initialized:
        manager.initialize()

    runner = AblationStudyRunner(manager.profiler, manager.ml_pipeline, manager.scm)
    results = runner.run_ablation_suite(
        corruption_type=req.corruption_type,
        target_var=req.target_var,
        severity=req.severity,
        window_size=req.window_size
    )
    return {
        "corruption_type": req.corruption_type,
        "target_variable": req.target_var,
        "severity": req.severity,
        "ablations": results
    }

@router.get("/paper-reference")
def get_paper_reference():
    return {
        "source": "Reported in IEEE manuscript",
        "description": "Empirical benchmark reference results reported on the canonical experimental dataset",
        "reference_results": ExperimentRunner.get_paper_reference_results()
    }
