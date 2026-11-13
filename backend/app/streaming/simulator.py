import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Generator, Tuple
from ..causal.scm import SyntheticSCM
from .corruption import StreamingCorruptionInjector

class StreamingSimulator:
    """
    Streaming Simulator producing sequential windows W_1, W_2, ... W_t.
    Allows pre-scheduling or dynamic on-the-fly injection of corruption events.
    Designed with a clean generator interface ready for Kafka/Redpanda topic producers.
    """

    def __init__(self, scm: SyntheticSCM, window_size: int = 100, seed: int = 42):
        self.scm = scm
        self.window_size = window_size
        self.seed = seed
        self.current_window_id = 0
        self.current_time = 0.0
        self.corruption_schedule: Dict[int, Dict[str, Any]] = {}
        self._init_default_schedule()

    def _init_default_schedule(self):
        """
        Default demonstration schedule matching the research workflow:
        W1-W3: Healthy
        W4: Random Missingness on Pressure
        W5: Healthy
        W6: Severe Gaussian Noise on Flow
        W7: Gradual Drift on Temperature
        W8: Mechanism Degradation on Flow
        W9: Outliers on ActuatorState
        W10: Healthy
        """
        self.corruption_schedule = {
            4: {"variable": "Pressure", "type": "missing_random", "severity": 0.25},
            6: {"variable": "Flow", "type": "noise", "severity": 2.5},
            7: {"variable": "Temperature", "type": "drift", "severity": 2.0},
            8: {"variable": "Flow", "type": "mechanism_shift", "severity": 2.0},
            9: {"variable": "ActuatorState", "type": "outlier", "severity": 3.0}
        }

    def schedule_corruption(self, window_id: int, variable: str, corruption_type: str, severity: float):
        self.corruption_schedule[window_id] = {
            "variable": variable,
            "type": corruption_type,
            "severity": severity
        }

    def clear_schedule(self):
        self.corruption_schedule.clear()

    def produce_next_window(
        self,
        manual_corruption: Optional[Dict[str, Any]] = None
    ) -> Tuple[int, pd.DataFrame, Dict[str, Any]]:
        """
        Produces next window W_t.
        Returns (window_id, window_df, corruption_metadata).
        """
        self.current_window_id += 1
        window_id = self.current_window_id

        # Generate base synthetic data from SCM
        window_df = self.scm.generate_sample_batch(
            n_samples=self.window_size,
            start_time=self.current_time,
            time_step=1.0
        )
        self.current_time += self.window_size

        # Check for corruption
        corr_config = manual_corruption or self.corruption_schedule.get(window_id)

        meta = {
            "window_id": window_id,
            "is_corrupted": False,
            "corruption_type": None,
            "affected_variable": None,
            "severity": 0.0
        }

        if corr_config and corr_config.get("variable"):
            var = corr_config["variable"]
            c_type = corr_config.get("type", "noise")
            sev = float(corr_config.get("severity", 2.0))

            window_df = StreamingCorruptionInjector.inject(
                df=window_df,
                target_var=var,
                corruption_type=c_type,
                severity=sev,
                seed=self.seed + window_id
            )

            meta = {
                "window_id": window_id,
                "is_corrupted": True,
                "corruption_type": c_type,
                "affected_variable": var,
                "severity": sev
            }

        return window_id, window_df, meta
