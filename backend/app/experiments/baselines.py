import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.impute import KNNImputer

class BaselineImputers:
    """
    Standard imputation and repair baselines to benchmark against causal counterfactual repair:
    1. No Repair (Raw Corrupted)
    2. Mean Imputation
    3. Median Imputation
    4. Linear Interpolation
    5. KNN Imputation (Non-causal multivariate statistical)
    6. Static Causal Repair (Fixed GH without dynamic tracking)
    7. Dynamic Causal Repair (Dynamic Gt without validation gate)
    8. Dynamic + Validation (Full closed-loop proposed method)
    """

    FEATURE_COLS = ["Temperature", "Pressure", "Vibration", "Flow", "Power", "ActuatorState"]

    @staticmethod
    def no_repair(corrupted_df: pd.DataFrame) -> pd.DataFrame:
        """Returns raw corrupted data (handling NaNs if any with 0 for downstream safety)."""
        df = corrupted_df.copy()
        for col in BaselineImputers.FEATURE_COLS:
            if col in df.columns and df[col].isna().any():
                df[col] = df[col].fillna(0.0)
        return df

    @staticmethod
    def mean_impute(corrupted_df: pd.DataFrame, healthy_means: Dict[str, float], target_var: str) -> pd.DataFrame:
        """Replaces target variable with historical healthy mean."""
        df = corrupted_df.copy()
        mean_val = healthy_means.get(target_var, float(df[target_var].dropna().mean() if not df[target_var].dropna().empty else 25.0))
        df[target_var] = mean_val
        return df

    @staticmethod
    def median_impute(corrupted_df: pd.DataFrame, target_var: str) -> pd.DataFrame:
        """Replaces target variable with observed sample median."""
        df = corrupted_df.copy()
        med_val = float(df[target_var].dropna().median() if not df[target_var].dropna().empty else 25.0)
        df[target_var] = med_val
        return df

    @staticmethod
    def linear_interpolate(corrupted_df: pd.DataFrame, target_var: str) -> pd.DataFrame:
        """Linear interpolation over temporal sequence."""
        df = corrupted_df.copy()
        series = df[target_var].copy()
        # If entire series is NaN, fallback to forward/backward or mean
        series = series.interpolate(method='linear', limit_direction='both')
        if series.isna().any():
            series = series.fillna(float(df[target_var].dropna().mean() if not df[target_var].dropna().empty else 25.0))
        df[target_var] = series
        return df

    @staticmethod
    def knn_impute(corrupted_df: pd.DataFrame, target_var: str, n_neighbors: int = 5) -> pd.DataFrame:
        """Non-causal spatial KNN imputation across all available features."""
        df = corrupted_df.copy()
        cols = BaselineImputers.FEATURE_COLS
        k = min(n_neighbors, max(1, len(df) - 1))
        imputer = KNNImputer(n_neighbors=k)
        
        # Ensure we don't have all NaNs
        sub_vals = df[cols].values.copy()
        try:
            X_imputed = imputer.fit_transform(sub_vals)
            col_idx = cols.index(target_var)
            df[target_var] = X_imputed[:, col_idx]
        except Exception:
            # Fallback to mean if degenerate
            df[target_var] = df[target_var].fillna(float(df[target_var].dropna().mean() if not df[target_var].dropna().empty else 25.0))
        return df
