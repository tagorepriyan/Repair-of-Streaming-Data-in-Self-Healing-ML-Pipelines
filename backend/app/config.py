"""
Central Configuration for Dynamic Causal-Consistency Framework
Defines all default hyperparameters, thresholds, and weights.
"""
from pydantic import BaseModel
from typing import Dict, Any

class PipelineConfig(BaseModel):
    # Streaming parameters
    WINDOW_SIZE: int = 100
    SEED: int = 42
    
    # Dynamic Causal Monitoring parameters
    ALPHA: float = 0.70  # Weight on SHD vs Average Edge Difference: D_c = alpha * SHD + (1 - alpha) * edge_diff
    DEVIATION_THRESHOLD_FLOOR: float = 0.15  # Minimum threshold floor
    SIGMA_MULTIPLIER: float = 2.50  # Statistical threshold multiplier: tau_d = mean + 2.5 * std
    SUSTAINED_ANOMALY_COUNT: int = 2  # Consecutive anomalies required for sustained structural degradation
    
    # Acceptance Score R = w1 * structural_consistency + w2 * (1 - uncertainty) + w3 * downstream_consistency
    W1_STRUCTURAL: float = 0.40
    W2_UNCERTAINTY: float = 0.35
    W3_DOWNSTREAM: float = 0.25
    
    # Autonomous Decision Thresholds
    ACCEPT_THRESHOLD: float = 0.80  # R >= 0.80 -> ACCEPT
    REJECT_THRESHOLD: float = 0.55  # R < 0.55 -> REJECT, otherwise ESCALATE
    
    # Noise and SCM parameters
    DEFAULT_NOISE_LEVEL: float = 1.0
    HEALTHY_TRAINING_SAMPLES: int = 1500
    
    # Causal Discovery Method: 'known_scm', 'notears', or 'correlation'
    DISCOVERY_METHOD: str = "known_scm"

# Default singleton instance
settings = PipelineConfig()
