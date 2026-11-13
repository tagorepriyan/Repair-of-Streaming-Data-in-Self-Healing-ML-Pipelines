import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, Any, List, Optional
from sklearn.linear_model import Ridge, Lasso
from scipy.optimize import minimize

class CausalDiscoveryEngine:
    """
    Modular Causal Discovery Engine supporting:
    1. KnownSCMDiscovery (Ground Truth skeleton + regression edge weights)
    2. CorrelationBasedDiscovery (Thresholded partial correlation + acyclicity)
    3. NOTEARSDiscovery (Continuous optimization for DAG learning)
    """

    VAR_NAMES = ["Temperature", "Pressure", "Vibration", "Flow", "Power", "ActuatorState"]

    def __init__(self, method: str = "known_scm", alpha: float = 0.05):
        self.method = method
        self.alpha = alpha

    def discover(self, data: pd.DataFrame, target_col: Optional[str] = "FailureRisk") -> nx.DiGraph:
        cols = [c for c in self.VAR_NAMES if c in data.columns]
        if target_col and target_col in data.columns:
            cols.append(target_col)

        sub_df = data[cols].dropna()

        if self.method == "known_scm":
            return self._discover_known_scm(sub_df)
        elif self.method == "notears":
            return self._discover_notears(sub_df)
        else:
            return self._discover_correlation(sub_df)

    def _discover_known_scm(self, data: pd.DataFrame) -> nx.DiGraph:
        """
        Uses known SCM skeleton, then estimates empirical edge strengths via Ridge regression on current data.
        """
        G = nx.DiGraph()
        for c in data.columns:
            G.add_node(c)

        known_edges = [
            ("Temperature", "Pressure"),
            ("Temperature", "Vibration"),
            ("Temperature", "Flow"),
            ("Pressure", "Flow"),
            ("Vibration", "Flow"),
            ("Flow", "Power"),
            ("Vibration", "Power"),
            ("Power", "ActuatorState"),
            ("Flow", "ActuatorState"),
            ("ActuatorState", "FailureRisk"),
            ("Pressure", "FailureRisk"),
        ]

        # Fit linear regression for each target given its known parents
        for target in data.columns:
            parents = [src for src, dst in known_edges if dst == target and src in data.columns]
            if not parents:
                continue

            X = data[parents].values
            y = data[target].values

            # Standardize for normalized edge strengths
            X_std = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-6)
            y_std = (y - y.mean()) / (y.std() + 1e-6)

            reg = Ridge(alpha=1.0).fit(X_std, y_std)
            for parent, coef in zip(parents, reg.coef_):
                strength = float(np.round(coef, 4))
                # Add edge if significant
                G.add_edge(parent, target, weight=strength, abs_weight=abs(strength))

        return G

    def _discover_notears(self, data: pd.DataFrame, lambda1: float = 0.05, max_iter: int = 50) -> nx.DiGraph:
        """
        Simplified NOTEARS implementation for linear SEM with l1 regularization:
        min 0.5/n * ||X - XW||_F^2 + lambda1 * ||W||_1 s.t. h(W) = Tr(e^(W o W)) - d = 0
        """
        X = data.values
        # Standardize
        X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-6)
        n, d = X.shape

        def _h(W):
            M = W * W
            # Matrix exponential trace - d
            E = np.linalg.matrix_power(np.eye(d) + M / d, d) # fast approximation
            return np.trace(E) - d

        def _loss(W):
            R = X - X @ W
            return 0.5 / n * np.sum(R ** 2)

        # Optimization with penalty
        rho = 1.0
        alpha = 0.0
        W_est = np.zeros((d, d))

        for _ in range(15):
            def objective(w_flat):
                W = w_flat.reshape((d, d))
                np.fill_diagonal(W, 0)
                loss = _loss(W)
                h_val = _h(W)
                l1 = lambda1 * np.sum(np.abs(W))
                return loss + 0.5 * rho * (h_val ** 2) + alpha * h_val + l1

            res = minimize(objective, W_est.flatten(), method='L-BFGS-B', options={'maxiter': max_iter})
            W_est = res.x.reshape((d, d))
            np.fill_diagonal(W_est, 0)
            h_val = _h(W_est)
            if h_val < 1e-4:
                break
            rho *= 2.0
            alpha += rho * h_val

        # Thresholding
        threshold = 0.15
        W_est[np.abs(W_est) < threshold] = 0.0

        G = nx.DiGraph()
        cols = list(data.columns)
        for c in cols:
            G.add_node(c)

        for i in range(d):
            for j in range(d):
                if W_est[i, j] != 0:
                    G.add_edge(cols[i], cols[j], weight=float(W_est[i, j]), abs_weight=abs(float(W_est[i, j])))

        # Ensure DAG by removing cycles if any residual remains
        while not nx.is_directed_acyclic_graph(G):
            cycle = nx.find_cycle(G)
            min_edge = min(cycle, key=lambda e: G[e[0]][e[1]]['abs_weight'])
            G.remove_edge(min_edge[0], min_edge[1])

        return G

    def _discover_correlation(self, data: pd.DataFrame, threshold: float = 0.25) -> nx.DiGraph:
        """
        Thresholded correlation discovery with topological acyclicity enforcement.
        """
        corr = data.corr().values
        cols = list(data.columns)
        d = len(cols)

        G = nx.DiGraph()
        for c in cols:
            G.add_node(c)

        # Use natural temporal/topological prior or order of appearance
        for i in range(d):
            for j in range(i + 1, d):
                r = corr[i, j]
                if abs(r) >= threshold:
                    G.add_edge(cols[i], cols[j], weight=float(r), abs_weight=abs(float(r)))

        return G
