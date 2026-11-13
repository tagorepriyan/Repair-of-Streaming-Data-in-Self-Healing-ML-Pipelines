import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

class DownstreamMLPipeline:
    """
    Downstream Machine Learning Pipeline:
    Predicts FailureRisk from streaming sensor variables.
    Trained strictly on historical healthy data.
    Evaluated across:
    1. Ground Truth / Healthy stream
    2. Corrupted stream
    3. Counterfactually Repaired stream
    """

    FEATURE_COLS = ["Temperature", "Pressure", "Vibration", "Flow", "Power", "ActuatorState"]
    TARGET_COL = "FailureRisk"

    def __init__(self, n_estimators: int = 100, random_state: int = 42):
        self.model = RandomForestClassifier(n_estimators=n_estimators, max_depth=6, random_state=random_state)
        self.is_trained = False
        self.feature_means: Dict[str, float] = {}

    def train(self, healthy_data: pd.DataFrame):
        X = healthy_data[self.FEATURE_COLS].values
        y = healthy_data[self.TARGET_COL].values
        self.model.fit(X, y)
        self.is_trained = True

        for c in self.FEATURE_COLS:
            self.feature_means[c] = float(healthy_data[c].mean())

    def _prepare_features(self, df: pd.DataFrame) -> np.ndarray:
        X_df = df[self.FEATURE_COLS].copy()
        for c in self.FEATURE_COLS:
            if X_df[c].isna().any():
                X_df[c] = X_df[c].fillna(self.feature_means.get(c, 0.0))
        return X_df.values

    def evaluate_dataset(self, df: pd.DataFrame) -> Dict[str, float]:
        if not self.is_trained:
            return {"accuracy": 0.0, "f1": 0.0, "precision": 0.0, "recall": 0.0, "roc_auc": 0.0}

        X = self._prepare_features(df)
        y = df[self.TARGET_COL].values

        preds = self.model.predict(X)
        try:
            probs = self.model.predict_proba(X)[:, 1]
            auc = float(roc_auc_score(y, probs))
        except Exception:
            auc = 0.5

        return {
            "accuracy": round(float(accuracy_score(y, preds)), 4),
            "f1": round(float(f1_score(y, preds, zero_division=0)), 4),
            "precision": round(float(precision_score(y, preds, zero_division=0)), 4),
            "recall": round(float(recall_score(y, preds, zero_division=0)), 4),
            "roc_auc": round(auc, 4)
        }

    def evaluate_window_triplet(
        self,
        healthy_df: pd.DataFrame,
        corrupted_df: pd.DataFrame,
        repaired_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Evaluates the downstream impact of corruption and counterfactual repair.
        """
        h_metrics = self.evaluate_dataset(healthy_df)
        c_metrics = self.evaluate_dataset(corrupted_df)
        r_metrics = self.evaluate_dataset(repaired_df)

        f1_improvement = r_metrics["f1"] - c_metrics["f1"]
        acc_improvement = r_metrics["accuracy"] - c_metrics["accuracy"]

        return {
            "healthy_accuracy": h_metrics["accuracy"],
            "corrupted_accuracy": c_metrics["accuracy"],
            "repaired_accuracy": r_metrics["accuracy"],
            "healthy_f1": h_metrics["f1"],
            "corrupted_f1": c_metrics["f1"],
            "repaired_f1": r_metrics["f1"],
            "improvement_f1": round(f1_improvement, 4),
            "improvement_accuracy": round(acc_improvement, 4),
            "detailed": {
                "healthy": h_metrics,
                "corrupted": c_metrics,
                "repaired": r_metrics
            }
        }
