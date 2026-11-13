import numpy as np
import pandas as pd
from typing import Optional, Tuple

class StreamingCorruptionInjector:
    """
    Implements all 8 corruption modes described in the paper:
    A. Random missingness
    B. Contiguous burst missingness
    C. Gaussian noise (x' = x + eps)
    D. Persistent bias (x' = x + b)
    E. Outliers
    F. Gradual linear drift (x'_t = x_t + lambda * t)
    G. Distribution shift
    H. Mechanism-level degradation (f_i -> f_i')
    Preserves ground-truth uncorrupted columns (_gt_X).
    """

    @staticmethod
    def inject(
        df: pd.DataFrame,
        target_var: str,
        corruption_type: str = "noise",
        severity: float = 2.0,
        seed: Optional[int] = None
    ) -> pd.DataFrame:
        rng = np.random.RandomState(seed if seed is not None else 42)
        corrupted_df = df.copy()

        # Ensure ground truth is preserved
        if f"_gt_{target_var}" not in corrupted_df.columns:
            corrupted_df[f"_gt_{target_var}"] = corrupted_df[target_var].copy()

        series = corrupted_df[target_var].values.copy()
        n = len(series)
        var_std = max(np.nanstd(series), 1.0)
        var_mean = np.nanmean(series)

        if corruption_type == "missing_random":
            # severity is fraction e.g. 0.20 -> 20%
            ratio = min(0.9, max(0.05, severity if severity <= 1.0 else severity / 10.0))
            mask = rng.rand(n) < ratio
            series[mask] = np.nan

        elif corruption_type == "missing_burst":
            # contiguous block of missingness
            burst_len = int(min(n * 0.7, max(5, severity * 10)))
            start_idx = rng.randint(0, max(1, n - burst_len))
            series[start_idx : start_idx + burst_len] = np.nan

        elif corruption_type == "noise":
            # x' = x + eps, eps ~ N(0, (severity * std)^2)
            noise_sigma = severity * var_std * 0.8
            eps = rng.normal(0, noise_sigma, n)
            series += eps

        elif corruption_type == "bias":
            # x' = x + b
            bias_val = severity * var_std * 1.5
            series += bias_val

        elif corruption_type == "outlier":
            # sporadic severe outliers
            rate = 0.15
            mask = rng.rand(n) < rate
            spikes = rng.choice([-1.0, 1.0], size=n) * (severity * 3.5 * var_std)
            series[mask] += spikes[mask]

        elif corruption_type == "drift":
            # x'_t = x_t + lambda * t
            drift_slope = (severity * var_std * 2.0) / n
            trend = np.arange(n) * drift_slope
            series += trend

        elif corruption_type == "distribution_shift":
            # changes mean and scales variance
            shift = severity * var_std
            series = (series - var_mean) * (1.0 + 0.3 * severity) + var_mean + shift

        elif corruption_type == "mechanism_shift":
            # Alter relationship with parents: invert coefficient or decouple
            # E.g. If Flow depends on Pressure, invert relationship
            if target_var == "Pressure" and "Temperature" in df.columns:
                series = 20.0 - 2.5 * (df["Temperature"].values - 25.0) + rng.normal(0, 1.5, n)
            elif target_var == "Flow" and "Pressure" in df.columns:
                series = 15.0 - 1.8 * (df["Pressure"].values - 50.0) + rng.normal(0, 2.0, n)
            elif target_var == "Power" and "Flow" in df.columns:
                series = 30.0 - 1.2 * (df["Flow"].values - 30.0) + rng.normal(0, 3.0, n)
            else:
                series = var_mean - 2.0 * (series - var_mean) + rng.normal(0, var_std * severity, n)

        corrupted_df[target_var] = series
        return corrupted_df
