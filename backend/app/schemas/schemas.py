from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class SCMConfig(BaseModel):
    num_samples: int = 1500
    noise_level: float = 1.0
    seed: int = 42

class SCMNode(BaseModel):
    id: str
    label: str
    parents: List[str]
    formula: str
    mean: float
    std: float

class SCMEdge(BaseModel):
    source: str
    target: str
    weight: float
    strength: float

class CausalGraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    acyclic: bool
    num_nodes: int
    num_edges: int

class MonitoringStatus(BaseModel):
    window_id: int
    shd: int
    edge_diff: float
    causal_deviation: float
    threshold: float
    is_anomaly: bool
    is_sustained: bool
    status: str

class DegradedVariable(BaseModel):
    variable: str
    local_score: float
    parents: List[str]
    children: List[str]
    markov_blanket: List[str]
    suspicion_level: str
    rank: int
    explanation: str

class ReconstructionPoint(BaseModel):
    index: int
    timestamp: float
    original_corrupted: Optional[float]
    counterfactual_value: float
    ground_truth: float
    ci_lower: float
    ci_upper: float
    confidence: float

class RepairSummary(BaseModel):
    window_id: int
    affected_variable: str
    num_repaired_samples: int
    acceptance_score: float
    decision: str  # ACCEPT, REJECT, ESCALATE
    rmse: float
    mae: float
    causal_restoration_pct: float
    explanation: str

class StreamingWindowRequest(BaseModel):
    window_size: int = 100
    inject_corruption: bool = False
    corruption_type: Optional[str] = "noise" # missing_random, missing_burst, noise, bias, outlier, drift, mechanism_shift
    affected_variable: Optional[str] = "Pressure"
    severity: Optional[float] = 2.0
    seed: Optional[int] = None

class DownstreamMetrics(BaseModel):
    healthy_accuracy: float
    corrupted_accuracy: float
    repaired_accuracy: float
    healthy_f1: float
    corrupted_f1: float
    repaired_f1: float
    improvement_f1: float

class WindowProcessingResult(BaseModel):
    window_id: int
    monitoring: MonitoringStatus
    localized_variables: List[DegradedVariable]
    repair_summary: Optional[RepairSummary]
    downstream_metrics: Optional[DownstreamMetrics]
    graph_healthy: CausalGraphResponse
    graph_window: CausalGraphResponse
    graph_repaired: Optional[CausalGraphResponse]
    sample_reconstructions: List[ReconstructionPoint]
