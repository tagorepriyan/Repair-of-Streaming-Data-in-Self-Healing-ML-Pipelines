import pytest
from app.streaming.window_manager import PipelineWindowManager

def test_full_pipeline_step():
    manager = PipelineWindowManager(seed=99)
    manager.initialize(num_samples=500)
    
    # Process healthy window
    res_healthy = manager.process_step(window_size=100)
    assert res_healthy["window_id"] == 1
    assert res_healthy["monitoring"]["status"] == "NORMAL_VARIATION"
    assert res_healthy["repair_summary"]["decision"] == "ACCEPT"
    
    # Process corrupted window with Gaussian noise
    corruption = {"variable": "Flow", "type": "noise", "severity": 3.0}
    res_corrupted = manager.process_step(manual_corruption=corruption, window_size=100)
    assert res_corrupted["window_id"] == 2
    assert res_corrupted["corruption_meta"]["is_corrupted"] is True
    assert len(res_corrupted["localized_variables"]) > 0
    assert res_corrupted["repair_summary"] is not None
    assert res_corrupted["repair_summary"]["causal_restoration_pct"] > 0
    assert "downstream_metrics" in res_corrupted
