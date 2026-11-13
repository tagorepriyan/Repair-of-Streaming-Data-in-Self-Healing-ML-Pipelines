import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List, Tuple, Optional, Any

class SyntheticSCM:
    """
    Configurable Synthetic Structural Causal Model (SCM) for streaming degradation & counterfactual repair.
    Variables:
    - Temperature (X1)
    - Pressure (X2)
    - Vibration (X4)
    - Flow (X3)
    - Power (X5)
    - ActuatorState (X6)
    - FailureRisk (Y) (Target)
    """

    VAR_NAMES = ["Temperature", "Pressure", "Vibration", "Flow", "Power", "ActuatorState"]
    TARGET_NAME = "FailureRisk"

    def __init__(self, seed: int = 42, noise_level: float = 1.0):
        self.seed = seed
        self.noise_level = noise_level
        self.rng = np.random.RandomState(seed)
        self.dag = self._build_ground_truth_dag()

    def _build_ground_truth_dag(self) -> nx.DiGraph:
        G = nx.DiGraph()
        for v in self.VAR_NAMES:
            G.add_node(v)
        G.add_node(self.TARGET_NAME)

        # Ground truth directed edges with expected structural weights
        edges = [
            ("Temperature", "Pressure", 1.8),
            ("Temperature", "Vibration", 0.9),
            ("Temperature", "Flow", -0.7),
            ("Pressure", "Flow", 2.2),
            ("Vibration", "Flow", 0.5),
            ("Flow", "Power", 1.4),
            ("Vibration", "Power", 1.1),
            ("Power", "ActuatorState", 0.85),
            ("Flow", "ActuatorState", 1.3),
            ("ActuatorState", "FailureRisk", 1.2),
            ("Pressure", "FailureRisk", 0.9),
        ]
        for src, dst, w in edges:
            G.add_edge(src, dst, weight=w)
        return G

    def get_ground_truth_graph(self) -> nx.DiGraph:
        return self.dag.copy()

    def get_topological_order(self) -> List[str]:
        # Returns order of generation excluding target
        return [node for node in nx.topological_sort(self.dag) if node != self.TARGET_NAME]

    def generate_sample_batch(
        self,
        n_samples: int = 100,
        start_time: float = 0.0,
        time_step: float = 1.0,
        mechanism_overrides: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        """
        Generates healthy observations or custom mechanism-altered observations.
        Preserves ground-truth uncorrupted values.
        """
        time = start_time + np.arange(n_samples) * time_step
        df = pd.DataFrame(index=np.arange(n_samples))
        df["timestamp"] = time

        # Noise distributions
        u_temp = self.rng.normal(0, 1.0 * self.noise_level, n_samples)
        u_pres = self.rng.normal(0, 0.8 * self.noise_level, n_samples)
        u_vib = self.rng.normal(0, 0.6 * self.noise_level, n_samples)
        u_flow = self.rng.normal(0, 0.9 * self.noise_level, n_samples)
        u_pow = self.rng.normal(0, 1.2 * self.noise_level, n_samples)
        u_act = self.rng.normal(0, 0.7 * self.noise_level, n_samples)
        u_fail = self.rng.normal(0, 0.5 * self.noise_level, n_samples)

        # Store noise vectors
        df["_u_Temperature"] = u_temp
        df["_u_Pressure"] = u_pres
        df["_u_Vibration"] = u_vib
        df["_u_Flow"] = u_flow
        df["_u_Power"] = u_pow
        df["_u_ActuatorState"] = u_act

        # 1. Temperature: Exogenous root variable with diurnal baseline
        base_temp = 25.0 + 3.5 * np.sin(2 * np.pi * time / 150.0)
        df["Temperature"] = base_temp + u_temp

        # 2. Pressure = f(Temperature, u) -> nonlinear
        if mechanism_overrides and "Pressure" in mechanism_overrides:
            df["Pressure"] = mechanism_overrides["Pressure"](df["Temperature"], u_pres)
        else:
            df["Pressure"] = 50.0 + 1.8 * (df["Temperature"] - 25.0) + 0.03 * ((df["Temperature"] - 25.0) ** 2) + u_pres

        # 3. Vibration = f(Temperature, u)
        if mechanism_overrides and "Vibration" in mechanism_overrides:
            df["Vibration"] = mechanism_overrides["Vibration"](df["Temperature"], u_vib)
        else:
            df["Vibration"] = 10.0 + 0.9 * (df["Temperature"] - 25.0) + 0.4 * np.sin(df["Temperature"]) + u_vib

        # 4. Flow = f(Pressure, Temperature, Vibration, u)
        if mechanism_overrides and "Flow" in mechanism_overrides:
            df["Flow"] = mechanism_overrides["Flow"](df["Pressure"], df["Temperature"], df["Vibration"], u_flow)
        else:
            df["Flow"] = 30.0 + 2.2 * (df["Pressure"] - 50.0) - 0.7 * (df["Temperature"] - 25.0) + 0.5 * (df["Vibration"] - 10.0) + u_flow

        # 5. Power = f(Flow, Vibration, u)
        if mechanism_overrides and "Power" in mechanism_overrides:
            df["Power"] = mechanism_overrides["Power"](df["Flow"], df["Vibration"], u_pow)
        else:
            df["Power"] = 80.0 + 1.4 * (df["Flow"] - 30.0) + 1.1 * (df["Vibration"] - 10.0) + 0.05 * (df["Flow"] - 30.0) * (df["Vibration"] - 10.0) + u_pow

        # 6. ActuatorState = f(Power, Flow, u)
        if mechanism_overrides and "ActuatorState" in mechanism_overrides:
            df["ActuatorState"] = mechanism_overrides["ActuatorState"](df["Power"], df["Flow"], u_act)
        else:
            df["ActuatorState"] = 40.0 + 0.85 * (df["Power"] - 80.0) + 1.3 * (df["Flow"] - 30.0) + u_act

        # 7. FailureRisk (Binary target Y)
        # Logit equation
        logit = 0.04 * (df["ActuatorState"] - 40.0) + 0.03 * (df["Pressure"] - 50.0) - 0.02 * (df["Flow"] - 30.0) + u_fail
        prob = 1.0 / (1.0 + np.exp(-logit))
        df["FailureRisk_prob"] = prob
        df["FailureRisk"] = (prob > 0.52).astype(int)

        # Store ground truth copies of all variables
        for col in self.VAR_NAMES + [self.TARGET_NAME]:
            df[f"_gt_{col}"] = df[col].copy()

        return df

    def evaluate_mechanism(self, var_name: str, parent_values: Dict[str, np.ndarray], noise: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Exact structural mechanism evaluation f_i(Pa_i, u_i)
        """
        n = len(next(iter(parent_values.values()))) if parent_values else 1
        if noise is None:
            noise = np.zeros(n)

        if var_name == "Temperature":
            return 25.0 + noise
        elif var_name == "Pressure":
            temp = parent_values["Temperature"]
            return 50.0 + 1.8 * (temp - 25.0) + 0.03 * ((temp - 25.0) ** 2) + noise
        elif var_name == "Vibration":
            temp = parent_values["Temperature"]
            return 10.0 + 0.9 * (temp - 25.0) + 0.4 * np.sin(temp) + noise
        elif var_name == "Flow":
            pres = parent_values["Pressure"]
            temp = parent_values["Temperature"]
            vib = parent_values["Vibration"]
            return 30.0 + 2.2 * (pres - 50.0) - 0.7 * (temp - 25.0) + 0.5 * (vib - 10.0) + noise
        elif var_name == "Power":
            flow = parent_values["Flow"]
            vib = parent_values["Vibration"]
            return 80.0 + 1.4 * (flow - 30.0) + 1.1 * (vib - 10.0) + 0.05 * (flow - 30.0) * (vib - 10.0) + noise
        elif var_name == "ActuatorState":
            power = parent_values["Power"]
            flow = parent_values["Flow"]
            return 40.0 + 0.85 * (power - 80.0) + 1.3 * (flow - 30.0) + noise
        elif var_name == "FailureRisk":
            act = parent_values["ActuatorState"]
            pres = parent_values["Pressure"]
            flow = parent_values["Flow"]
            logit = 0.04 * (act - 40.0) + 0.03 * (pres - 50.0) - 0.02 * (flow - 30.0) + noise
            prob = 1.0 / (1.0 + np.exp(-logit))
            return (prob > 0.52).astype(int)
        else:
            raise ValueError(f"Unknown variable {var_name}")
