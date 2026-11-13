import pytest
import numpy as np
import networkx as nx
from app.causal.scm import SyntheticSCM
from app.causal.discovery import CausalDiscoveryEngine
from app.causal.graph_metrics import compute_shd, compute_causal_deviation

def test_scm_generation():
    scm = SyntheticSCM(seed=42)
    df = scm.generate_sample_batch(n_samples=200)
    assert len(df) == 200
    assert "Temperature" in df.columns
    assert "Pressure" in df.columns
    assert "Flow" in df.columns
    assert "Power" in df.columns
    assert "ActuatorState" in df.columns
    assert "FailureRisk" in df.columns
    assert "_gt_Flow" in df.columns

def test_causal_dag_properties():
    scm = SyntheticSCM()
    dag = scm.get_ground_truth_graph()
    assert nx.is_directed_acyclic_graph(dag)
    assert dag.has_edge("Temperature", "Pressure")
    assert dag.has_edge("Pressure", "Flow")
    assert dag.has_edge("Flow", "Power")
    assert dag.has_edge("Power", "ActuatorState")

def test_discovery_and_metrics():
    scm = SyntheticSCM(seed=123)
    df = scm.generate_sample_batch(n_samples=300)
    engine = CausalDiscoveryEngine(method="known_scm")
    G = engine.discover(df)
    assert nx.is_directed_acyclic_graph(G)
    shd = compute_shd(scm.get_ground_truth_graph(), G)
    assert shd >= 0
