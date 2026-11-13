import pytest
from app.streaming.window_manager import PipelineWindowManager
from app.experiments.runner import ExperimentRunner
from app.experiments.ablation import AblationStudyRunner

def test_baselines_and_ablations():
    manager = PipelineWindowManager(seed=42)
    manager.initialize(num_samples=400)

    # Test baseline comparisons (8 baselines)
    runner = ExperimentRunner(manager.profiler, manager.ml_pipeline, manager.scm)
    baselines = runner.run_all_baselines(
        corruption_type="noise",
        target_var="Flow",
        severity=2.0,
        window_size=80
    )
    assert len(baselines) == 8
    names = [b["name"] for b in baselines]
    assert "No Repair" in names
    assert "Mean Imputation" in names
    assert "KNN Imputation" in names
    assert "Dynamic + Validation (Ours)" in names
    for b in baselines:
        assert "mae" in b
        assert "rmse" in b
        assert "f1" in b
        assert "causal_deviation" in b

    # Test paper reference results
    ref = ExperimentRunner.get_paper_reference_results()
    assert len(ref) >= 5

    # Test ablation study
    ablation_runner = AblationStudyRunner(manager.profiler, manager.ml_pipeline, manager.scm)
    ablations = ablation_runner.run_ablation_suite(
        corruption_type="noise",
        target_var="Flow",
        severity=2.0,
        window_size=80
    )
    assert len(ablations) == 7
    exp_ids = [a["experiment_id"] for a in ablations]
    assert "Ref" in exp_ids
    assert "A" in exp_ids
    assert "B" in exp_ids
    assert "C" in exp_ids
    assert "D" in exp_ids
    assert "E" in exp_ids
    assert "Full" in exp_ids
